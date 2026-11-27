/**
 * Ereignisse, Jahreszeiten und Minispiele.
 *
 * Jahreszeiten wechseln alle SEASON_LENGTH Sekunden Spielzeit (innerhalb der Epoche) und
 * verändern die Produktion einzelner Rohstoffe. Ereignisse kommen alle 4–6 Minuten, haben
 * Antwortmöglichkeiten und verfallen nach EVENT_TIMEOUT Sekunden mit der ersten Option
 * als Standard. Alle Zufälle laufen über den gespeicherten Zufallsgenerator.
 *
 * Fairness (No-Go „unfaire Zufälle“): Chancen werden immer angezeigt, das Würfelspiel ist
 * exakt fair (Erwartungswert = Einsatz) und läuft nur mit Gold, höchstens 10 % des Vorrats.
 */
import type { ResourceId } from './resources';

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_LENGTH = 8 * 60;

/** Produktions-Multiplikatoren je Jahreszeit (fehlende Rohstoffe: ×1). */
export const SEASON_EFFECTS: Record<SeasonId, Partial<Record<ResourceId, number>>> = {
  spring: { herbs: 1.3, knowledge: 1.1 },
  summer: { wood: 1.15, stone: 1.15 },
  autumn: { gold: 1.25, herbs: 1.1 },
  // Winter bremst die Holzfäller, Kräuter wachsen kaum. Dafür wird im Kloster mehr gelesen.
  winter: { wood: 0.75, herbs: 0.6, knowledge: 1.2 },
};

export type EventId =
  | 'stableFire'
  | 'merchant'
  | 'defector'
  | 'rain'
  | 'harvest'
  | 'bard'
  // Epoche 4
  | 'sandstorm'
  | 'meltdown';

export interface EventDef {
  id: EventId;
  weight: number;
  /** Antwortmöglichkeiten; die erste ist der Standard, wenn das Ereignis verfällt. */
  options: string[];
  /** Erst ab dieser Epoche im Zufallstopf. */
  fromEpoch?: number;
}

export const EVENTS: EventDef[] = [
  { id: 'stableFire', weight: 2, options: ['letBurn', 'extinguish', 'pray'] },
  { id: 'merchant', weight: 3, options: ['decline', 'trade'] },
  { id: 'defector', weight: 2, options: ['decline', 'buy'] },
  { id: 'rain', weight: 2, options: ['ok'] },
  { id: 'harvest', weight: 2, options: ['ok'] },
  { id: 'bard', weight: 2, options: ['chase', 'listen'] },
  { id: 'sandstorm', weight: 2, options: ['endure', 'shelter'], fromEpoch: 4 },
  // Kommt nie zufällig (Gewicht 0), sondern nur, wenn der Reaktor überhitzt.
  { id: 'meltdown', weight: 0, options: ['evacuate', 'contain', 'pray'] },
];

export const EVENT_INTERVAL: [number, number] = [240, 360];
export const EVENT_TIMEOUT = 60;

export const EVENT_NUMBERS = {
  /** Löschen kostet diesen Anteil des aktuellen Holz- und Steinvorrats. */
  extinguishShare: 0.15,
  /** Beten hilft – fast nie. */
  prayChance: 0.1,
  /** Händler: gibt diesen Anteil des vollsten Rohstoffs … */
  merchantGive: 0.3,
  /** … und bekommt dafür diesen Anteil an Lagerplatz des knappsten. */
  merchantGet: 0.25,
  /** Überläufer: Chips für Gold; Preis = Sekunden Gold-Steuer × Faktor. */
  defectorChips: 5,
  defectorGoldSeconds: 120,
  rainHerbs: 1.5,
  rainSeconds: 120,
  harvestAll: 1.3,
  harvestSeconds: 90,
  /** Barde: XP-Anteil des nächsten Levels für alle Einheiten bzw. Gold für das Verjagen. */
  bardXpShare: 0.5,
  bardGold: 20,
  /** Sandsturm: Aushalten = Produktion × endureMult für endureSeconds; Schutz kostet Gold. */
  sandstormMult: 0.7,
  sandstormSeconds: 90,
  shelterGoldShare: 0.1,
} as const;

/** Alien-Drohne: fliegt über das Schlachtfeld, ein Klick holt die Beute. */
export const DRONE = {
  interval: [90, 180] as [number, number],
  /** Sekunden, die sie zum Überqueren braucht. */
  flightTime: 8,
  /** Beute: Anteil der Gold-Beute der letzten Schlacht, mindestens minGold, plus Schrott. */
  lastBattleShare: 0.1,
  minGold: 25,
  scrap: 2,
} as const;

/** Taverne: zwei Wetten auf zwei Würfel, beide mit exakt fairem Auszahlungsfaktor. */
export const DICE = {
  maxStakeShare: 0.1,
  bets: {
    // P(Summe ≥ 7) = 21/36 → Auszahlung 36/21
    high: { wins: (sum: number) => sum >= 7, chance: 21 / 36 },
    // P(Summe = 12) = 1/36 → Auszahlung 36
    twelve: { wins: (sum: number) => sum === 12, chance: 1 / 36 },
  },
} as const;
export type DiceBet = keyof typeof DICE.bets;
