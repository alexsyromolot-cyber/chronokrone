/**
 * Burg-Raster: bauen, ausbauen, roden, produzieren.
 * Die Produktion wird als Aufschlüsselung berechnet, damit Tooltips jede Zahl erklären können.
 */
import { BUILD_COUNT_GROWTH, BUILDING_MILESTONES, BUILDINGS, type BuildingId } from '../data/buildings';
import { EPOCH1_MAP } from '../data/map';
import { RESOURCE_IDS, type ResourceId } from '../data/resources';
import { CLASSES, UNIT_FORMULAS, type ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { canAfford, exceedsCap, gain, pay, scaledCost, type Cost } from './resources';
import { skillBonus } from './skills';
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

/** Klasse, die in diesem Gebäude arbeitet (z. B. Holzfäller → Holzfällerhütte). */
export function workerClassFor(building: BuildingId): ClassId | undefined {
  return (Object.keys(CLASSES) as ClassId[]).find(
    (c) => CLASSES[c].role === 'gatherer' && CLASSES[c].requires === building,
  );
}

/**
 * Sammler werden automatisch auf Gebäude ihres Typs verteilt (Raster-Reihenfolge).
 * Im Vertical Slice reicht das; manuelles Zuweisen kommt mit mehr Sammler-Klassen.
 */
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

export interface ProductionBreakdown {
  resource: ResourceId;
  perLevel: number;
  level: number;
  milestone: number;
  terrain: number;
  neighbor: number;
  workers: number;
  skills: number;
  /** = perLevel × level × milestone × terrain × (1 + neighbor + workers + skills) */
  total: number;
}

export function tileProduction(state: GameState, tile: Tile): ProductionBreakdown | null {
  if (!tile.building || tile.level < 1) return null;
  const def = BUILDINGS[tile.building];
  if (!def.produces) return null;

  const cls = workerClassFor(tile.building);
  const terrainBase = def.terrainBonus?.[tile.terrain] ?? 1;
  // Försterwissen verstärkt nur den Gelände-Anteil über 1 (1,5 → 2,0).
  const terrainSkill = cls ? skillBonus(state, cls, 'terrainBonusMult') : 0;
  const terrain = 1 + (terrainBase - 1) * (1 + terrainSkill);

  const nb = def.neighborBonus;
  const neighbor = nb
    ? neighbors(state, tile).filter((n) => n.building === nb.building).length * nb.bonus
    : 0;
  const workers = workersAt(state, tile).reduce((sum, u) => sum + workPower(u), 0);
  const skills = cls ? skillBonus(state, cls, 'productionMult') : 0;
  const milestone = milestoneMultiplier(tile.level);

  const total = def.produces.perLevel * tile.level * milestone * terrain * (1 + neighbor + workers + skills);
  return {
    resource: def.produces.resource,
    perLevel: def.produces.perLevel,
    level: tile.level,
    milestone,
    terrain,
    neighbor,
    workers,
    skills,
    total,
  };
}

/** Produktion pro Sekunde je Ressource, über alle Felder. */
export function productionRates(state: GameState): Record<ResourceId, number> {
  const rates = Object.fromEntries(RESOURCE_IDS.map((id) => [id, 0])) as Record<ResourceId, number>;
  for (const tile of state.tiles) {
    const p = tileProduction(state, tile);
    if (p) rates[p.resource] += p.total;
  }
  return rates;
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

export function buildBlocker(state: GameState, tile: Tile, id: BuildingId): MessageKey | null {
  const def = BUILDINGS[id];
  if (!tile.unlocked) return 'reason.tileLocked';
  if (tile.building) return 'reason.tileOccupied';
  if (!def.buildable) return 'reason.unknown';
  if (def.maxCount !== undefined && countBuildings(state, id) >= def.maxCount) return 'reason.maxCount';
  return costBlocker(state, buildCost(state, id));
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
  return costBlocker(state, upgradeCost(tile));
}

export function upgrade(state: GameState, tile: Tile): MessageKey | null {
  const blocker = upgradeBlocker(state, tile);
  if (blocker) return blocker;
  pay(state, upgradeCost(tile));
  tile.level++;
  if ((BUILDING_MILESTONES as readonly number[]).includes(tile.level)) {
    state.fx.push({ kind: 'milestone' });
    addLog(state, 'narrator.buildingMilestone', { level: tile.level });
  }
  return null;
}

/** Kosten = clearBaseCost × clearGrowth^(bereits gerodete Felder) */
export function clearCost(state: GameState): Cost {
  const initial = 1 + EPOCH1_MAP.startUnlocked.length;
  const cleared = state.tiles.filter((t) => t.unlocked).length - initial;
  return scaledCost(EPOCH1_MAP.clearBaseCost, EPOCH1_MAP.clearGrowth, Math.max(0, cleared));
}

export function clearBlocker(state: GameState, tile: Tile): MessageKey | null {
  if (tile.unlocked) return 'reason.unknown';
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

/** Ein Logik-Tick der Burg: Produktion gutschreiben, Sammler sammeln Erfahrung. */
export function tickCastle(state: GameState, dt: number): void {
  for (const tile of state.tiles) {
    const p = tileProduction(state, tile);
    if (!p) continue;
    gain(state, p.resource, p.total * dt);
    for (const worker of workersAt(state, tile)) addXp(state, worker, UNIT_FORMULAS.workXpPerSecond * dt);
  }
}
