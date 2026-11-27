/**
 * Platzhalter-Pixelart für die Klassen und Gebäude aus Meilenstein 3.
 *
 * Gebäude entstehen aus einer gemeinsamen Vorlage (Dach, Wand, Tür) plus einem 5×5-Symbol –
 * so sind 13 Gebäude schnell und einheitlich unterscheidbar. Die echten Grafiken folgen in M6.
 */
import type { BuildingId } from '../data/buildings';
import type { ClassId } from '../data/units';
import type { PixelSprite } from './pixel';

const SKIN = '#e8b98a';
const DARK = '#2a1d1a';
const PANTS = '#5c4a3a';

export const M3_UNIT_SPRITES: Partial<Record<ClassId, PixelSprite>> = {
  archer: {
    rows: [
      '...hhhh...w.',
      '..hhhhhh..wq',
      '...ssss...wq',
      '...sksk...wq',
      '...ssss...wq',
      '..gggggg..wq',
      '.sggggggsswq',
      '..ggllgg..wq',
      '..gggggg..w.',
      '...pppp.....',
      '...p..p.....',
      '...p..p.....',
      '..kk..kk....',
    ],
    palette: {
      h: '#3f6b2f',
      s: SKIN,
      k: DARK,
      g: '#7fa04a',
      l: '#5a3a22',
      p: PANTS,
      w: '#8a5a33',
      q: '#d8dde8',
    },
  },
  warlock: {
    rows: [
      '.....hh.....',
      '....hhhh....',
      '...hhhhhh.y.',
      '..hhhhhhhhw.',
      '...ssss...w.',
      '...sysy...w.',
      '..rrrrrr..w.',
      '.srrrrrrssw.',
      '..rrrrrr..w.',
      '..rrrrrr..w.',
      '..rrrrrr....',
      '..rrrrrr....',
      '..kk..kk....',
    ],
    palette: { h: '#5a2f8a', y: '#ffe66d', s: SKIN, r: '#7a4ab0', w: '#5a3a22', k: DARK },
  },
  miner: {
    rows: [
      '...aaaa..mm.',
      '..aaayaa.mmw',
      '...ssss...w.',
      '...sksk...w.',
      '...dddd...w.',
      '..oooooo..w.',
      '.sooooooss..',
      '..ooddoo....',
      '..oooooo....',
      '...pppp.....',
      '...p..p.....',
      '...p..p.....',
      '..kk..kk....',
    ],
    palette: {
      a: '#8d90a6',
      y: '#ffe66d',
      s: SKIN,
      k: DARK,
      d: '#4a4040',
      o: '#c0703a',
      p: PANTS,
      m: '#c8ccd8',
      w: '#8a5a33',
    },
  },
  herbalist: {
    rows: [
      '....hhhh....',
      '.hhhhhhhhhh.',
      '...ssss.....',
      '...sksk..ll.',
      '...ssss.lll.',
      '..gggggg.l..',
      '.sggggggss..',
      '..gggggg....',
      '..gggggg....',
      '..gggggg....',
      '..gggggg....',
      '..kk..kk....',
    ],
    palette: { h: '#6b4a2a', s: SKIN, k: DARK, l: '#7ed37e', g: '#4f8a5a' },
  },
  monk: {
    rows: [
      '...bbbb.....',
      '..bbbbbb....',
      '..bssssb....',
      '..bsksb.....',
      '..bssssb....',
      '..bbbbbb.yy.',
      '.sbbbbbbsyy.',
      '..bbyybb....',
      '..bbbbbb....',
      '..bbbbbb....',
      '..bbbbbb....',
      '...kk.kk....',
    ],
    palette: { b: '#7a5a3a', s: SKIN, k: DARK, y: '#d9c27a' },
  },
};

/** 5×5-Symbole für die Gebäudevorlage ('E' = Symbolfarbe, '.' = Wand). */
const GLYPHS: Record<string, string[]> = {
  cross: ['..E..', 'EEEEE', '..E..', '..E..', '..E..'],
  pick: ['EEEEE', '..E..', '..E..', '..E..', '..E..'],
  leaf: ['..E..', '.EEE.', 'EEEEE', '.EEE.', '..E..'],
  crate: ['EEEEE', 'E.E.E', 'EEEEE', 'E.E.E', 'EEEEE'],
  saw: ['EEEEE', 'E...E', 'EEEEE', '.E.E.', '.....'],
  flame: ['..E..', '.EE..', '.EEE.', 'EEEEE', '.EEE.'],
  flask: ['.EEE.', '..E..', '.EEE.', 'EEEEE', 'EEEEE'],
  mug: ['EEEE.', 'E..EE', 'E..EE', 'EEEE.', 'EEEE.'],
  anvil: ['EEEEE', '.EEE.', '..E..', '.EEE.', 'EEEEE'],
  quill: ['....E', '...E.', '..E..', '.E...', 'E....'],
  bow: ['.EE..', 'E..E.', 'E...E', 'E..E.', '.EE..'],
  gear: ['.E.E.', 'EEEEE', '.E.E.', 'EEEEE', '.E.E.'],
  star: ['..E..', 'EEEEE', '.EEE.', '.E.E.', 'E...E'],
};

function building(roof: string, wall: string, emblem: string, glyph: keyof typeof GLYPHS): PixelSprite {
  const g = GLYPHS[glyph]!.map((r) => r.replace(/\./g, 'W'));
  return {
    rows: [
      '................',
      '......RRRR......',
      '....RRRRRRRR....',
      '..RRRRRRRRRRRR..',
      '...WWWWWWWWWW...',
      ...g.map((r) => `...WW${r}WWW...`),
      '...WWWWDDWWWW...',
      '...WWWWDDWWWW...',
      'dddddddddddddddd',
    ],
    palette: { R: roof, W: wall, E: emblem, D: DARK, d: '#3a3d50' },
  };
}

const STONE = '#8d90a6';
const TIMBER = '#8a5a33';

export const M3_BUILDING_SPRITES: Partial<Record<BuildingId, PixelSprite>> = {
  monastery: building('#7a5a3a', '#d8cfb8', '#f2b33d', 'cross'),
  mine: building('#5c5f78', STONE, '#c8ccd8', 'pick'),
  herbGarden: building('#4f8a5a', '#c9b88a', '#7ed37e', 'leaf'),
  storehouse: building('#8a5a33', '#b07a45', '#5a3a22', 'crate'),
  sawmill: building('#6b4a2a', TIMBER, '#e0b070', 'saw'),
  smelter: building('#5c3a3a', STONE, '#ff8a3d', 'flame'),
  alchemy: building('#4a3a6b', '#c9b88a', '#b07ae0', 'flask'),
  tavern: building('#b0433a', TIMBER, '#f2b33d', 'mug'),
  smithy: building('#3a3d50', STONE, '#d8e0ef', 'anvil'),
  scriptorium: building('#7a5a3a', '#e8dcc0', '#3b2a5a', 'quill'),
  archeryRange: building('#3f6b2f', TIMBER, '#a8c060', 'bow'),
  workshop: building('#2f4a4a', STONE, '#5fe0a0', 'gear'),
  mageTower: building('#5a2f8a', '#6b6f88', '#ffe66d', 'star'),
};

/** Gleiche Form, andere Farben – so entstehen die Elitegegner aus ihren normalen Verwandten. */
function recolor(base: PixelSprite, palette: Record<string, string>): PixelSprite {
  return { rows: base.rows, palette: { ...base.palette, ...palette } };
}

export const SCHILDLING_SPRITE: PixelSprite = {
  rows: [
    '..LL........',
    '.LLLL.bbbb..',
    'LLLLLbbbbbb.',
    'LLLLLbybbbb.',
    'LLLLLbbbbbb.',
    'LLLLLbbbbbb.',
    '.LLLLbbbbbb.',
    '..LL.bbbbbb.',
    '.....k.k.k..',
    '....k.k.k...',
  ],
  palette: { L: '#b8bccb', b: '#8fa0c0', y: '#ff5d5d', k: '#4a4e60' },
};

/** Elitegegner (werden in der Schlacht doppelt so groß gezeichnet). */
export function eliteSprites(base: {
  saugling: PixelSprite;
  blechkriecher: PixelSprite;
  brummdrohne: PixelSprite;
}): Record<'muttersauger' | 'blechkoloss' | 'brummkoenigin' | 'kommandant', PixelSprite> {
  return {
    muttersauger: recolor(base.saugling, { o: '#5fc8d0', q: '#2f7a88', t: '#4fa0a8', y: '#ff5d5d' }),
    blechkoloss: recolor(base.blechkriecher, { a: '#a0a6c0', d: '#565c78', y: '#ffe66d' }),
    brummkoenigin: recolor(base.brummdrohne, { p: '#f070c0', q: '#a03a80', r: '#f2b33d' }),
    kommandant: recolor(base.saugling, {
      o: '#ff6a5d',
      q: '#a03a3a',
      t: '#c04a4a',
      n: '#3a3d50',
      y: '#ffe66d',
    }),
  };
}
