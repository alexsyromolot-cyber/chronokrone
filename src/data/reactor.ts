/**
 * Reaktor und Relikte (Epoche 4 „Atomare Kreuzzüge“).
 *
 * Reaktor (höchstens einer): verbrennt Brennstäbe und hebt die Produktion ALLER Gebäude.
 *   Bonus   = bonusPerLevel × Level × Leistung × Brennstoff-Anteil      (wirkt als Faktor 1 + Bonus)
 *   Hitze/s = heatPerLevel × Level × Leistung² × Brennstoff − coolPerLevel × Σ Kühlturm-Level
 *   Stäbe/s = rodsPerLevel × Level × Leistung
 *
 * Leistung wählt der Spieler (aus, halb, voll, Überlast). Weil die Hitze quadratisch mit der
 * Leistung steigt, der Bonus aber nur linear, ist Überlast ein echtes Risiko: Erreicht die Hitze
 * 100 %, kommt es zur Kernschmelze – eine Katastrophe mit Entscheidung (siehe data/events.ts).
 * Danach fährt der Reaktor herunter (Leistung 0) und muss bewusst wieder angefahren werden.
 */
export const REACTOR = {
  rodsPerLevel: 0.04,
  bonusPerLevel: 0.15,
  heatPerLevel: 0.004,
  coolPerLevel: 0.006,
  /** Wählbare Leistungsstufen. */
  throttles: [0, 0.5, 1, 1.5],
  /** Ab dieser Hitze warnt der Erzähler. */
  warnAt: 0.8,
  /** Hitze direkt nach einer Kernschmelze. */
  heatAfterMeltdown: 0.4,
  /** Ohne Reaktor kühlt die Hitze langsam ab (pro Sekunde). */
  idleCooling: 0.01,
} as const;

/** Kernschmelze: Eindämmen kostet diesen Anteil des Golds, Evakuieren halbiert die Reaktor-Level. */
export const MELTDOWN = {
  containGoldShare: 0.25,
  prayChance: 0.1,
} as const;

/**
 * Sammlung „Relikte“: Regelbrecher. Jedes gefundene Relikt wirkt sofort und für immer
 * (bleibt bei jedem Sprung) und biegt genau eine Spielregel.
 */
export type RelicId =
  | 'leadApron'
  | 'crackedHourglass'
  | 'goldenScale'
  | 'luckyIsotope'
  | 'twinStrike'
  | 'mirrorShield'
  | 'burningChalice'
  | 'treasureMap';

export const RELIC_IDS: RelicId[] = [
  'leadApron',
  'crackedHourglass',
  'goldenScale',
  'luckyIsotope',
  'twinStrike',
  'mirrorShield',
  'burningChalice',
  'treasureMap',
];

export const RELIC_NUMBERS = {
  /** Bleischürze: Reaktor erzeugt so viel weniger Hitze. */
  leadApronHeat: 0.35,
  /** Gesprungene Sanduhr: Wut setzt so viele Sekunden später ein. */
  hourglassDelay: 60,
  /** Zwillingsschlag: ein Klick trifft zusätzlich den nächsten Gegner mit diesem Anteil. */
  twinStrikeShare: 0.5,
  /**
   * Spiegelschild: Gegner an der Mauer erleiden pro Sekunde diesen Anteil eines durchschnittlichen
   * Truppen-Treffers. An den eigenen Schaden gekoppelt – ein Anteil der Gegner-LP würde jede
   * Gegnerstärke ignorieren (auch das Mutterschiff).
   */
  mirrorShare: 0.5,
  /** Brennender Kelch: Kernschmelze wird zum Produktionsrausch. */
  chaliceMult: 2,
  chaliceSeconds: 60,
  /** Schatzkarte: Die Alien-Drohne kommt so viel häufiger (Wartezeit × Faktor). */
  treasureMapInterval: 0.5,
} as const;

export const RELIC_RULES = {
  fromEpoch: 4,
  findChance: 0.25,
  pity: 5,
  /** Vollständige Sammlung: +15 % Produktion und Schaden. */
  setBonus: 0.15,
} as const;
