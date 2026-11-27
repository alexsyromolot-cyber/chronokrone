/**
 * Burg-Raster und Detailansicht des gewählten Feldes.
 */
import {
  BARRACKS,
  BUILD_COUNT_GROWTH,
  BUILDING_MILESTONES,
  BUILDINGS,
  type BuildingId,
} from '../data/buildings';
import { EPOCH1_MAP } from '../data/map';
import { RESOURCES } from '../data/resources';
import { t } from '../i18n';
import { clickDamage } from '../systems/battle';
import {
  buildBlocker,
  buildCost,
  clearBlocker,
  clearCost,
  tileAt,
  tileProduction,
  upgradeBlocker,
  upgradeCost,
  workerClassFor,
  workersAt,
} from '../systems/castle';
import { keepLevel } from '../systems/resources';
import type { GameState, Tile } from '../systems/state';
import { barracksLevel, troopCapacity } from '../systems/units';
import { spriteUrl } from '../render/pixel';
import { BUILDING_SPRITES, TERRAIN_SPRITES } from '../render/sprites';
import { costHtml, esc, num, pct, reasonText, tip } from './dom';
import { action } from './panels-top';

export interface CastleUi {
  selected: { x: number; y: number } | null;
}

function tileHtml(state: GameState, tile: Tile, ui: CastleUi): string {
  const selected = ui.selected?.x === tile.x && ui.selected.y === tile.y;
  const terrainSprite = TERRAIN_SPRITES[tile.terrain];
  const img = tile.building
    ? `<img src="${spriteUrl(BUILDING_SPRITES[tile.building])}" alt="">`
    : terrainSprite && tile.unlocked
      ? `<img class="deco" src="${spriteUrl(terrainSprite)}" alt="">`
      : '';
  const label = tile.building
    ? t(`building.${tile.building}`)
    : tile.unlocked
      ? t(`terrain.${tile.terrain}`)
      : t('castle.locked');
  const clearable = !tile.unlocked && clearBlocker(state, tile) === null;
  return `<button class="tile terrain-${tile.terrain} ${tile.unlocked ? '' : 'locked'} ${selected ? 'selected' : ''} ${
    clearable ? 'affordable' : ''
  }" data-select="${tile.x},${tile.y}" aria-label="${esc(label)}" ${tip(label)}>
    ${img}${tile.building ? `<span class="lvl">${tile.level}</span>` : ''}${tile.unlocked ? '' : '<span class="q">?</span>'}
  </button>`;
}

function productionHtml(state: GameState, tile: Tile): string {
  const p = tileProduction(state, tile);
  if (!p) return '';
  const formula = t('castle.prodTip', {
    perLevel: num(p.perLevel, 2),
    level: p.level,
    milestone: p.milestone,
    terrain: num(p.terrain, 2),
    neighbor: pct(p.neighbor),
    workers: pct(p.workers),
    skills: pct(p.skills),
    total: num(p.total, 2),
  });
  return `<p class="prod" ${tip(formula)}>${esc(t('castle.produces', { value: num(p.total, 2), res: t(`res.${p.resource}`) }))} ⓘ</p>`;
}

function buildingDetail(state: GameState, tile: Tile): string {
  const id = tile.building!;
  const def = BUILDINGS[id];
  const lines: string[] = [
    `<h3><img src="${spriteUrl(BUILDING_SPRITES[id])}" alt=""> ${esc(t(`building.${id}`))} <small>${esc(
      t('castle.level', { level: tile.level }),
    )}</small></h3>`,
    `<p class="desc">${esc(t(`building.${id}.desc` as const))}</p>`,
    productionHtml(state, tile),
  ];
  const cls = workerClassFor(id);
  if (cls) {
    lines.push(
      `<p>${esc(t('castle.workers', { n: workersAt(state, tile).length, max: def.workerSlots ?? 0 }))}</p>`,
    );
  }
  if (id === 'keep') {
    const capMult = RESOURCES.gold.capGrowth ** (keepLevel(state) - 1);
    lines.push(
      `<p>${esc(t('castle.keepEffect', { cap: num(capMult, 2), click: num(clickDamage(state)) }))}</p>`,
    );
  }
  if (id === 'barracks') {
    lines.push(
      `<p>${esc(t('castle.barracksEffect', { slots: troopCapacity(state), pct: pct(BARRACKS.damageBonusPerLevel * barracksLevel(state)) }))}</p>`,
    );
  }
  const next = BUILDING_MILESTONES.find((m) => m > tile.level);
  if (def.produces && next) lines.push(`<p class="hint">${esc(t('castle.milestone', { level: next }))}</p>`);

  const blocker = upgradeBlocker(state, tile);
  lines.push(`<div class="buy">
    <button class="btn primary" ${blocker ? 'disabled' : ''} ${action({ type: 'upgrade', x: tile.x, y: tile.y })} ${tip(
      `${t('castle.costTip', { growth: num(def.costGrowth, 2) })}${blocker ? `\n${reasonText(blocker)}` : ''}`,
    )}>${esc(t('castle.upgrade', { level: tile.level + 1 }))}</button>
    ${costHtml(state, upgradeCost(tile))}
  </div>`);
  return lines.join('');
}

function buildOptions(state: GameState, tile: Tile): string {
  const ids = (Object.keys(BUILDINGS) as BuildingId[]).filter((id) => BUILDINGS[id].buildable);
  return ids
    .map((id) => {
      const blocker = buildBlocker(state, tile, id);
      if (blocker === 'reason.maxCount') return '';
      const terrainBonus = BUILDINGS[id].terrainBonus?.[tile.terrain];
      return `<div class="option">
        <img src="${spriteUrl(BUILDING_SPRITES[id])}" alt="">
        <div><strong>${esc(t(`building.${id}`))}</strong>${terrainBonus ? ` <span class="good">×${num(terrainBonus, 1)}</span>` : ''}
          <p class="desc">${esc(t(`building.${id}.desc` as const))}</p>${costHtml(state, buildCost(state, id))}</div>
        <button class="btn" ${blocker ? 'disabled' : ''} ${action({ type: 'build', x: tile.x, y: tile.y, building: id })} ${tip(
          `${t('castle.buildCostTip', { growth: num(BUILD_COUNT_GROWTH, 1) })}${blocker ? `\n${reasonText(blocker)}` : ''}`,
        )}>${esc(t('castle.build'))}</button>
      </div>`;
    })
    .join('');
}

function detailHtml(state: GameState, ui: CastleUi): string {
  const tile = ui.selected ? tileAt(state, ui.selected.x, ui.selected.y) : undefined;
  if (!tile) return `<p class="hint">${esc(t('castle.pick'))}</p>`;
  if (!tile.unlocked) {
    const blocker = clearBlocker(state, tile);
    return `<h3>${esc(t('castle.locked'))} · ${esc(t(`terrain.${tile.terrain}`))}</h3>
      ${blocker === 'reason.notAdjacent' ? `<p class="hint">${esc(t('castle.notAdjacent'))}</p>` : ''}
      <div class="buy"><button class="btn primary" ${blocker ? 'disabled' : ''} ${action({ type: 'clearTile', x: tile.x, y: tile.y })} ${tip(
        t('castle.clearTip', { growth: num(EPOCH1_MAP.clearGrowth, 2) }),
      )}>${esc(t('castle.clear'))}</button>${costHtml(state, clearCost(state))}</div>`;
  }
  if (tile.building) return buildingDetail(state, tile);
  return `<h3>${esc(t('castle.empty'))} · ${esc(t(`terrain.${tile.terrain}`))}</h3>${buildOptions(state, tile)}`;
}

export function castleHtml(state: GameState, ui: CastleUi): string {
  const grid = state.tiles.map((tile) => tileHtml(state, tile, ui)).join('');
  return `<div class="castle-layout">
    <div class="grid" style="--cols:${EPOCH1_MAP.width}">${grid}</div>
    <div class="detail">${detailHtml(state, ui)}</div>
  </div>`;
}
