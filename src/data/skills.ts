/**
 * Mini-Skilltrees für den Vertical Slice (je Klasse 2–3 Knoten).
 * Die vollen Bäume mit ~30 Knoten und Spezialisierung ab Level 10 kommen in Meilenstein 3.
 *
 * Skillpunkte gehören der Klasse, nicht der einzelnen Einheit: Jedes Level-Up
 * irgendeiner Einheit der Klasse gibt 1 Punkt in den Topf der Klasse.
 * Jede Stufe eines Knotens kostet 1 Punkt.
 */
import type { ClassId } from './units';

export type SkillEffect =
  | { kind: 'damageMult'; perRank: number }
  | { kind: 'enemySlow'; perRank: number }
  | { kind: 'wallHpMult'; perRank: number }
  | { kind: 'productionMult'; perRank: number }
  | { kind: 'terrainBonusMult'; perRank: number };

export interface SkillDef {
  id: string;
  classId: ClassId;
  maxRank: number;
  effect: SkillEffect;
  /** Knoten, der mindestens Stufe 1 haben muss. */
  requires?: string;
  /** Position im Icon-Raster (Spalte, Zeile). */
  pos: [number, number];
}

export const SKILLS: SkillDef[] = [
  // Bauer
  {
    id: 'pitchforkTraining',
    classId: 'peasant',
    maxRank: 3,
    effect: { kind: 'damageMult', perRank: 0.5 },
    pos: [0, 0],
  },
  {
    id: 'loudCursing',
    classId: 'peasant',
    maxRank: 2,
    effect: { kind: 'enemySlow', perRank: 0.1 },
    requires: 'pitchforkTraining',
    pos: [1, 0],
  },
  // Ritter
  {
    id: 'whetstone',
    classId: 'knight',
    maxRank: 3,
    effect: { kind: 'damageMult', perRank: 0.4 },
    pos: [0, 0],
  },
  {
    id: 'wallWarden',
    classId: 'knight',
    maxRank: 2,
    effect: { kind: 'wallHpMult', perRank: 0.15 },
    requires: 'whetstone',
    pos: [1, 0],
  },
  // Holzfäller
  {
    id: 'sharpAxes',
    classId: 'woodcutter',
    maxRank: 3,
    effect: { kind: 'productionMult', perRank: 0.3 },
    pos: [0, 0],
  },
  {
    id: 'forestLore',
    classId: 'woodcutter',
    maxRank: 1,
    effect: { kind: 'terrainBonusMult', perRank: 1 },
    requires: 'sharpAxes',
    pos: [1, 0],
  },
];

export const SKILLS_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
