/**
 * Burg-Raster und Detailansicht des gewählten Feldes (Produktion, Rezepte mit Engpass,
 * Effekte von Spezialgebäuden, Ausbau, Bauauswahl, Roden).
 */
import {
  BARRACKS,
  BUILD_COUNT_GROWTH,
  BUILDING_MILESTONES,
  BUILDINGS,
  TAVERN_BONUS_PER_LEVEL,
  type BuildingId,
} from '../data/buildings';
import { epochDef } from '../data/epochs';
import { RESOURCES, STOREHOUSE_CAP_BONUS, type ResourceAmounts, type ResourceId } from '../data/resources';
import { TROOP_BUILDINGS, type ClassId } from '../data/units';
import { t, tk } from '../i18n';
import { clickDamage } from '../systems/battle';
import {
  buildBlocker,
  buildCost,
  buildingAvailable,
  clearBlocker,
  clearCost,
  inBounds,
  milestoneMultiplier,
  recipeBottleneck,
  recipeRate,
  tileAt,
  tileProduction,
  upgradeBlocker,
  upgradeCost,
  workerClassFor,
  workersAt,
} from '../systems/castle';
import { keepLevel } from '../systems/resources';
import type { GameState, Tile } from '../systems/state';
import { troopCapacity } from '../systems/units';
import { spriteUrl } from '../render/pixel';
import { BUILDING_SPRITES, TERRAIN_SPRITES } from '../render/sprites';
import { costHtml, esc, num, pct, reasonText, tip } from './dom';
import { action } from './panels-top';

export interface CastleUi {
  selected: { x: number; y: number } | null;
}

function tileHtml(state: GameState, tile: Tile, ui: CastleUi): string {
  const selected = ui.selected?.x === tile.x && ui.selected.y === tile.y;
  const fog = !tile.unlocked && !inBounds(state, tile);
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
      : fog
        ? t('castle.fog')
        : t('castle.locked');
  const clearable = !tile.unlocked && clearBlocker(state, tile) === null;
  const classes = ['tile', `terrain-${tile.terrain}`];
  if (!tile.unlocked) classes.push(fog ? 'fog' : 'locked');
  if (selected) classes.push('selected');
  if (clearable) classes.push('affordable');
  return `<button class="${classes.join(' ')}" data-select="${tile.x},${tile.y}" aria-label="${esc(label)}" ${tip(label)}>
    ${img}${tile.building ? `<span class="lvl">${tile.level}</span>` : ''}${!tile.unlocked && !fog ? '<span class="q">?</span>' : ''}
  </button>`;
}

function amountsText(a: ResourceAmounts): string {
  return (Object.entries(a) as [ResourceId, number][]).map(([id, n]) => `${n} ${t(`res.${id}`)}`).join(' + ');
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
    tavern: pct(p.tavern),
    gear: num(p.gear, 2),
    chronicle: num(p.chronicle, 2),
    total: num(p.total, 2),
  });
  return `<p class="prod" ${tip(formula)}>${esc(t('castle.produces', { value: num(p.total, 2), res: t(`res.${p.resource}`) }))} ⓘ</p>`;
}

/** Rezept, Durchsatz und – das Wichtigste – der aktuelle Engpass der Kette. */
function recipeHtml(state: GameState, tile: Tile): string {
  const recipe = BUILDINGS[tile.building!].recipe;
  if (!recipe) return '';
  const rate = recipeRate(state, tile);
  const nb = BUILDINGS[tile.building!].neighborBonus;
  const neighborShare = rate / (recipe.cyclesPerLevel * tile.level * milestoneMultiplier(tile.level)) - 1;
  const formula = t('castle.recipeTip', {
    base: recipe.cyclesPerLevel,
    level: tile.level,
    milestone: milestoneMultiplier(tile.level),
    neighbor: pct(nb ? neighborShare : 0),
  });
  const bottleneck = recipeBottleneck(state, tile);
  let status: string;
  if (!bottleneck) status = `<p class="good">${esc(t('castle.running'))}</p>`;
  else if (bottleneck.resource === 'outputFull') status = `<p class="bad">${esc(t('castle.outputFull'))}</p>`;
  else {
    status = `<p class="bad">${esc(
      t('castle.bottleneck', {
        res: t(`res.${bottleneck.resource}`),
        supply: num(bottleneck.supply, 2),
        demand: num(bottleneck.demand, 2),
      }),
    )}</p>`;
  }
  return `<p class="prod" ${tip(formula)}>${esc(t('castle.recipe', { inputs: amountsText(recipe.inputs), outputs: amountsText(recipe.outputs) }))}
    · ${esc(t('castle.recipeRate', { rate: num(rate, 2) }))} ⓘ</p>${status}`;
}

function effectHtml(state: GameState, tile: Tile): string {
  const id = tile.building!;
  if (id === 'keep') {
    const capMult = RESOURCES.gold.capGrowth ** (keepLevel(state) - 1);
    return `<p>${esc(t('castle.keepEffect', { cap: num(capMult, 2), click: num(clickDamage(state)) }))}</p>`;
  }
  if (TROOP_BUILDINGS.includes(id)) {
    return `<p>${esc(t('castle.trainingEffect', { slots: troopCapacity(state), pct: pct(BARRACKS.damageBonusPerLevel * tile.level) }))}</p>`;
  }
  if (id === 'storehouse')
    return `<p>${esc(t('castle.storehouseEffect', { pct: pct(STOREHOUSE_CAP_BONUS * tile.level) }))}</p>`;
  if (id === 'tavern')
    return `<p>${esc(t('castle.tavernEffect', { pct: pct(TAVERN_BONUS_PER_LEVEL * tile.level) }))}</p>`;
  return '';
}

function buildingDetail(state: GameState, tile: Tile): string {
  const id = tile.building!;
  const def = BUILDINGS[id];
  const lines: string[] = [
    `<h3><img src="${spriteUrl(BUILDING_SPRITES[id])}" alt=""> ${esc(t(`building.${id}`))} <small>${esc(
      t('castle.level', { level: tile.level }),
    )}</small></h3>`,
    `<p class="desc">${esc(t(`building.${id}.desc`))}</p>`,
    productionHtml(state, tile),
    recipeHtml(state, tile),
    effectHtml(state, tile),
  ];
  const cls: ClassId | undefined = workerClassFor(id);
  if (cls) {
    lines.push(
      `<p>${esc(t('castle.workersOf', { cls: t(`class.${cls}`), n: workersAt(state, tile).length, max: def.workerSlots ?? 0 }))}</p>`,
    );
  }
  const next = BUILDING_MILESTONES.find((m) => m > tile.level);
  if ((def.produces || def.recipe) && next)
    lines.push(`<p class="hint">${esc(t('castle.milestone', { level: next }))}</p>`);

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
  // Nur zeigen, was erforscht und noch nicht ausgereizt ist – sonst wird die Liste unübersichtlich.
  const ids = (Object.keys(BUILDINGS) as BuildingId[]).filter((id) => buildingAvailable(state, id) === null);
  return ids
    .map((id) => {
      const blocker = buildBlocker(state, tile, id);
      const terrainBonus = BUILDINGS[id].terrainBonus?.[tile.terrain];
      return `<div class="option">
        <img src="${spriteUrl(BUILDING_SPRITES[id])}" alt="">
        <div><strong>${esc(t(`building.${id}`))}</strong>${terrainBonus ? ` <span class="good">×${num(terrainBonus, 1)}</span>` : ''}
          <p class="desc">${esc(t(`building.${id}.desc`))}</p>${costHtml(state, buildCost(state, id))}</div>
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
    const title = blocker === 'reason.outOfBounds' ? t('castle.fog') : t('castle.locked');
    const hint =
      blocker === 'reason.notAdjacent' || blocker === 'reason.outOfBounds'
        ? `<p class="hint">${esc(reasonText(blocker))}</p>`
        : '';
    return `<h3>${esc(title)} · ${esc(t(`terrain.${tile.terrain}`))}</h3>${hint}
      <div class="buy"><button class="btn primary" ${blocker ? 'disabled' : ''} ${action({ type: 'clearTile', x: tile.x, y: tile.y })} ${tip(
        t('castle.clearTip', { growth: num(epochDef(state.epoch).map.clearGrowth, 2) }),
      )}>${esc(t('castle.clear'))}</button>${costHtml(state, clearCost(state))}</div>`;
  }
  if (tile.building) return buildingDetail(state, tile);
  return `<h3>${esc(t('castle.empty'))} · ${esc(tk(`terrain.${tile.terrain}`))}</h3>${buildOptions(state, tile)}`;
}

export function castleHtml(state: GameState, ui: CastleUi): string {
  const grid = state.tiles.map((tile) => tileHtml(state, tile, ui)).join('');
  return `<div class="castle-layout">
    <div class="grid" style="--cols:${epochDef(state.epoch).map.width}">${grid}</div>
    <div class="detail">${detailHtml(state, ui)}</div>
  </div>`;
}
