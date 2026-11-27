/**
 * Burg-Raster: bauen, ausbauen, roden, produzieren, umwandeln.
 * Produktion und Rezepte werden als Aufschlüsselung berechnet, damit Tooltips jede Zahl
 * erklären und den Engpass einer Kette zeigen können.
 */
import {
  BUILD_COUNT_GROWTH,
  BUILDING_MILESTONES,
  BUILDINGS,
  TAVERN_BONUS_PER_LEVEL,
  type BuildingId,
} from '../data/buildings';
import { epochDef } from '../data/epochs';
import { RESOURCE_IDS, type ResourceId } from '../data/resources';
import { CLASSES, UNIT_FORMULAS, type ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { hasResearch, surveyBounds } from './research';
import { canAfford, exceedsCap, gain, pay, resourceCap, scaledCost, type Cost } from './resources';
import { achievementMultiplier } from './achievements';
import { chronicleBonus } from './chronicle';
import { companionBonus, companionSetMultiplier } from './trade';
import { powerBonus } from './power';
import { productionModifier } from './events';
import { weaponMultiplier } from './gear';
import { globalBonus, skillBonus } from './skills';
import { addLog, type GameState, type Tile, type Unit } from './state';
import { addXp, workPower } from './units';

export function tileAt(state: GameState, x: number, y: number): Tile | undefined {
  return state.tiles.find((t) => t.x === x && t.y === y);
}

export function neighbors(state: GameState, tile: Tile): Tile[] {
  const around = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ] as const;
  return around.map(([dx, dy]) => tileAt(state, tile.x + dx, tile.y + dy)).filter((t): t is Tile => !!t);
}

export function countBuildings(state: GameState, id: BuildingId): number {
  return state.tiles.filter((t) => t.building === id).length;
}

/** Summe der Level aller Gebäude eines Typs. */
export function buildingLevel(state: GameState, id: BuildingId): number {
  return state.tiles.filter((t) => t.building === id).reduce((sum, t) => sum + t.level, 0);
}

export function inBounds(state: GameState, tile: Tile): boolean {
  const b = surveyBounds(state);
  return tile.x >= b.min && tile.x <= b.max && tile.y >= b.min && tile.y <= b.max;
}

/** Klasse, die in diesem Gebäude arbeitet (z. B. Holzfäller → Holzfällerhütte). */
export function workerClassFor(building: BuildingId): ClassId | undefined {
  return (Object.keys(CLASSES) as ClassId[]).find(
    (c) => CLASSES[c].role === 'gatherer' && CLASSES[c].requires === building,
  );
}

/** Sammler werden automatisch auf Gebäude ihres Typs verteilt (Raster-Reihenfolge). */
export function workersAt(state: GameState, tile: Tile): Unit[] {
  if (!tile.building) return [];
  const cls = workerClassFor(tile.building);
  if (!cls) return [];
  const slots = BUILDINGS[tile.building].workerSlots ?? 0;
  const sameTiles = state.tiles.filter((t) => t.building === tile.building);
  const index = sameTiles.indexOf(tile);
  return state.units.filter((u) => u.classId === cls).slice(index * slots, index * slots + slots);
}

/** Produktion verdoppelt sich an jedem erreichten Meilenstein (10, 25, 50, 100). */
export function milestoneMultiplier(level: number): number {
  return 2 ** BUILDING_MILESTONES.filter((m) => level >= m).length;
}

function neighborBonus(state: GameState, tile: Tile): number {
  const nb = tile.building ? BUILDINGS[tile.building].neighborBonus : undefined;
  return nb ? neighbors(state, tile).filter((n) => n.building === nb.building).length * nb.bonus : 0;
}

/** Taverne: Sammler in angrenzenden Gebäuden arbeiten fröhlicher. */
function tavernBonus(state: GameState, tile: Tile): number {
  return neighbors(state, tile)
    .filter((n) => n.building === 'tavern')
    .reduce((sum, n) => sum + n.level * TAVERN_BONUS_PER_LEVEL, 0);
}

export interface ProductionBreakdown {
  resource: ResourceId;
  perLevel: number;
  level: number;
  milestone: number;
  terrain: number;
  neighbor: number;
  workers: number;
  skills: number;
  tavern: number;
  gear: number;
  /** Chronik-Multiplikator (Produktion, bei Wissen zusätzlich „Stipendium“). */
  chronicle: number;
  /** Jahreszeit und Ereignis-Boni (Regen, gute Ernte …). */
  season: number;
  /** Stromnetz: 1 + Bonus, wenn das Gebäude am Netz hängt (Epoche 3). */
  power: number;
  /** = perLevel × level × milestone × terrain × (1 + neighbor + workers + skills + tavern) × gear × chronicle */
  total: number;
}

export function tileProduction(state: GameState, tile: Tile): ProductionBreakdown | null {
  if (!tile.building || tile.level < 1) return null;
  const def = BUILDINGS[tile.building];
  if (!def.produces) return null;

  const cls = workerClassFor(tile.building);
  const terrainBase = def.terrainBonus?.[tile.terrain] ?? 1;
  // Försterwissen & Co. verstärken nur den Gelände-Anteil über 1 (1,5 → 2,0).
  const terrainSkill = cls ? skillBonus(state, cls, 'terrainBonusMult') : 0;
  const terrain = 1 + (terrainBase - 1) * (1 + terrainSkill);
  const neighbor = neighborBonus(state, tile);
  const workers = workersAt(state, tile).reduce((sum, u) => sum + workPower(u), 0);
  // Skills und Begleiter der Arbeiterklasse zählen zusammen.
  const skills = cls
    ? skillBonus(state, cls, 'productionMult') + companionBonus(state, cls, 'production')
    : 0;
  const tavern = cls ? tavernBonus(state, tile) : 0;
  const gear = cls ? weaponMultiplier(state, cls, 'gatherer') : 1;
  const milestone = milestoneMultiplier(tile.level);

  const chronicle =
    achievementMultiplier(state) *
    companionSetMultiplier(state) *
    (1 + chronicleBonus(state, 'production')) *
    (def.produces.resource === 'knowledge' ? 1 + chronicleBonus(state, 'knowledge') : 1);
  const season = productionModifier(state, def.produces.resource);
  const power = 1 + powerBonus(state, tile);
  const total =
    power *
    season *
    def.produces.perLevel *
    tile.level *
    milestone *
    terrain *
    (1 + neighbor + workers + skills + tavern) *
    gear *
    chronicle;
  return {
    resource: def.produces.resource,
    perLevel: def.produces.perLevel,
    level: tile.level,
    milestone,
    terrain,
    neighbor,
    workers,
    skills,
    tavern,
    gear,
    chronicle,
    season,
    power,
    total,
  };
}

/** Ideale Durchgänge pro Sekunde eines Rezept-Gebäudes (ohne Zutatenmangel). */
export function recipeRate(state: GameState, tile: Tile): number {
  if (!tile.building || tile.level < 1) return 0;
  const recipe = BUILDINGS[tile.building].recipe;
  if (!recipe) return 0;
  return (
    recipe.cyclesPerLevel *
    tile.level *
    milestoneMultiplier(tile.level) *
    (1 + neighborBonus(state, tile) + globalBonus(state, 'recipeMult', tile.building!)) *
    (1 + chronicleBonus(state, 'production')) *
    (1 + powerBonus(state, tile))
  );
}

export interface Flows {
  /** Was Erzeuger und Rezepte im Idealfall pro Sekunde liefern. */
  produced: Record<ResourceId, number>;
  /** Was Rezepte im Idealfall pro Sekunde verbrauchen. */
  consumed: Record<ResourceId, number>;
}

const zero = () => Object.fromEntries(RESOURCE_IDS.map((id) => [id, 0])) as Record<ResourceId, number>;

export function flows(state: GameState): Flows {
  const produced = zero();
  const consumed = zero();
  for (const tile of state.tiles) {
    const p = tileProduction(state, tile);
    if (p) produced[p.resource] += p.total;
    const rate = recipeRate(state, tile);
    const recipe = tile.building ? BUILDINGS[tile.building].recipe : undefined;
    if (recipe && rate > 0) {
      for (const [id, n] of Object.entries(recipe.inputs) as [ResourceId, number][]) consumed[id] += n * rate;
      for (const [id, n] of Object.entries(recipe.outputs) as [ResourceId, number][])
        produced[id] += n * rate;
    }
  }
  produced.gold += skillGold(state);
  return { produced, consumed };
}

/**
 * Gold aus Skills wie „Goldnuggets“: perRank × Rang × Anzahl der Einheiten dieser Klasse.
 * (Die Edelsteinsucher finden mehr, je mehr von ihnen graben.)
 */
export function skillGold(state: GameState): number {
  let gold = 0;
  for (const cls of Object.keys(CLASSES) as ClassId[]) {
    const per = skillBonus(state, cls, 'goldPerSecond');
    if (per > 0) gold += per * state.units.filter((u) => u.classId === cls).length;
  }
  return gold;
}

/** Netto-Fluss pro Sekunde (Produktion minus Rezeptverbrauch, ideal gerechnet). */
export function productionRates(state: GameState): Record<ResourceId, number> {
  const f = flows(state);
  const net = zero();
  for (const id of RESOURCE_IDS) net[id] = f.produced[id] - f.consumed[id];
  return net;
}

export interface Bottleneck {
  resource: ResourceId | 'outputFull';
  supply: number;
  demand: number;
}

/**
 * Engpass eines Rezepts: die Zutat, deren Zufluss den Bedarf aller Rezepte am wenigsten
 * deckt – sofern kein Vorrat puffert. Oder 'outputFull', wenn das Ergebnis nicht mehr
 * ins Lager passt.
 */
export function recipeBottleneck(state: GameState, tile: Tile): Bottleneck | null {
  const recipe = tile.building ? BUILDINGS[tile.building].recipe : undefined;
  if (!recipe || tile.level < 1) return null;
  for (const id of Object.keys(recipe.outputs) as ResourceId[]) {
    if (state.resources[id].gte(resourceCap(state, id)))
      return { resource: 'outputFull', supply: 0, demand: 0 };
  }
  const f = flows(state);
  let worst: (Bottleneck & { ratio: number }) | null = null;
  for (const [id, n] of Object.entries(recipe.inputs) as [ResourceId, number][]) {
    const supply = f.produced[id];
    const demand = f.consumed[id];
    const ratio = demand > 0 ? supply / demand : Infinity;
    // Ein Vorrat von mindestens 10 Durchgängen puffert den Engpass noch eine Weile ab.
    const buffered = state.resources[id].gte(n * 10);
    if (ratio < 1 && !buffered && (!worst || ratio < worst.ratio))
      worst = { resource: id, supply, demand, ratio };
  }
  return worst ? { resource: worst.resource, supply: worst.supply, demand: worst.demand } : null;
}

export function buildCost(state: GameState, id: BuildingId): Cost {
  const def = BUILDINGS[id];
  return scaledCost(def.baseCost, BUILD_COUNT_GROWTH, countBuildings(state, id));
}

/** Kosten von Level L auf L+1 = Ausbau-Grundkosten × costGrowth^(L − 1) */
export function upgradeCost(tile: Tile): Cost {
  if (!tile.building) return {};
  const def = BUILDINGS[tile.building];
  return scaledCost(def.upgradeCost ?? def.baseCost, def.costGrowth, tile.level - 1);
}

function costBlocker(state: GameState, cost: Cost): MessageKey | null {
  if (exceedsCap(state, cost)) return 'reason.exceedsCap';
  if (!canAfford(state, cost)) return 'reason.tooExpensive';
  return null;
}

/** Darf der Typ überhaupt gebaut werden (Forschung, Höchstzahl)? Unabhängig vom Feld. */
export function buildingAvailable(state: GameState, id: BuildingId): MessageKey | null {
  const def = BUILDINGS[id];
  if (!def.buildable) return 'reason.unknown';
  if (def.research && !hasResearch(state, def.research)) return 'reason.requiresResearch';
  if (def.maxCount !== undefined && countBuildings(state, id) >= def.maxCount) return 'reason.maxCount';
  return null;
}

export function buildBlocker(state: GameState, tile: Tile, id: BuildingId): MessageKey | null {
  if (!tile.unlocked) return 'reason.tileLocked';
  if (tile.building) return 'reason.tileOccupied';
  return buildingAvailable(state, id) ?? costBlocker(state, buildCost(state, id));
}

export function build(state: GameState, tile: Tile, id: BuildingId): MessageKey | null {
  const blocker = buildBlocker(state, tile, id);
  if (blocker) return blocker;
  pay(state, buildCost(state, id));
  tile.building = id;
  tile.level = 1;
  state.stats.buildingsBuilt++;
  if (state.stats.buildingsBuilt === 1) addLog(state, 'narrator.firstBuilding');
  return null;
}

export function upgradeBlocker(state: GameState, tile: Tile): MessageKey | null {
  if (!tile.building) return 'reason.unknown';
  const max = BUILDINGS[tile.building].maxLevel;
  if (max !== undefined && tile.level >= max) return 'reason.maxLevel';
  return costBlocker(state, upgradeCost(tile));
}

export function upgrade(state: GameState, tile: Tile): MessageKey | null {
  const blocker = upgradeBlocker(state, tile);
  if (blocker) return blocker;
  pay(state, upgradeCost(tile));
  tile.level++;
  state.stats.maxBuildingLevel = Math.max(state.stats.maxBuildingLevel, tile.level);
  if ((BUILDING_MILESTONES as readonly number[]).includes(tile.level)) {
    state.fx.push({ kind: 'milestone' });
    addLog(state, 'narrator.buildingMilestone', { level: tile.level });
  }
  return null;
}

/** Kosten = clearBaseCost × clearGrowth^(bereits gerodete Felder) */
export function clearCost(state: GameState): Cost {
  const map = epochDef(state.epoch).map;
  const initial = 1 + map.startUnlocked.length;
  const cleared = state.tiles.filter((t) => t.unlocked).length - initial;
  return scaledCost(map.clearBaseCost, map.clearGrowth, Math.max(0, cleared));
}

export function clearBlocker(state: GameState, tile: Tile): MessageKey | null {
  if (tile.unlocked) return 'reason.unknown';
  if (!inBounds(state, tile)) return 'reason.outOfBounds';
  if (!neighbors(state, tile).some((n) => n.unlocked)) return 'reason.notAdjacent';
  return costBlocker(state, clearCost(state));
}

export function clearTile(state: GameState, tile: Tile): MessageKey | null {
  const blocker = clearBlocker(state, tile);
  if (blocker) return blocker;
  pay(state, clearCost(state));
  tile.unlocked = true;
  return null;
}

/** Ein Rezept-Gebäude so weit laufen lassen, wie Zutaten und Lagerplatz es erlauben. */
function runRecipe(state: GameState, tile: Tile, dt: number): void {
  const recipe = BUILDINGS[tile.building!].recipe!;
  let cycles = recipeRate(state, tile) * dt;
  for (const [id, n] of Object.entries(recipe.inputs) as [ResourceId, number][]) {
    cycles = Math.min(cycles, state.resources[id].toNumber() / n);
  }
  for (const [id, n] of Object.entries(recipe.outputs) as [ResourceId, number][]) {
    // Keine Zutaten verschwenden, wenn das Ergebnis nicht mehr ins Lager passt.
    const space = resourceCap(state, id).sub(state.resources[id]).toNumber();
    cycles = Math.min(cycles, Math.max(0, space) / n);
  }
  if (cycles <= 0) return;
  for (const [id, n] of Object.entries(recipe.inputs) as [ResourceId, number][]) {
    state.resources[id] = state.resources[id].sub(n * cycles);
  }
  for (const [id, n] of Object.entries(recipe.outputs) as [ResourceId, number][]) gain(state, id, n * cycles);
}

/** Ein Logik-Tick der Burg: Erzeuger produzieren, Rezepte wandeln um, Sammler lernen. */
export function tickCastle(state: GameState, dt: number): void {
  const bonusGold = skillGold(state);
  if (bonusGold > 0) gain(state, 'gold', bonusGold * dt);
  for (const tile of state.tiles) {
    if (!tile.building || tile.level < 1) continue;
    const p = tileProduction(state, tile);
    if (p) {
      gain(state, p.resource, p.total * dt);
      for (const worker of workersAt(state, tile)) addXp(state, worker, UNIT_FORMULAS.workXpPerSecond * dt);
    }
    if (BUILDINGS[tile.building].recipe) runRecipe(state, tile, dt);
  }
}
