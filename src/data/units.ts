/**
 * Einheiten-Klassen von Epoche 1: Bauer (Start), Truppen (Ritter, Bogenschütze,
 * Hexenmeister) und Sammler (Holzfäller, Bergmann, Kräuterhexe, Mönch).
 *
 * Attribute wirken auf Kampf UND Arbeit. Jede Klasse hat ein Hauptattribut:
 *   Schaden pro Schlag   = baseDamage × (1 + 0,10 × Hauptattribut) × (1 + Boni)
 *   Angriffstempo        = attackInterval / (1 + 0,03 × Geschick)
 *   Mauer-LP             += 2 × Ausdauer jeder Truppe
 *   Arbeitsbonus Sammler = 0,5 + 0,05 × Arbeitsattribut   (als +Anteil auf die Gebäudeproduktion)
 *
 * Reichweite: Nahkämpfer treffen nur Aliens direkt vor der Mauer, Fernkämpfer bis `range`
 * Pixel weit. Flächenschaden trifft zusätzlich alle Aliens im Umkreis `splash`.
 *
 * Level: benötigte XP für Level L → L+1 = xpBase × xpGrowth^(L−1)
 * Jedes Level gibt +attrPerLevel und 1 Skillpunkt für die Klasse.
 */
import type { BuildingId } from './buildings';
import type { ResourceAmounts } from './resources';

export type ClassId =
  | 'peasant'
  | 'knight'
  | 'archer'
  | 'warlock'
  | 'woodcutter'
  | 'miner'
  | 'herbalist'
  | 'monk'
  | 'stoker'
  | 'steamKnight';
export type AttributeId = 'str' | 'dex' | 'mag' | 'end';
export type Attributes = Record<AttributeId, number>;

export interface ClassDef {
  id: ClassId;
  role: 'troop' | 'gatherer';
  /** Kosten der ersten Anwerbung; jede weitere × costGrowth. */
  baseCost: ResourceAmounts;
  costGrowth: number;
  /** Gebäude, das die Anwerbung freischaltet (bzw. in dem Sammler arbeiten). */
  requires?: BuildingId;
  baseAttributes: Attributes;
  attrPerLevel: Attributes;
  /** Attribut, das Schaden (Truppen) bzw. Arbeitsbonus (Sammler) bestimmt. */
  mainAttr: AttributeId;
  baseDamage: number;
  /** Sekunden zwischen zwei Schlägen bei Geschick 0. */
  attackInterval: number;
  /** Reichweite in Pixeln vor der Mauer (Nahkampf: 26). */
  range: number;
  /** Flächenschaden-Radius in Pixeln (0 = nur ein Ziel). */
  splash: number;
  /** Farbe für Silhouette und UI. */
  color: string;
}

const MELEE = 26;

export const CLASSES: Record<ClassId, ClassDef> = {
  peasant: {
    id: 'peasant',
    role: 'troop',
    baseCost: { gold: 10 },
    costGrowth: 1.3,
    baseAttributes: { str: 2, dex: 1, mag: 0, end: 2 },
    attrPerLevel: { str: 0.5, dex: 0.3, mag: 0, end: 0.5 },
    mainAttr: 'str',
    baseDamage: 1,
    attackInterval: 1,
    range: MELEE,
    splash: 0,
    color: '#c9a66b',
  },
  knight: {
    id: 'knight',
    role: 'troop',
    requires: 'barracks',
    baseCost: { gold: 40, wood: 10 },
    costGrowth: 1.35,
    baseAttributes: { str: 5, dex: 2, mag: 0, end: 5 },
    attrPerLevel: { str: 1, dex: 0.3, mag: 0, end: 1 },
    mainAttr: 'str',
    baseDamage: 3,
    attackInterval: 1.2,
    range: MELEE,
    splash: 0,
    color: '#7fa7e0',
  },
  archer: {
    id: 'archer',
    role: 'troop',
    requires: 'archeryRange',
    baseCost: { gold: 60, planks: 10 },
    costGrowth: 1.35,
    baseAttributes: { str: 2, dex: 6, mag: 0, end: 2 },
    attrPerLevel: { str: 0.3, dex: 1.2, mag: 0, end: 0.3 },
    mainAttr: 'dex',
    baseDamage: 2,
    attackInterval: 1.4,
    // Bogenschützen treffen Aliens, lange bevor sie die Mauer erreichen.
    range: 170,
    splash: 0,
    color: '#a8c060',
  },
  warlock: {
    id: 'warlock',
    role: 'troop',
    requires: 'mageTower',
    baseCost: { gold: 120, scrolls: 2 },
    costGrowth: 1.4,
    baseAttributes: { str: 1, dex: 2, mag: 7, end: 2 },
    attrPerLevel: { str: 0.2, dex: 0.3, mag: 1.4, end: 0.3 },
    mainAttr: 'mag',
    baseDamage: 3,
    attackInterval: 2.2,
    range: 120,
    // Flächenschaden: trifft alles im Umkreis des Ziels.
    splash: 24,
    color: '#b07ae0',
  },
  woodcutter: {
    id: 'woodcutter',
    role: 'gatherer',
    requires: 'lumberHut',
    baseCost: { gold: 15 },
    costGrowth: 1.3,
    baseAttributes: { str: 4, dex: 2, mag: 0, end: 3 },
    attrPerLevel: { str: 1, dex: 0.5, mag: 0, end: 0.5 },
    mainAttr: 'str',
    baseDamage: 1.5,
    attackInterval: 1.1,
    range: MELEE,
    splash: 0,
    color: '#6ea85a',
  },
  miner: {
    id: 'miner',
    role: 'gatherer',
    requires: 'mine',
    baseCost: { gold: 25 },
    costGrowth: 1.3,
    baseAttributes: { str: 4, dex: 1, mag: 0, end: 4 },
    attrPerLevel: { str: 0.8, dex: 0.2, mag: 0, end: 0.8 },
    mainAttr: 'str',
    baseDamage: 1.5,
    attackInterval: 1.2,
    range: MELEE,
    splash: 0,
    color: '#a0766a',
  },
  herbalist: {
    id: 'herbalist',
    role: 'gatherer',
    requires: 'herbGarden',
    baseCost: { gold: 25 },
    costGrowth: 1.3,
    baseAttributes: { str: 1, dex: 2, mag: 4, end: 2 },
    attrPerLevel: { str: 0.2, dex: 0.4, mag: 1, end: 0.4 },
    mainAttr: 'mag',
    baseDamage: 1,
    attackInterval: 1.2,
    range: MELEE,
    splash: 0,
    color: '#7ed37e',
  },
  monk: {
    id: 'monk',
    role: 'gatherer',
    requires: 'monastery',
    baseCost: { gold: 30 },
    costGrowth: 1.35,
    baseAttributes: { str: 1, dex: 3, mag: 4, end: 2 },
    attrPerLevel: { str: 0.2, dex: 0.6, mag: 0.9, end: 0.3 },
    mainAttr: 'mag',
    baseDamage: 1,
    attackInterval: 1.2,
    range: MELEE,
    splash: 0,
    color: '#d9c27a',
  },
  // --- Epoche 2: Dampf & Zahnrad ---
  stoker: {
    id: 'stoker',
    role: 'gatherer',
    requires: 'coalMine',
    baseCost: { gold: 300, coal: 20 },
    costGrowth: 1.35,
    baseAttributes: { str: 5, dex: 1, mag: 0, end: 6 },
    attrPerLevel: { str: 0.8, dex: 0.2, mag: 0, end: 1.2 },
    // Heizer schaufeln mit Ausdauer, nicht mit Stärke.
    mainAttr: 'end',
    baseDamage: 2,
    attackInterval: 1.2,
    range: MELEE,
    splash: 0,
    color: '#8a6a4a',
  },
  steamKnight: {
    id: 'steamKnight',
    role: 'troop',
    requires: 'steamFoundry',
    baseCost: { gold: 2000, gears: 10, steel: 20 },
    costGrowth: 1.4,
    baseAttributes: { str: 9, dex: 2, mag: 0, end: 8 },
    attrPerLevel: { str: 1.5, dex: 0.3, mag: 0, end: 1.2 },
    mainAttr: 'str',
    baseDamage: 12,
    attackInterval: 1.5,
    // Dampfdruck-Lanze: trifft auch Aliens ein Stück vor der Mauer.
    range: 60,
    splash: 16,
    color: '#c08a50',
  },
};

/** Reihenfolge in Listen und Panels. */
export const CLASS_ORDER: ClassId[] = [
  'steamKnight',
  'peasant',
  'knight',
  'archer',
  'warlock',
  'woodcutter',
  'miner',
  'herbalist',
  'monk',
  'stoker',
];

/** Gebäude, deren Level Truppenplätze und Truppenschaden geben. */
export const TROOP_BUILDINGS: BuildingId[] = ['barracks', 'archeryRange', 'mageTower', 'steamFoundry'];

export const UNIT_FORMULAS = {
  damagePerAttr: 0.1,
  speedPerDex: 0.03,
  wallHpPerEnd: 2,
  workBase: 0.5,
  workPerAttr: 0.05,
  xpBase: 8,
  xpGrowth: 1.6,
  /** XP, die ein Sammler pro Sekunde Arbeit bekommt. */
  workXpPerSecond: 0.4,
} as const;

/** Startaufstellung: drei Bauern mit Mistgabeln. */
export const START_UNITS: ClassId[] = ['peasant', 'peasant', 'peasant'];
