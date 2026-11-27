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
  stoker: {
    rows: [
      '...kkkk.....',
      '..kkkkkk....',
      '...ssss..ww.',
      '...sksk..wwm',
      '...ssss...w.',
      '..aaaaaa..w.',
      '.saaaaaass..',
      '..aaddaa....',
      '..aaaaaa....',
      '...pppp.....',
      '...p..p.....',
      '..kk..kk....',
    ],
    palette: { k: '#2a2a30', s: SKIN, a: '#7a5a3a', d: '#3a3a40', p: PANTS, w: '#8a5a33', m: '#6a6a72' },
  },
  steamKnight: {
    rows: [
      '...cc.......',
      '..aaaa..g...',
      '.aaaaaa.gg..',
      '.akyyka..m..',
      '.aaaaaa..m..',
      'baaaaaaab.m.',
      'baaaaaaabmm.',
      '.aagga....m.',
      '.aaaaaa.....',
      '..aa..aa....',
      '..aa..aa....',
      '.kkk..kkk...',
    ],
    palette: {
      c: '#d8dde8',
      a: '#c08a50',
      k: '#3a2a1a',
      y: '#ffe66d',
      g: '#8a5a2a',
      b: '#6a4a2a',
      m: '#b8bccb',
    },
  },
  lineman: {
    rows: [
      '...yyyy.....',
      '..yyyyyy....',
      '...ssss.....',
      '...sksk..c..',
      '...ssss..c..',
      '..aaaaaa.c..',
      '.saaaaaasc..',
      '..aabbaa....',
      '..aaaaaa....',
      '...pppp.....',
      '...p..p.....',
      '..kk..kk....',
    ],
    palette: { y: '#ffd36a', s: SKIN, k: '#2a2a30', a: '#4a6a8a', b: '#3a3a40', p: PANTS, c: '#d9774a' },
  },
  teslaLancer: {
    rows: [
      '..........z.',
      '...hhhh..zz.',
      '..hhhhhh.z..',
      '..hkyyk..l..',
      '..hhhhhh.l..',
      '.raaaaaar.l.',
      '.raaaaaarll.',
      '..aaggaa..l.',
      '..aaaaaa....',
      '..aa..aa....',
      '..aa..aa....',
      '.kkk..kkk...',
    ],
    palette: {
      z: '#9ad8ff',
      h: '#5a5a7a',
      k: '#2a2a30',
      y: '#9ad8ff',
      a: '#3a3a6a',
      r: '#2a2a4a',
      g: '#ffd36a',
      l: '#c0c0d0',
    },
  },
  prospector: {
    rows: [
      '...gggg.....',
      '..gggggg....',
      '...ssss.....',
      '...yyyy..p..',
      '...ssss..p..',
      '..aaaaaa.p..',
      '.saaaaaasp..',
      '..aaddaa....',
      '..aaaaaa....',
      '...aaaa.....',
      '...a..a.....',
      '..kk..kk....',
    ],
    palette: { g: '#c8b040', s: SKIN, y: '#9be04a', a: '#c8b040', d: '#3a3a30', p: '#8a8a8a', k: '#2a2a30' },
  },
  rayPaladin: {
    rows: [
      '.........z..',
      '...hhhh..z..',
      '..hhhhhh.z..',
      '..hyyyyh.z..',
      '..hhhhhh.z..',
      '.waaaaaaw...',
      '.waaxaaaw...',
      '..axxxaa....',
      '..aaxaaa....',
      '..aa..aa....',
      '..aa..aa....',
      '.kkk..kkk...',
    ],
    palette: {
      z: '#c8f060',
      h: '#b8bccb',
      y: '#c8f060',
      a: '#e0e0d0',
      w: '#9a9a88',
      x: '#c03a2a',
      k: '#2a2a30',
    },
  },
  starPilgrim: {
    rows: [
      '....pp......',
      '...pppp.....',
      '..pssssp....',
      '..psyysp.z..',
      '...ssss..z..',
      '..rrrrrr.z..',
      '.srrrrrrsz..',
      '..rrwwrr....',
      '..rrrrrr....',
      '..rrrrrr....',
      '..rr..rr....',
      '..kk..kk....',
    ],
    palette: { p: '#c09aff', s: SKIN, y: '#9ad8ff', r: '#5a3a8a', w: '#ff6ad5', z: '#ffe66d', k: '#2a2a30' },
  },
  voidTemplar: {
    rows: [
      '..........l.',
      '...gggg...l.',
      '..gccccg..l.',
      '..gcyycg..l.',
      '..gccccg..l.',
      '.waaaaaaw.l.',
      '.waaxxaaw...',
      '..axxxxa....',
      '..aaxxaa....',
      '..aa..aa....',
      '..aa..aa....',
      '.kkk..kkk...',
    ],
    palette: {
      l: '#ff6ad5',
      g: '#d8dcf0',
      c: '#3a2e5a',
      y: '#9ad8ff',
      a: '#e8e8f8',
      w: '#9a9ab8',
      x: '#ff6ad5',
      k: '#2a2a40',
    },
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
  cross: ['..E..', 'EEEEE', '..E..', '.EEE.', '..E..'],
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
  coin: ['.EEE.', 'E.E.E', 'EEEEE', 'E.E.E', '.EEE.'],
  coal: ['..E..', '.EEE.', 'EEEEE', 'EEEEE', '.EEE.'],
  bolt: ['..EE.', '.EE..', 'EEEEE', '..EE.', '.EE..'],
  coil: ['EEEEE', '....E', 'EEEEE', 'E....', 'EEEEE'],
  pylon: ['E...E', '.E.E.', '..E..', '.E.E.', 'E...E'],
  atom: ['E...E', '.EEE.', 'EE.EE', '.EEE.', 'E...E'],
  rod: ['.E.E.', '.E.E.', '.E.E.', '.E.E.', 'EEEEE'],
  drop: ['..E..', '.EEE.', 'EEEEE', 'EEEEE', '.EEE.'],
  shield: ['EEEEE', 'E.E.E', 'EEEEE', '.EEE.', '..E..'],
  plate: ['EEEEE', 'E...E', 'E...E', 'E...E', 'EEEEE'],
  sparkle: ['..E..', '.EEE.', 'EEEEE', '.EEE.', 'E...E'],
  prism: ['..E..', '.E.E.', 'E...E', 'EEEEE', '.....'],
  rose: ['.EEE.', 'EE.EE', 'E.E.E', 'EE.EE', '.EEE.'],
  lance: ['....E', '...E.', 'EEE..', '.E...', 'E....'],
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
  coalMine: building('#3a3a40', '#6a6a72', '#2a2a30', 'coal'),
  gearWorks: building('#8a5a2a', '#a08060', '#d9a15a', 'gear'),
  market: building('#b0433a', '#d8c09a', '#f2b33d', 'coin'),
  steamFoundry: building('#5a4a3a', '#8d7a6a', '#ff8a3d', 'anvil'),
  copperMine: building('#8a4a2a', '#a07a62', '#d9774a', 'pick'),
  wireWorks: building('#6a5a4a', '#b09a80', '#e8c070', 'coil'),
  powerPlant: building('#3a3a48', '#7a7a88', '#ffd36a', 'bolt'),
  pylon: building('#4a4a52', '#9a9aa2', '#e8c070', 'pylon'),
  teslaTower: building('#2a2a5a', '#6a6a9a', '#9ad8ff', 'bolt'),
  uraniumMine: building('#4a5a2a', '#8a8a6a', '#9be04a', 'pick'),
  rodFactory: building('#5a5a4a', '#a0a088', '#c8f060', 'rod'),
  reactor: building('#3a4a2a', '#8a9a7a', '#d8f070', 'atom'),
  coolingTower: building('#6a7a8a', '#b0b8c0', '#9ad8ff', 'drop'),
  bunker: building('#4a4a3a', '#7a7a66', '#c8f060', 'shield'),
  hullPlate: building('#3a3460', '#6a6490', '#9ad8ff', 'plate'),
  stardustScoop: building('#2a2450', '#5a5490', '#c09aff', 'sparkle'),
  glassFurnace: building('#4a2450', '#8a5490', '#ff6ad5', 'prism'),
  rosette: building('#1a1040', '#3a2e6a', '#ff6ad5', 'rose'),
  hangar: building('#2a2a50', '#6a6a9a', '#ff6ad5', 'lance'),
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

/** Das Mutterschiff: eine Untertasse mit Kirchenfenster-Kuppel (in der Schlacht dreifach groß). */
export const MOTHERSHIP_SPRITE: PixelSprite = {
  rows: [
    '....cccc....',
    '...cpycpc...',
    '..cyppcyyc..',
    '.hhhhhhhhhh.',
    'hhlhhlhhlhhh',
    'hhhhhhhhhhhh',
    '.dddddddddd.',
    '..r..r..r...',
  ],
  palette: {
    c: '#9ad8ff',
    p: '#ff6ad5',
    y: '#ffe66d',
    h: '#8a8ab8',
    l: '#ff5d5d',
    d: '#4a4a70',
    r: '#ff6ad5',
  },
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
