/**
 * Einheiten-Klassen im Vertical Slice: Bauer (Start), Ritter (Truppe), Holzfäller (Sammler).
 * Die übrigen Klassen aus docs/design.md folgen in Meilenstein 3.
 *
 * Attribute wirken auf Kampf UND Arbeit:
 *   Schaden pro Schlag   = baseDamage × (1 + 0,10 × Stärke) × Skill- und Kasernenbonus
 *   Angriffstempo        = attackInterval / (1 + 0,03 × Geschick)
 *   Mauer-Lebenspunkte   += 2 × Ausdauer jeder Truppe
 *   Arbeitsbonus Sammler = 0,5 + 0,05 × Stärke   (als +Anteil auf die Gebäudeproduktion)
 *
 * Level: benötigte XP für Level L → L+1 = xpBase × xpGrowth^(L−1)
 * Jedes Level gibt +attrPerLevel und 1 Skillpunkt für die Klasse.
 */
import type { BuildingId } from './buildings';
import type { ResourceAmounts } from './resources';

export type ClassId = 'peasant' | 'knight' | 'woodcutter';
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
  baseDamage: number;
  /** Sekunden zwischen zwei Schlägen bei Geschick 0. */
  attackInterval: number;
  /** Farbe für Silhouette und UI. */
  color: string;
}

export const CLASSES: Record<ClassId, ClassDef> = {
  peasant: {
    id: 'peasant',
    role: 'troop',
    baseCost: { gold: 10 },
    costGrowth: 1.3,
    baseAttributes: { str: 2, dex: 1, mag: 0, end: 2 },
    attrPerLevel: { str: 0.5, dex: 0.3, mag: 0, end: 0.5 },
    baseDamage: 1,
    attackInterval: 1,
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
    baseDamage: 3,
    attackInterval: 1.2,
    color: '#7fa7e0',
  },
  woodcutter: {
    id: 'woodcutter',
    role: 'gatherer',
    requires: 'lumberHut',
    baseCost: { gold: 15 },
    costGrowth: 1.3,
    baseAttributes: { str: 4, dex: 2, mag: 0, end: 3 },
    attrPerLevel: { str: 1, dex: 0.5, mag: 0, end: 0.5 },
    baseDamage: 1.5,
    attackInterval: 1.1,
    color: '#6ea85a',
  },
};

export const UNIT_FORMULAS = {
  damagePerStr: 0.1,
  speedPerDex: 0.03,
  wallHpPerEnd: 2,
  workBase: 0.5,
  workPerStr: 0.05,
  xpBase: 8,
  xpGrowth: 1.6,
  /** XP, die ein Sammler pro Sekunde Arbeit bekommt. */
  workXpPerSecond: 0.4,
} as const;

/** Startaufstellung: drei Bauern mit Mistgabeln. */
export const START_UNITS: ClassId[] = ['peasant', 'peasant', 'peasant'];
