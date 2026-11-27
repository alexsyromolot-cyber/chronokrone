/**
 * Epochen. Jede Epoche hat eine eigene Karte, eine eigene Farbpalette und eigene Gegnerstärke.
 * Epoche 2 ist in Meilenstein 4 ein Gerüst: neue Karte, neuer Look, stärkere Aliens –
 * ihre eigenen Mechaniken (Handel, Hofbefehle, neue Klassen) folgen in Meilenstein 5 und 7.
 *
 * Gegner-LP und Beute einer Epoche = Grundwerte × enemyHp bzw. × gold.
 */
import { EPOCH1_MAP, type MapDef } from './map';

export interface EpochPalette {
  /** Himmel in Bändern von oben nach unten. */
  sky: string[];
  stars: string;
  treeline: string;
  glow: string;
  ground: string;
  groundDark: string;
  wall: string;
  wallDark: string;
  /** Akzentfarbe der Oberfläche (ersetzt das Fackel-Gold). */
  accent: string;
  panel: string;
  /** Zweite Panel-Ebene (Karten, Knöpfe) und Linien. */
  panel2: string;
  line: string;
  background: string;
}

export interface EpochDef {
  id: number;
  map: MapDef;
  enemyHp: number;
  gold: number;
  palette: EpochPalette;
}

export const EPOCH2_MAP: MapDef = {
  ...EPOCH1_MAP,
  // Mehr Fels und Bach: Dampf braucht Wasser, Zahnräder brauchen Erz.
  terrain: ['rrggssgf', 'rrgsgggf', 'grrgsgff', 'grgggsgf', 'gsggggrr', 'ssgfggrr', 'gsgffgrg', 'ggsffggg'],
  keep: { x: 3, y: 3 },
  startUnlocked: [{ x: 2, y: 3 }],
};

export const EPOCH3_MAP: MapDef = {
  ...EPOCH1_MAP,
  // Viel Fels für Kupfer, weniger Wald: Elektro-Lehnswesen frisst Landschaft.
  terrain: ['rrrgggrr', 'rgggsggr', 'rggsggrr', 'ggsgggrg', 'gsggggrr', 'sgggfgrr', 'gsgffggg', 'ggsfgrrg'],
  keep: { x: 3, y: 3 },
  startUnlocked: [{ x: 2, y: 3 }],
};

export const EPOCH4_MAP: MapDef = {
  ...EPOCH1_MAP,
  // Wüste nach dem großen Leuchten: kaum Wald, viel Fels für Uran, ein dünner Bach.
  terrain: ['rrgggrrr', 'rggggrgr', 'gggsgggr', 'grggsggg', 'ggggsrgg', 'rgggsggr', 'rrgggsgr', 'grrggsrr'],
  keep: { x: 3, y: 3 },
  startUnlocked: [{ x: 2, y: 3 }],
};

export const EPOCHS: EpochDef[] = [
  {
    id: 1,
    map: EPOCH1_MAP,
    enemyHp: 1,
    gold: 1,
    palette: {
      sky: ['#0b0f1a', '#10162a', '#151d36', '#1b2542', '#212d4d'],
      stars: '#5d6b94',
      treeline: '#14261d',
      glow: '#5a2a2a',
      ground: '#1c2a1f',
      groundDark: '#16221a',
      wall: '#3b3f52',
      wallDark: '#30334a',
      accent: '#f2b33d',
      panel: '#1b2236',
      panel2: '#232c45',
      line: '#2f3a5a',
      background: '#121725',
    },
  },
  {
    id: 2,
    map: EPOCH2_MAP,
    enemyHp: 20,
    gold: 8,
    palette: {
      // Messing, Kupfer, Nebel: wärmerer Himmel, Dampfschwaden statt Sternenklarheit.
      sky: ['#1a1410', '#2a1e16', '#3a2a1c', '#4a3824', '#5a4630'],
      stars: '#8a7058',
      treeline: '#2a2218',
      glow: '#7a4a1a',
      ground: '#2e2a20',
      groundDark: '#262218',
      wall: '#5a4a3a',
      wallDark: '#4a3c2e',
      accent: '#d9a15a',
      panel: '#241e18',
      panel2: '#33291f',
      line: '#4e3f2e',
      background: '#17130f',
    },
  },
  {
    id: 3,
    map: EPOCH3_MAP,
    enemyHp: 140,
    gold: 56,
    palette: {
      // Warmes Glühbirnenlicht: dunkles Violett, darunter bernsteinfarbenes Leuchten.
      sky: ['#140f1c', '#1e1626', '#2a1d30', '#3a2834', '#4c3634'],
      stars: '#f2d48a',
      treeline: '#1c1820',
      glow: '#c8902a',
      ground: '#2a2420',
      groundDark: '#221d1a',
      wall: '#4a4048',
      wallDark: '#3c343c',
      accent: '#ffd36a',
      panel: '#1f1a24',
      panel2: '#2b2430',
      line: '#46394a',
      background: '#151118',
    },
  },
  {
    id: 4,
    map: EPOCH4_MAP,
    enemyHp: 3200,
    gold: 1280,
    palette: {
      // Gelbgrünes Glühen über Wüstensand, Bunkerbeton.
      sky: ['#11160c', '#1a2210', '#263014', '#384418', '#4c5a1c'],
      stars: '#d8f070',
      treeline: '#1a1e10',
      glow: '#a8d030',
      ground: '#3a3420',
      groundDark: '#2e2a1a',
      wall: '#5a5440',
      wallDark: '#4a4434',
      accent: '#c8f060',
      panel: '#1c1e14',
      panel2: '#282c1c',
      line: '#3e4428',
      background: '#14160e',
    },
  },
];

/** Epoche nach Nummer; jenseits der letzten gebauten Epoche bleibt es bei der letzten. */
export function epochDef(epoch: number): EpochDef {
  return EPOCHS[Math.min(epoch, EPOCHS.length) - 1] ?? EPOCHS[0]!;
}

/**
 * Zeitsplitter für einen Sprung:
 *   Splitter = 10 × Epoche + 3 × erreichte Belagerungsstufe + 1 je 5 gelernte Skill-Stufen
 * Belohnt, wie weit man in der Epoche gekommen ist – nicht nur, dass man gesprungen ist.
 */
export const SHARDS = { perEpoch: 10, perSiege: 3, perSkillRanks: 5 } as const;
