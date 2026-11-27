/**
 * Burgkarte Epoche 1 (8×8). Am Anfang ist nur das innere 4×4 erreichbar; Forschung
 * „Landvermessung“ erweitert den Bereich auf 6×6 und 8×8. Jede Epoche bekommt später
 * eine eigene Karte.
 *
 * Feld roden: Kosten = clearBaseCost × clearGrowth^(bereits gerodete Felder)
 * Nur Felder, die an ein freies Feld grenzen, lassen sich roden – die Burg wächst von innen.
 */
import type { ResourceAmounts } from './resources';

export type TerrainId = 'grass' | 'forest' | 'rock' | 'stream';

export interface Bounds {
  min: number;
  max: number;
}

export interface MapDef {
  width: number;
  height: number;
  /** Zeilen von oben nach unten: g = Gras, f = Wald, r = Fels, s = Bach. */
  terrain: string[];
  keep: { x: number; y: number };
  /** Felder, die zu Beginn schon frei sind (außer dem Bergfried). */
  startUnlocked: { x: number; y: number }[];
  /** Erreichbarer Bereich je Landvermessungs-Stufe (gilt für x und y). */
  surveyBounds: Bounds[];
  clearBaseCost: ResourceAmounts;
  clearGrowth: number;
}

export const EPOCH1_MAP: MapDef = {
  width: 8,
  height: 8,
  // Das innere 4×4 (Spalten/Zeilen 2–5) entspricht der Karte aus Meilenstein 2.
  terrain: ['ffffgrrr', 'ffgggrrr', 'fffggrrr', 'fgfggrgr', 'ggggsggg', 'fgfgsrrg', 'ggggssgf', 'gfggsgff'],
  keep: { x: 3, y: 3 },
  startUnlocked: [{ x: 2, y: 3 }],
  surveyBounds: [
    { min: 2, max: 5 },
    { min: 1, max: 6 },
    { min: 0, max: 7 },
  ],
  clearBaseCost: { gold: 10, wood: 5 },
  clearGrowth: 1.18,
};

export const TERRAIN_CODES: Record<string, TerrainId> = {
  g: 'grass',
  f: 'forest',
  r: 'rock',
  s: 'stream',
};
