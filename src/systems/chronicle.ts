/**
 * Chronik: Ränge lesen, Kosten berechnen, kaufen, Effekte summieren.
 */
import { CHRONICLE, CHRONICLE_BY_ID, type ChronicleEffect, type ChronicleId } from '../data/chronicle';
import type { MessageKey } from '../i18n/de';
import type { GameState } from './state';

export function chronicleRank(state: GameState, id: ChronicleId): number {
  return state.chronicle[id] ?? 0;
}

/** Kosten Rang r → r+1 = Grundkosten × costGrowth^r (aufgerundet) */
export function chronicleCost(state: GameState, id: ChronicleId): number {
  const def = CHRONICLE_BY_ID[id];
  return Math.ceil(def.baseCost * def.costGrowth ** chronicleRank(state, id));
}

/** Summe „perRank × Rang“ aller Knoten mit diesem Effekt. */
export function chronicleBonus(state: GameState, effect: ChronicleEffect): number {
  return CHRONICLE.filter((c) => c.effect === effect).reduce(
    (sum, c) => sum + c.perRank * chronicleRank(state, c.id),
    0,
  );
}

export function chronicleBlocker(state: GameState, id: ChronicleId): MessageKey | null {
  const def = CHRONICLE_BY_ID[id];
  if (chronicleRank(state, id) >= def.maxRank) return 'reason.maxRank';
  if (def.requires && chronicleRank(state, def.requires) < 1) return 'reason.requiresChronicle';
  if (state.shards < chronicleCost(state, id)) return 'reason.noShards';
  return null;
}

export function buyChronicle(state: GameState, id: ChronicleId): MessageKey | null {
  const blocker = chronicleBlocker(state, id);
  if (blocker) return blocker;
  state.shards -= chronicleCost(state, id);
  state.chronicle[id] = chronicleRank(state, id) + 1;
  return null;
}
