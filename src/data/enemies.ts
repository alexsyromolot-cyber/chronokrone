/**
 * Gegner und Schlacht-Balancing für Epoche 1.
 *
 * Das Schlachtfeld ist 320 Pixel breit (interne Auflösung). Aliens erscheinen rechts
 * und laufen nach links auf die Mauer zu. Wer die Mauer erreicht, hämmert darauf ein.
 *
 * Welle w (ab 1) in Belagerungsstufe s (ab 0):
 *   Anzahl Gegner     = countBase + countPerWave × (w − 1)
 *   Lebenspunkte      = Basis-LP × hpGrowthPerWave^(w − 1) × hpGrowthPerSiege^s
 *   Beute pro Abschuss = Basis-Gold × (1 + 0,15 × (w − 1)) × goldGrowthPerSiege^s
 * Wer alle Wellen übersteht, gewinnt und schaltet die nächste Belagerungsstufe frei.
 *
 * Elitegegner erscheinen am Ende der letzten Welle bestimmter Belagerungsstufen und
 * lassen je ein Teil der Zeitmaschine fallen. Ihre LP wachsen genauso mit Welle und Stufe.
 *
 * Wut: Dauert eine Schlacht länger als enrageAfter Sekunden, verdoppelt sich der
 * Mauerschaden der Aliens alle enrageDoubling Sekunden. So bleiben Schlachten bei
 * 2–5 Minuten, statt sich endlos zu ziehen.
 */

export type EnemyId =
  | 'saugling'
  | 'blechkriecher'
  | 'brummdrohne'
  | 'schildling'
  | 'muttersauger'
  | 'blechkoloss'
  | 'brummkoenigin'
  | 'kommandant';

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
  /** Elitegegner: erscheinen nur nach Plan (ELITES), nehmen weniger von Angriffszaubern. */
  elite?: boolean;
  /** Anteil, den Nahkampfschaden weniger macht (0,5 = halber Schaden). */
  meleeArmor?: number;
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
  // Trägt einen Topfdeckel als Schild. Nahkämpfer verzweifeln, Bogenschützen lachen.
  schildling: {
    id: 'schildling',
    hp: 10,
    speed: 14,
    wallDps: 1.5,
    gold: 5,
    xp: 2,
    fromWave: 4,
    weight: 1.5,
    color: '#8fa0c0',
    meleeArmor: 0.6,
  },
  // --- Elitegegner (weight 0: nie zufällig) ---
  muttersauger: {
    id: 'muttersauger',
    hp: 60,
    speed: 10,
    wallDps: 6,
    gold: 150,
    xp: 30,
    fromWave: 99,
    weight: 0,
    color: '#5fc8d0',
    elite: true,
  },
  blechkoloss: {
    id: 'blechkoloss',
    hp: 80,
    speed: 8,
    wallDps: 10,
    gold: 250,
    xp: 45,
    fromWave: 99,
    weight: 0,
    color: '#a0a6c0',
    elite: true,
    meleeArmor: 0.5,
  },
  brummkoenigin: {
    id: 'brummkoenigin',
    hp: 80,
    speed: 22,
    wallDps: 8,
    gold: 350,
    xp: 60,
    fromWave: 99,
    weight: 0,
    color: '#f070c0',
    elite: true,
  },
  kommandant: {
    id: 'kommandant',
    hp: 120,
    speed: 12,
    wallDps: 14,
    gold: 500,
    xp: 90,
    fromWave: 99,
    weight: 0,
    color: '#ff6a5d',
    elite: true,
  },
};

/** Welcher Elitegegner in welcher Belagerungsstufe (ab 0) am Ende der letzten Welle kommt. */
export const ELITES: { enemy: EnemyId; siege: number }[] = [
  { enemy: 'muttersauger', siege: 2 },
  { enemy: 'blechkoloss', siege: 4 },
  { enemy: 'brummkoenigin', siege: 6 },
  { enemy: 'kommandant', siege: 8 },
];

/**
 * Bestiarium: Je erreichter Stufe an Abschüssen eines Typs +5 % Schaden gegen diesen Typ.
 * Elitegegner zählen ab dem ersten Abschuss voll (sie sind selten).
 */
export const BESTIARY_TIERS = [10, 50, 200, 1000] as const;
export const BESTIARY_BONUS_PER_TIER = 0.05;

export const BATTLE = {
  fieldWidth: 320,
  /** x-Position der Mauerkante. */
  wallX: 72,
  spawnX: 330,
  wavesPerBattle: 8,
  countBase: 2,
  countPerWave: 1,
  hpGrowthPerWave: 1.45,
  hpGrowthPerSiege: 1.75,
  goldGrowthPerSiege: 1.6,
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
  /** Wut: ab dieser Schlachtdauer (s) verdoppelt sich der Mauerschaden alle enrageDoubling s. */
  enrageAfter: 150,
  enrageDoubling: 20,
} as const;
