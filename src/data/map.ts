/**
 * Burgkarte Epoche 1 (4×4). Jede Epoche bekommt später eine eigene, größere Karte.
 *
 * Feld roden: Kosten = clearBaseCost × clearGrowth^(bereits gerodete Felder)
 * Nur Felder, die an ein freies Feld grenzen, lassen sich roden – die Burg wächst von innen.
 */
import type { ResourceAmounts } from './resources';

export type TerrainId = 'grass' | 'forest' | 'rock' | 'stream';

export interface MapDef {
  width: number;
  height: number;
  /** Zeilen von oben nach unten: g = Gras, f = Wald, r = Fels, s = Bach. */
  terrain: string[];
  keep: { x: number; y: number };
  /** Felder, die zu Beginn schon frei sind (außer dem Bergfried). */
  startUnlocked: { x: number; y: number }[];
  clearBaseCost: ResourceAmounts;
  clearGrowth: number;
}

export const EPOCH1_MAP: MapDef = {
  width: 4,
  height: 4,
  terrain: ['fggr', 'fggr', 'ggsg', 'fgsr'],
  keep: { x: 1, y: 1 },
  startUnlocked: [{ x: 0, y: 1 }],
  clearBaseCost: { gold: 10, wood: 5 },
  clearGrowth: 1.55,
};

export const TERRAIN_CODES: Record<string, TerrainId> = {
  g: 'grass',
  f: 'forest',
  r: 'rock',
  s: 'stream',
};
