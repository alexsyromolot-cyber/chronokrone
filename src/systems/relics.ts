/**
 * Relikte (Epoche 4): Regelbrecher. Dieses Modul hängt nur vom Zustand ab, damit Kampf, Markt,
 * Ereignisse und Sammlungen es einbinden können, ohne Kreis-Importe zu erzeugen.
 */
import { chance, randomInt } from '../core/rng';
import { RELIC_IDS, RELIC_RULES, type RelicId } from '../data/reactor';
import { addLog, type GameState } from './state';

export function hasRelic(state: GameState, id: RelicId): boolean {
  return !!state.relics[id];
}

/** Vollständige Sammlung: Bonus auf Produktion und Schaden. */
export function relicSetBonus(state: GameState): number {
  return RELIC_IDS.every((id) => state.relics[id]) ? RELIC_RULES.setBonus : 0;
}

/** Glücksisotop halbiert alle Glücksschutz-Grenzen (aufgerundet). */
export function pityLimit(state: GameState, base: number): number {
  return hasRelic(state, 'luckyIsotope') ? Math.ceil(base / 2) : base;
}

/** Nach einem Sieg ab Epoche 4: mit Glück (spätestens an der Pity-Grenze) ein neues Relikt. */
export function rollRelic(state: GameState): void {
  if (state.epoch < RELIC_RULES.fromEpoch) return;
  const missing = RELIC_IDS.filter((id) => !state.relics[id]);
  if (missing.length === 0) return;
  state.relicPity++;
  if (!chance(state.rng, RELIC_RULES.findChance) && state.relicPity < pityLimit(state, RELIC_RULES.pity))
    return;
  state.relicPity = 0;
  const found = missing[randomInt(state.rng, 0, missing.length - 1)]!;
  state.relics[found] = true;
  addLog(state, 'narrator.relic', { name: `@relic.${found}` });
}
