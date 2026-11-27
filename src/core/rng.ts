/**
 * Deterministischer Zufall. `Math.random()` wäre bequemer, aber dann könnten wir
 * keine Simulation reproduzieren und keinen Test schreiben, der Drops prüft.
 * Der Zustand ist eine einzige Zahl und wird mit dem Spielstand gespeichert.
 *
 * Algorithmus: mulberry32 – winzig, schnell und für Spielzwecke gut genug verteilt.
 */

export interface RngState {
  seed: number;
}

/** Nächste Zufallszahl in [0, 1). Verändert `rng.seed`. */
export function nextRandom(rng: RngState): number {
  rng.seed = (rng.seed + 0x6d2b79f5) | 0;
  let t = rng.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** true mit Wahrscheinlichkeit `p`. */
export function chance(rng: RngState, p: number): boolean {
  return nextRandom(rng) < p;
}

/** Ganzzahl in [min, max]. */
export function randomInt(rng: RngState, min: number, max: number): number {
  return min + Math.floor(nextRandom(rng) * (max - min + 1));
}
