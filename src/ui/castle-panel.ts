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
import { isConnected, rosetteBonus, shipActive } from '../systems/starship';
import { STARSHIP } from '../data/starship';
import { spriteUrl } from '../render/pixel';
import { BUILDING_SPRITES } from '../render/sprites';
import { costHtml, esc, num, pct, reasonText, tip } from './dom';
import { diceHtml } from './events-panel';
import { marketHtml } from './market-panel';
import { gridHtml } from './cards-panel';
import { reactorHtml } from './reactor-panel';
import { action } from './panels-top';
import { catalogHtml, isoBuildingStyle, isoGridHtml } from './iso-castle';
import { uiIcon } from './ui-icons';

export interface CastleUi {
  selected: { x: number; y: number } | null;
  /** Produktionszahlen an allen Gebäuden zeigen. */
  numbers: boolean;
  /** Bau-Modus: im Katalog gewähltes Gebäude (null = aus). */
  build: BuildingId | null;
}

function amountsText(a: ResourceAmounts): string {
  return (Object.entries(a) as [ResourceId, number][]).map(([id, n]) => `${n} ${t(`res.${id}`)}`).join(' + ');
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

/** Raumschiff (Epoche 5): hängt das Modul an der Brücke, und wie viel Rosettenlicht fällt darauf? */
function shipHtml(state: GameState, tile: Tile): string {
  if (!shipActive(state) || tile.building === 'keep') return '';
  if (!isConnected(state, tile)) return `<p class="bad">${esc(t('ship.adrift'))}</p>`;
  if (tile.building === 'rosette')
    return `<p>${esc(t('ship.rosetteEffect', { pct: pct(STARSHIP.rosettePerLevel * tile.level) }))}</p>`;
  const bonus = rosetteBonus(state, tile);
  return `<p class="good" ${tip(t('ship.tip', { pct: pct(STARSHIP.rosettePerLevel) }))}>${esc(
    bonus > 0 ? t('ship.connectedLit', { pct: pct(bonus) }) : t('ship.connected'),
  )} ⓘ</p>`;
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
    return `<p>${esc(t('castle.tavernEffect', { pct: pct(TAVERN_BONUS_PER_LEVEL * tile.level) }))}</p>${diceHtml(state)}`;
  if (id === 'market') return marketHtml(state);
  if (id === 'powerPlant' || id === 'pylon') return gridHtml(state);
  if (id === 'reactor' || id === 'coolingTower') return reactorHtml(state);
  return '';
}

/** Kleiner Info-Chip: Icon und Wert, die Erklärung steht im Tooltip. */
function chip(icon: string, value: string, tipText: string, cls = ''): string {
  const url = uiIcon(`ic-${icon}`);
  return `<span class="bchip ${cls}" ${tip(tipText)}>${url ? `<img src="${url}" alt="">` : ''}${esc(value)}</span>`;
}

/** Große Ertragszeile: Ressourcen-Icon und Menge pro Sekunde; die volle Formel im Tooltip. */
function productionBig(state: GameState, tile: Tile): string {
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
    season: num(p.season, 2),
    power: num(p.power, 2),
    reactor: num(p.reactor, 2),
    ship: num(p.ship, 2),
    total: num(p.total, 2),
  });
  const icon = uiIcon(`res-${p.resource}`);
  return `<div class="bcard-prod" ${tip(`${t(`res.${p.resource}`)}
${formula}`)}>${icon ? `<img src="${icon}" alt="">` : ''}<b>+${num(p.total, 2)}</b><small>/s</small></div>`;
}

/** Boni als Icon-Chips statt Textliste. */
function bonusChips(state: GameState, tile: Tile): string {
  const id = tile.building!;
  const def = BUILDINGS[id];
  const p = tileProduction(state, tile);
  const chips: string[] = [];
  if (p && p.terrain !== 1) chips.push(chip('terrain', `×${num(p.terrain, 1)}`, t('castle.bonus.terrain')));
  if (p && p.neighbor > 0) chips.push(chip('neighbor', `+${pct(p.neighbor)} %`, t('castle.bonus.neighbor')));
  const cls: ClassId | undefined = workerClassFor(id);
  if (cls)
    chips.push(
      chip(
        'worker',
        `${workersAt(state, tile).length}/${def.workerSlots ?? 0}`,
        t('castle.workersOf', {
          cls: t(`class.${cls}`),
          n: workersAt(state, tile).length,
          max: def.workerSlots ?? 0,
        }),
      ),
    );
  if (p && p.skills > 0) chips.push(chip('skills', `+${pct(p.skills)} %`, t('castle.bonus.skills')));
  if (p && p.tavern > 0) chips.push(chip('tavern', `+${pct(p.tavern)} %`, t('castle.bonus.tavern')));
  if (p && p.power > 1) chips.push(chip('power', `×${num(p.power, 2)}`, t('castle.bonus.power')));
  const next = BUILDING_MILESTONES.find((m) => m > tile.level);
  if ((def.produces || def.recipe) && next) {
    // Meilenstein als Stern-Chip mit Mini-Balken: wie weit bis zur nächsten Verdopplung?
    const prev = [...BUILDING_MILESTONES].reverse().find((m) => m <= tile.level) ?? 1;
    const share = (tile.level - prev) / (next - prev);
    chips.push(
      `<span class="bchip milestone" ${tip(t('castle.milestoneBar', { level: tile.level, next }))}>${
        uiIcon('ic-milestone') ? `<img src="${uiIcon('ic-milestone')}" alt="">` : ''
      }${next}<span class="mini-bar"><span style="width:${(share * 100).toFixed(0)}%"></span></span></span>`,
    );
  }
  return chips.length ? `<div class="bchips">${chips.join('')}</div>` : '';
}

function buildingDetail(state: GameState, tile: Tile): string {
  const id = tile.building!;
  const def = BUILDINGS[id];
  const blocker = upgradeBlocker(state, tile);
  const up = uiIcon('ic-upgrade');
  return `<div class="bcard">
    <div class="bcard-head" ${tip(t(`building.${id}.desc`))}>
      <span class="bcard-img"><span style="${isoBuildingStyle(id, tile.level)}"></span></span>
      <div class="bcard-title"><h3>${esc(t(`building.${id}`))}</h3><span class="plaque">${tile.level}</span></div>
    </div>
    ${shipHtml(state, tile)}
    ${productionBig(state, tile)}
    ${recipeHtml(state, tile)}
    ${effectHtml(state, tile)}
    ${bonusChips(state, tile)}
    <div class="bcard-buy">
      <button class="sign big" ${blocker ? 'disabled' : ''} ${action({ type: 'upgrade', x: tile.x, y: tile.y })} ${tip(
        `${t('castle.upgrade', { level: tile.level + 1 })}
${t('castle.costTip', { growth: num(def.costGrowth, 2) })}${
          blocker
            ? `
${reasonText(blocker)}`
            : ''
        }`,
      )}>${up ? `<img src="${up}" alt="">` : '▲'} ${tile.level + 1}</button>
      ${costHtml(state, upgradeCost(tile))}
    </div>
  </div>`;
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

/** Bauplatz: isometrisches Raster, Seitenleiste mit dem gewählten Feld, Bau-Katalog darunter. */
export function castleHtml(state: GameState, ui: CastleUi): string {
  return `<div class="castle-layout iso">
    <div class="iso-wrap">${isoGridHtml(state, ui)}</div>
    <aside class="detail">${detailHtml(state, ui)}</aside>
  </div>${catalogHtml(state, ui)}`;
}
