/**
 * Platzhalter-Pixelart für den Vertical Slice (Palette Epoche 1).
 * Figuren sind hier 12–16 Pixel groß; die finalen ~32×32-Sprites kommen in Meilenstein 6.
 * Jede Klasse hat eine eigene Silhouette (Hut, Helm, Kapuze) und Grundfarbe.
 */
import type { BuildingId } from '../data/buildings';
import type { EnemyId } from '../data/enemies';
import type { TerrainId } from '../data/map';
import type { ClassId } from '../data/units';
import type { PixelSprite } from './pixel';
import {
  eliteSprites,
  M3_BUILDING_SPRITES,
  M3_UNIT_SPRITES,
  MOTHERSHIP_SPRITE,
  SCHILDLING_SPRITE,
} from './sprites-m3';

const SKIN = '#e8b98a';
const DARK = '#2a1d1a';
const STEEL = '#c8ccd8';
const WOOD = '#a07a4a';

const BASE_UNIT_SPRITES = {
  peasant: {
    rows: [
      '...hhhh..m.m',
      '..hhhhhh.mmm',
      '...ssss...w.',
      '...sksk...w.',
      '...ssss...w.',
      '..bbbbbb..w.',
      '.sbbbbbbssw.',
      '..bbllbb..w.',
      '..bbbbbb..w.',
      '...pppp...w.',
      '...p..p...w.',
      '...p..p.....',
      '..kk..kk....',
    ],
    palette: { h: '#d9b65a', s: SKIN, k: DARK, b: '#8a5a33', l: '#5a3a22', p: '#5c4a3a', w: WOOD, m: STEEL },
  },
  knight: {
    rows: [
      '....rr......',
      '...aaaa.....',
      '..aaaaaa..m.',
      '..akkkka..m.',
      '..aaaaaa..m.',
      '.caaaaaaa.m.',
      'ccaaaaaaaagg',
      'cc.aaaaaa.g.',
      'c..aaaaaa...',
      '...aa..aa...',
      '...aa..aa...',
      '..kkk..kkk..',
    ],
    palette: { r: '#c0392b', a: '#b8c2d6', k: DARK, c: '#3b5ba5', m: '#e0e6f0', g: '#d9b65a' },
  },
  woodcutter: {
    rows: [
      '...hhhh.....',
      '..hhhhhh.mm.',
      '...ssss..mmw',
      '...sksk...w.',
      '...dddd...w.',
      '..rrrrrr..w.',
      '.srrrrrrssw.',
      '..rrllrr....',
      '..rrrrrr....',
      '...pppp.....',
      '...p..p.....',
      '..kk..kk....',
    ],
    palette: {
      h: '#4f7a3a',
      s: SKIN,
      k: DARK,
      d: '#8a4b2a',
      r: '#b0433a',
      l: '#5a3a22',
      p: '#5c4a3a',
      m: STEEL,
      w: WOOD,
    },
  },
};

const BASE_ENEMY_SPRITES = {
  saugling: {
    rows: [
      '....oooooo....',
      '..oooooooooo..',
      '.ooyeooooyeoo.',
      'nnoooooooooooo',
      'nnoooooooooooq',
      '.qoooooooooqq.',
      '..qqqqqqqqqq..',
      '..t..t..t..t..',
      '.t...t..t...t.',
      '.t..t....t..t.',
    ],
    palette: { o: '#9ad1d4', q: '#5f9ea8', e: '#1a2233', y: '#ffe66d', n: '#6c7a89', t: '#7fb7bd' },
  },
  blechkriecher: {
    rows: [
      '....aaaaaaaa....',
      '..aayaaaaaaaaa..',
      '.aaaaaaaaaaaaaa.',
      'ddddddddddddddd.',
      '.k.k.k.k.k.k.k..',
      'k.k.k.k.k.k.k.k.',
    ],
    palette: { a: '#c6c9d8', d: '#7a7f95', y: '#ff5d5d', k: '#4a4e60' },
  },
  brummdrohne: {
    rows: [
      'rrrrr....rrrrr',
      '..r........r..',
      '..r.pppppp.r..',
      '...pppppppp...',
      '..ppyeppyepp..',
      '..pppppppppp..',
      '...qqqqqqqq...',
      '.....q..q.....',
      '....q....q....',
    ],
    palette: { r: '#d8dde8', p: '#e07fb0', q: '#9c4d7a', e: '#1a2233', y: '#ffe66d' },
  },
};

const STONE = '#8d90a6';
const STONE_DARK = '#5c5f78';

const BASE_BUILDING_SPRITES = {
  keep: {
    rows: [
      '.......kff......',
      '.......kfff.....',
      '.......k........',
      '......rrr.......',
      '.....rrrrr......',
      '....rrrrrrr.....',
      '....aaaaaaa.....',
      '....aayayaa.....',
      'a.a.aaaaaaa.a.a.',
      'aaaaaaaaaaaaaaa.',
      'aaaayaaaaayaaaa.',
      'aaaaaaaaaaaaaaa.',
      'aaaaaaddaaaaaaa.',
      'aaaaaaddaaaaaaa.',
      'dddddddddddddddd',
    ],
    palette: { k: DARK, f: '#f2b33d', r: '#b0433a', a: STONE, y: '#f2b33d', d: STONE_DARK },
  },
  lumberHut: {
    rows: [
      '................',
      '......rrrr......',
      '....rrrrrrrr....',
      '..rrrrrrrrrrrr..',
      '...wwwwwwwwww...',
      '...wdwwwwwwdw...',
      '...wwwwddwwww...',
      '...wwwwddwwww...',
      '...wwwwddwwww..m',
      '...wwwwddwwww.mm',
      '...wwwwddwwww..w',
      'llllllllllllllll',
      '.ll.ll.ll.ll.ll.',
    ],
    palette: { r: '#4f7a3a', w: '#8a5a33', d: '#5a3a22', l: '#b07a45', m: STEEL },
  },
  quarry: {
    rows: [
      '................',
      '...........mmm..',
      '............w...',
      '.....lll.....w..',
      '....laaal.....w.',
      '...laaaaad......',
      '..laaaaaaad.....',
      '.laaadaaaaad....',
      'laaaaaadaaaad.ll',
      'aaaaaaaaaaaaalaa',
      'aadaaaaaadaaaaad',
      'dddddddddddddddd',
    ],
    palette: { a: '#a3a7b8', d: '#6c7086', l: '#d0d3de', m: STEEL, w: WOOD },
  },
  barracks: {
    rows: [
      '..k..........k..',
      '..kbb........kbb',
      '..kb.........kb.',
      'a.a.a.a.a.a.a.a.',
      'aaaaaaaaaaaaaaaa',
      'aaaaaaaaaaaaaaaa',
      'aabbbaaaaaabbbaa',
      'aabybaaaaaabybaa',
      'aabbbaakkaabbbaa',
      'aaaaaaakkaaaaaaa',
      'aaaaaaakkaaaaaaa',
      'dddddddddddddddd',
    ],
    palette: { k: DARK, b: '#3b5ba5', y: '#f2b33d', a: STONE, d: STONE_DARK },
  },
};

/** Gelände-Deko für leere Felder (Hintergrundfarbe kommt aus CSS). */
export const TERRAIN_SPRITES: Partial<Record<TerrainId, PixelSprite>> = {
  forest: {
    rows: [
      '...h........h...',
      '..hgh......hgh..',
      '.hgggh....hgggh.',
      'hgggggh..hgggggh',
      '...w........w...',
      '......h.........',
      '.....hgh........',
      '....hgggh.......',
      '...hgggggh......',
      '..hgggggggh.....',
      '......w.........',
    ],
    palette: { h: '#4f7a3a', g: '#2f5a2a', w: '#5a3a22' },
  },
  rock: {
    rows: [
      '..........ll....',
      '.........laad...',
      '...ll....aaaad..',
      '..laad....ddd...',
      '..aaad..........',
      '...dd...........',
    ],
    palette: { l: '#d0d3de', a: '#a3a7b8', d: '#6c7086' },
  },
  stream: {
    rows: [
      '................',
      '..bb......bb....',
      '.b..b....b..b...',
      '......bb......bb',
      '.....b..b....b..',
    ],
    palette: { b: '#7fc8e8' },
  },
};

export const UNIT_SPRITES = { ...BASE_UNIT_SPRITES, ...M3_UNIT_SPRITES } as Record<ClassId, PixelSprite>;
export const BUILDING_SPRITES = { ...BASE_BUILDING_SPRITES, ...M3_BUILDING_SPRITES } as Record<
  BuildingId,
  PixelSprite
>;
export const ENEMY_SPRITES = {
  ...BASE_ENEMY_SPRITES,
  schildling: SCHILDLING_SPRITE,
  ...eliteSprites(BASE_ENEMY_SPRITES),
  mutterschiff: MOTHERSHIP_SPRITE,
} as Record<EnemyId, PixelSprite>;
