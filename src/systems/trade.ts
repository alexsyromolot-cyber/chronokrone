/**
 * Markt und Begleiter (Epoche 2). Daten und Formeln in data/market.ts und data/companions.ts.
 */
import Decimal from 'break_eternity.js';
import { chance, nextRandom, randomInt } from '../core/rng';
import { MARKET_SPREAD_PER_LEVEL } from '../data/buildings';
import { COMPANION_RULES, COMPANIONS } from '../data/companions';
import { BASE_PRICES, MARKET } from '../data/market';
import type { ResourceId } from '../data/resources';
import type { ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { gain, resourceCap } from './resources';
import { addLog, type GameState } from './state';
import { hasRelic, pityLimit } from './relics';

export const TRADABLE = Object.keys(BASE_PRICES) as ResourceId[];

export function marketLevel(state: GameState): number {
  return state.tiles.find((t) => t.building === 'market')?.level ?? 0;
}

export function price(state: GameState, id: ResourceId): number {
  return state.market.prices[id] ?? BASE_PRICES[id] ?? 1;
}

/** Spanne = 10 % − 1 % je Marktlevel über 1 (mindestens 2 %). */
export function spread(state: GameState): number {
  // Goldene Waage: Regelbruch – kein Unterschied zwischen Kauf- und Verkaufspreis.
  if (hasRelic(state, 'goldenScale')) return 0;
  return Math.max(0.02, MARKET.spread - MARKET_SPREAD_PER_LEVEL * Math.max(0, marketLevel(state) - 1));
}

/** Preise schwanken alle 10 s: zufälliger Schritt plus Zug zurück zum Grundpreis. */
export function tickMarket(state: GameState, dt: number): void {
  if (marketLevel(state) === 0) return;
  const m = state.market;
  m.timer -= dt;
  if (m.timer > 0) return;
  m.timer = MARKET.priceStep;
  for (const id of TRADABLE) {
    const base = BASE_PRICES[id]!;
    const current = price(state, id);
    const shock = (nextRandom(state.rng) * 2 - 1) * MARKET.volatility;
    const next = current * Math.exp(shock) + (base - current) * MARKET.reversion;
    m.prices[id] = Math.max(base * 0.25, next);
    const hist = (m.history[id] ??= []);
    hist.push(m.prices[id]!);
    if (hist.length > MARKET.history) hist.shift();
  }
}

export function sellAmount(state: GameState, id: ResourceId): number {
  return Math.floor(state.resources[id].toNumber() * MARKET.tradeShare);
}

export function buyAmount(state: GameState, id: ResourceId): number {
  return Math.floor(resourceCap(state, id).toNumber() * MARKET.tradeShare);
}

export function sell(state: GameState, id: ResourceId): MessageKey | null {
  if (marketLevel(state) === 0) return 'reason.requiresBuilding';
  if (!TRADABLE.includes(id)) return 'reason.unknown';
  const n = sellAmount(state, id);
  if (n < 1) return 'reason.tooExpensive';
  state.resources[id] = state.resources[id].sub(n);
  gain(state, 'gold', n * price(state, id) * (1 - spread(state)));
  return null;
}

export function buy(state: GameState, id: ResourceId): MessageKey | null {
  if (marketLevel(state) === 0) return 'reason.requiresBuilding';
  if (!TRADABLE.includes(id)) return 'reason.unknown';
  const n = buyAmount(state, id);
  const cost = n * price(state, id) * (1 + spread(state));
  if (n < 1 || state.resources.gold.lt(cost)) return 'reason.tooExpensive';
  state.resources.gold = state.resources.gold.sub(new Decimal(cost));
  gain(state, id, n);
  return null;
}

// ---------- Begleiter ----------

export function companionBonus(state: GameState, classId: ClassId, kind: 'damage' | 'production'): number {
  return COMPANIONS.filter((c) => c.classId === classId && c.kind === kind && state.companions[c.id]).reduce(
    (s, c) => s + c.bonus,
    0,
  );
}

/** Vollständige Sammlung: ×1,1 auf Produktion und Schaden. */
export function companionSetMultiplier(state: GameState): number {
  return COMPANIONS.every((c) => state.companions[c.id]) ? 1 + COMPANION_RULES.setBonus : 1;
}

/** Nach einem Sieg: mit Glück (und spätestens nach der Pity-Grenze) ein neuer Begleiter. */
export function rollCompanion(state: GameState): void {
  if (state.epoch < COMPANION_RULES.fromEpoch) return;
  const missing = COMPANIONS.filter((c) => !state.companions[c.id]);
  if (missing.length === 0) return;
  state.companionPity++;
  if (
    !chance(state.rng, COMPANION_RULES.findChance) &&
    state.companionPity < pityLimit(state, COMPANION_RULES.pity)
  )
    return;
  state.companionPity = 0;
  const found = missing[randomInt(state.rng, 0, missing.length - 1)]!;
  state.companions[found.id] = true;
  addLog(state, 'narrator.companion', { name: `@companion.${found.id}`, cls: `@class.${found.classId}` });
}
