/**
 * Kleine Pixel-Icons für die Oberfläche (Räume, Erzähler). 10×10-Raster, eine Symbolfarbe 'E'
 * und eine Akzentfarbe 'A'. Kontur und Licht setzt spriteCanvas() automatisch.
 * Etappe 2 ersetzt das durch die neue PNG-Pipeline; die Schnittstelle (PixelSprite) bleibt.
 */
import type { RoomId } from '../data/rooms';
import type { PixelSprite } from './pixel';

const icon = (rows: string[], e: string, a = '#f2b33d'): PixelSprite => ({ rows, palette: { E: e, A: a } });

export const ROOM_ICONS: Record<RoomId, PixelSprite> = {
  // Bauplatz: Hammer über einem Mauerstein
  bau: icon(
    [
      '...AAAA...',
      '...AAAA...',
      '....EE....',
      '....EE....',
      '....EE....',
      '..........',
      'EEEEEEEEEE',
      'E...E....E',
      'EEEEEEEEEE',
      '..E....E..',
    ],
    '#b8bccb',
  ),
  // Kaserne: Helm
  kaserne: icon(
    [
      '....AA....',
      '..EEEEEE..',
      '.EEEEEEEE.',
      '.EEEEEEEE.',
      '.EE....EE.',
      '.EE.EE.EE.',
      '.EE.EE.EE.',
      '.EEEEEEEE.',
      '..EE..EE..',
      '..........',
    ],
    '#b8bccb',
    '#d9483b',
  ),
  // Übungsplatz: Zielscheibe mit Pfeil
  uebung: icon(
    [
      '..EEEEEE..',
      '.EAAAAAAE.',
      'EAEEEEEEAE',
      'EAEAAAAEAE',
      'EAEAEEAEAE',
      'EAEAEEAEAE',
      'EAEAAAAEAE',
      'EAEEEEEEAE',
      '.EAAAAAAE.',
      '..EEEEEE..',
    ],
    '#e8e2c8',
    '#d9483b',
  ),
  // Bibliothek: offenes Buch
  bibliothek: icon(
    [
      '..........',
      '.EEEE.EEEE',
      'EAAAAEAAAE',
      'EAEEAEAEEA',
      'EAAAAEAAAE',
      'EAEEAEAEEA',
      'EAAAAEAAAE',
      'EEEEEEEEEE',
      '....EE....',
      '..........',
    ],
    '#7a4a24',
    '#f3ead7',
  ),
  // Werkstatt: Zahnrad
  werkstatt: icon(
    [
      '....EE....',
      '.E.EEEE.E.',
      '..EEEEEE..',
      '.EEEAAEEE.',
      'EEEA..AEEE',
      'EEEA..AEEE',
      '.EEEAAEEE.',
      '..EEEEEE..',
      '.E.EEEE.E.',
      '....EE....',
    ],
    '#9aa3b8',
  ),
  // Thronsaal: Krone
  thronsaal: icon(
    [
      '..........',
      'E...EE...E',
      'EE..EE..EE',
      'EEE.EE.EEE',
      'EEEEEEEEEE',
      'EAEEAAEEAE',
      'EEEEEEEEEE',
      'EEEEEEEEEE',
      '..........',
      '..........',
    ],
    '#f2b33d',
    '#d9483b',
  ),
  // Markt: Waage
  markt: icon(
    [
      '....EE....',
      'EEEEEEEEEE',
      '.E..EE..E.',
      'E.E.EE.E.E',
      'AAA.EE.AAA',
      '....EE....',
      '....EE....',
      '..EEEEEE..',
      '..........',
      '..........',
    ],
    '#c9cfd8',
    '#f2b33d',
  ),
  // Schatzkammer: Truhe
  schatzkammer: icon(
    [
      '..........',
      '.EEEEEEEE.',
      'EAAAAAAAAE',
      'EEEEEEEEEE',
      'EEEEAAEEEE',
      'EEEEAAEEEE',
      'EEEEEEEEEE',
      'EAAAAAAAAE',
      'EEEEEEEEEE',
      '..........',
    ],
    '#8a5a2a',
    '#f2b33d',
  ),
  // Chronik-Turm: Sanduhr
  chronik: icon(
    [
      'EEEEEEEEEE',
      '.E......E.',
      '..EAAAAE..',
      '...EAAE...',
      '....EE....',
      '....EE....',
      '...E..E...',
      '..E.AA.E..',
      '.EAAAAAAE.',
      'EEEEEEEEEE',
    ],
    '#c9cfd8',
    '#e8c070',
  ),
  // Archiv: Schriftrolle
  archiv: icon(
    [
      '.EEEEEEEE.',
      'EAAAAAAAAE',
      '.EAAAAAAE.',
      '.EAEEEEAE.',
      '.EAAAAAAE.',
      '.EAEEEAAE.',
      '.EAAAAAAE.',
      '.EAEEEEAE.',
      'EAAAAAAAAE',
      '.EEEEEEEE.',
    ],
    '#8a6a3a',
    '#f3ead7',
  ),
};

/** Der Erzähler: ein kleiner gekrönter Geist mit Monokel – albern, aber mit Biss. */
export const NARRATOR_SPRITE: PixelSprite = {
  rows: [
    '.....y..yy..y...',
    '.....yyyyyyyy...',
    '....wwwwwwwwww..',
    '...wwwwwwwwwwww.',
    '..wwwwwwwwwwwwww',
    '..wwwkkwwwmmmwww',
    '..wwwkkwwwmkmwww',
    '..wwwwwwwwmmmwww',
    '..wwwwwkkkkwwwww',
    '..wwwwwwwwwwwwww',
    '..ggwwwwwwwwwwgg',
    '...gwwwwwwwwwwg.',
    '...wwww..wwww...',
    '....ww....ww....',
  ],
  palette: { y: '#f2b33d', w: '#e9eef7', g: '#cfd6e6', k: '#2b2f3f', m: '#f2b33d' },
};
