/**
 * Zeitschleife und Fluch-Siegel (nach dem Finale).
 *
 * Zeitschleife: Nach dem Sieg über das Mutterschiff beginnt alles wieder in Epoche 1 – mit
 * allem, was dauerhaft ist (Chronik, Zeitsplitter, Sammlungen, Erfolge, Hofbefehle, Statistik).
 * Zurück gehen zusätzlich zur normalen Epochen-Rücksetzung: Forschung und Zauber.
 *
 * Schleifen-Siegel: Jede abgeschlossene Schleife gibt 1 Siegel + sealPerCurse je aktivem Fluch.
 *   Bonus = sealBonus × Siegel  auf Produktion und Schaden (additiv, für immer)
 *
 * Schleifenregel: Jede Schleife biegt eine Regel leicht um (reihum, siehe LOOP_RULES).
 *
 * Fluch-Siegel: Vor dem Start einer Schleife wählbar, bis zu maxCurses kombinierbar.
 * Jeder Fluch macht das Spiel härter und gibt +shardBonusPerCurse Zeitsplitter beim Sprung
 * sowie mehr Siegel. Bestzeiten werden je Fluch-Kombination festgehalten.
 */
export type LoopRuleId = 'mirror' | 'swiftAliens' | 'altStart' | 'armoredAliens';
export type CurseId = 'frailWalls' | 'toughAliens' | 'weakClicks' | 'lean' | 'shortFuse';

export const LOOP = {
  sealBonus: 0.25,
  sealPerCurse: 0.5,
  shardBonusPerCurse: 0.25,
  maxCurses: 5,
} as const;

/** Regel der Schleife n (ab 1): reihum. Schleife 0 ist der erste Durchgang ohne Sonderregel. */
export const LOOP_RULES: LoopRuleId[] = ['mirror', 'swiftAliens', 'altStart', 'armoredAliens'];

export const LOOP_RULE_NUMBERS = {
  /** Flinke Aliens: schneller, aber mehr Beute. */
  swiftSpeed: 1.25,
  swiftGold: 1.2,
  /** Andere Startklasse: statt drei Bauern ein Ritter, eine Bogenschützin, ein Bauer. */
  altStartUnits: ['knight', 'archer', 'peasant'] as const,
  /** Gepanzerte Aliens: zusätzlicher Nahkampf-Panzer für alle (Bogen & Magie lachen). */
  extraMeleeArmor: 0.2,
} as const;

export const CURSE_IDS: CurseId[] = ['frailWalls', 'toughAliens', 'weakClicks', 'lean', 'shortFuse'];

export const CURSE_NUMBERS = {
  frailWallsMult: 0.5,
  toughAliensMult: 2,
  weakClicksMult: 0.25,
  leanMult: 0.7,
  shortFuseSeconds: 60,
} as const;
