/**
 * Ressourcen: Lagerlimits, Gutschrift, Kosten prüfen und bezahlen.
 * Kosten sind immer `Cost` (Decimal je Ressource), weil Kostenkurven exponentiell wachsen.
 */
import Decimal, { type DecimalSource } from 'break_eternity.js';
import { RESOURCES, RESOURCE_IDS, type ResourceAmounts, type ResourceId } from '../data/resources';
import type { GameState } from './state';

export type Cost = Partial<Record<ResourceId, Decimal>>;

export function keepLevel(state: GameState): number {
  return state.tiles.find((t) => t.building === 'keep')?.level ?? 1;
}

/** Limit = baseCap × capGrowth^(Bergfried-Level − 1) */
export function resourceCap(state: GameState, id: ResourceId): Decimal {
  const def = RESOURCES[id];
  return new Decimal(def.baseCap).mul(Decimal.pow(def.capGrowth, keepLevel(state) - 1)).floor();
}

/** Gutschrift bis zum Lagerlimit. Gibt zurück, wie viel tatsächlich ankam. */
export function gain(state: GameState, id: ResourceId, amount: DecimalSource): Decimal {
  const cap = resourceCap(state, id);
  const before = state.resources[id];
  const after = Decimal.min(cap, before.add(amount));
  // Liegt man (z. B. per Debug) schon über dem Limit, wird nichts weggenommen.
  state.resources[id] = Decimal.max(before, after);
  return state.resources[id].sub(before);
}

/** Grundkosten × growth^n, je Ressource. */
export function scaledCost(base: ResourceAmounts, growth: number, n: number): Cost {
  const cost: Cost = {};
  const factor = Decimal.pow(growth, n);
  for (const id of RESOURCE_IDS) {
    const amount = base[id];
    if (amount !== undefined) cost[id] = new Decimal(amount).mul(factor).ceil();
  }
  return cost;
}

export function canAfford(state: GameState, cost: Cost): boolean {
  return RESOURCE_IDS.every((id) => {
    const c = cost[id];
    return c === undefined || state.resources[id].gte(c);
  });
}

/** Kostet etwas mehr, als das Lager je fassen kann? Dann muss erst der Bergfried wachsen. */
export function exceedsCap(state: GameState, cost: Cost): boolean {
  return RESOURCE_IDS.some((id) => {
    const c = cost[id];
    return c !== undefined && c.gt(resourceCap(state, id));
  });
}

/** Bezahlen, falls möglich. */
export function pay(state: GameState, cost: Cost): boolean {
  if (!canAfford(state, cost)) return false;
  for (const id of RESOURCE_IDS) {
    const c = cost[id];
    if (c !== undefined) state.resources[id] = state.resources[id].sub(c);
  }
  return true;
}

/**
 * Sekunden, bis man sich `cost` bei aktueller Produktion leisten kann.
 * Infinity, wenn eine benötigte Ressource gar nicht produziert wird.
 * Grundlage für „nächstes Ziel“-Anzeigen und die Simulation.
 */
export function secondsUntilAffordable(
  state: GameState,
  cost: Cost,
  perSecond: Record<ResourceId, number>,
): number {
  let worst = 0;
  for (const id of RESOURCE_IDS) {
    const c = cost[id];
    if (c === undefined) continue;
    const missing = c.sub(state.resources[id]);
    if (missing.lte(0)) continue;
    const rate = perSecond[id];
    if (rate <= 0) return Infinity;
    worst = Math.max(worst, missing.toNumber() / rate);
  }
  return worst;
}
