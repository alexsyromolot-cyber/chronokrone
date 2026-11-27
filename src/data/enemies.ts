/**
 * Gegner und Schlacht-Balancing für den Vertical Slice.
 *
 * Das Schlachtfeld ist 320 Pixel breit (interne Auflösung). Aliens erscheinen rechts
 * und laufen nach links auf die Mauer zu. Wer die Mauer erreicht, hämmert darauf ein.
 *
 * Welle w (ab 1) in Belagerungsstufe s (ab 0):
 *   Anzahl Gegner     = countBase + countPerWave × (w − 1)
 *   Lebenspunkte      = Basis-LP × hpGrowthPerWave^(w − 1) × hpGrowthPerSiege^s
 *   Beute pro Abschuss = Basis-Gold × (1 + 0,15 × (w − 1)) × goldGrowthPerSiege^s
 * Wer alle Wellen übersteht, gewinnt und schaltet die nächste Belagerungsstufe frei.
 */

export type EnemyId = 'saugling' | 'blechkriecher' | 'brummdrohne';

export interface EnemyDef {
  id: EnemyId;
  hp: number;
  /** Pixel pro Sekunde. */
  speed: number;
  /** Schaden an der Mauer pro Sekunde. */
  wallDps: number;
  gold: number;
  xp: number;
  /** Ab welcher Welle er auftauchen kann. */
  fromWave: number;
  /** Relative Häufigkeit unter den erlaubten Typen. */
  weight: number;
  color: string;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  // Staubsauger × Tintenfisch. Der Klassiker.
  saugling: {
    id: 'saugling',
    hp: 4,
    speed: 24,
    wallDps: 1,
    gold: 2,
    xp: 1,
    fromWave: 1,
    weight: 3,
    color: '#9ad1d4',
  },
  // Flach, schnell, klappert.
  blechkriecher: {
    id: 'blechkriecher',
    hp: 3,
    speed: 40,
    wallDps: 0.7,
    gold: 2,
    xp: 1,
    fromWave: 3,
    weight: 2,
    color: '#c6c9d8',
  },
  // Schwebt, hält viel aus, brummt nervtötend.
  brummdrohne: {
    id: 'brummdrohne',
    hp: 12,
    speed: 16,
    wallDps: 2,
    gold: 6,
    xp: 3,
    fromWave: 5,
    weight: 1,
    color: '#e07fb0',
  },
};

export const BATTLE = {
  fieldWidth: 320,
  /** x-Position der Mauerkante. */
  wallX: 72,
  spawnX: 330,
  wavesPerBattle: 8,
  countBase: 2,
  countPerWave: 1,
  hpGrowthPerWave: 1.45,
  hpGrowthPerSiege: 1.9,
  goldGrowthPerSiege: 2,
  goldPerWaveStep: 0.15,
  /** Sekunden zwischen zwei Spawns innerhalb einer Welle. */
  spawnInterval: 0.9,
  /** Nächste Welle kommt nach dieser Zeit – oder früher, wenn alle tot sind. */
  waveInterval: 10,
  /** Pause vor der ersten Welle. */
  firstWaveDelay: 1.5,
  /** Gold-Bonus für jede überstandene Welle = waveClearGold × Welle. */
  waveClearGold: 3,
  wallBaseHp: 20,
  /** Mauer verstärken: +wallHpPerUpgrade, Kosten = wallUpgradeCost × wallUpgradeGrowth^Stufe. */
  wallHpPerUpgrade: 10,
  wallUpgradeCost: { stone: 15, wood: 5 },
  wallUpgradeGrowth: 1.25,
  /** Klickschaden des Königs (vor Boni). */
  clickDamage: 1,
  /** Radius in Pixeln, in dem ein Klick ein Alien trifft. */
  clickRadius: 14,
  /** Alien-Schrott: Drop-Chance pro Abschuss und garantierter Drop nach so vielen Fehlversuchen. */
  scrapChance: 0.1,
  scrapPity: 12,
} as const;
