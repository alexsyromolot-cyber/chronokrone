/**
 * Aliens der Epoche 1, 32×32, Blick nach links (sie laufen auf die Mauer zu).
 * Gezeichnet wird mit Blick nach rechts und am Ende gespiegelt – so liest sich der Code wie die Figuren.
 * Albern, aber mit Biss: Staubsauger-Tintenfische, Blechkrabben, brummende Drohnen.
 */
import { Pix, mix, ramp } from './lib.mjs';

const EYE_WHITE = '#f4f6ff';
const PUPIL = '#141022';

function eye(p, x, y, size = 2, look = 1) {
  p.rect(x, y, size + 1, size + 1, EYE_WHITE);
  p.rect(x + look, y + 1, size - 1 || 1, size - 1 || 1, PUPIL);
  p.set(x, y, '#ffffff');
}

/** Saugling: Kuppelkopf mit Saugrüssel und vier Tentakeln. f = Bildnummer für Wackeln. */
function saugling(f, colors = {}) {
  const body = ramp(colors.body ?? '#6ee0c8');
  const metal = ramp(colors.metal ?? '#a3a9ba');
  const p = new Pix(32, 32);
  const bob = [0, -1, -1, 0][f % 4];
  // Tentakel: wellen sich gegeneinander.
  for (let i = 0; i < 4; i++) {
    const x0 = 9 + i * 4;
    const sway = Math.round(Math.sin(f * 1.6 + i * 1.3) * 1.5);
    for (let j = 0; j < 8; j++) p.set(x0 + Math.round((sway * j) / 7), 21 + bob + j, body[j < 3 ? 2 : 1]);
    p.set(x0 + sway, 29 + bob, body[3]);
  }
  p.ball(16, 14 + bob, 9, 8, body);
  // Glaskuppel oben.
  p.ball(16, 9 + bob, 5, 3.5, ramp(colors.glass ?? '#bdf6ea'));
  p.set(14, 7 + bob, '#ffffff');
  // Saugrüssel nach vorn (rechts, wird gespiegelt → links).
  p.cyl(24, 15 + bob, 4, 3, metal);
  p.rect(28, 14 + bob, 2, 5, metal[1]);
  p.rect(29, 15 + bob, 1, 3, PUPIL);
  eye(p, 17, 11 + bob, 2, 1);
  eye(p, 21, 11 + bob, 2, 1);
  if (colors.eye) {
    p.set(18, 12 + bob, colors.eye);
    p.set(22, 12 + bob, colors.eye);
  }
  // Antenne mit Lämpchen.
  p.line(12, 6 + bob, 10, 2 + bob, metal[2]);
  p.set(10, 1 + bob, f % 2 ? '#ffd34d' : '#ff7a6b');
  if (colors.hat) {
    // Kommandant: Schirmmütze.
    const h = ramp(colors.hat);
    p.cyl(11, 4 + bob, 10, 3, h);
    p.rect(19, 7 + bob, 5, 1, h[1]);
    p.set(14, 5 + bob, '#ffe66d');
  }
  return p;
}

/** Blechkriecher: flache Blechkrabbe auf sechs Beinen mit rotem Visier. */
function blechkriecher(f, colors = {}) {
  const shell = ramp(colors.body ?? '#c6c9d8');
  const p = new Pix(32, 32);
  const step = f % 2;
  for (let i = 0; i < 3; i++) {
    const x = 9 + i * 6;
    const lift = (i + step) % 2;
    p.line(x, 22, x - 2, 28 - lift, shell[1]);
    p.line(x + 3, 22, x + 5, 28 - (1 - lift), shell[1]);
    p.set(x - 2, 29 - lift, shell[0]);
  }
  p.ball(16, 19, 12, 5.5, shell);
  // Nieten und Panzerplatten.
  for (const x of [8, 13, 18, 23]) p.set(x, 17, shell[4]);
  p.rect(6, 21, 21, 1, shell[1]);
  p.rect(22, 18, 6, 2, colors.visor ?? '#ff5d5d');
  p.set(27, 18, '#ffd0c8');
  // Zange vorn.
  p.line(28, 20, 31, 17, shell[2]);
  p.line(28, 21, 31, 22, shell[2]);
  if (colors.crown) p.rect(12, 12, 8, 2, colors.crown);
  return p;
}

/** Brummdrohne: runder Leib, ein großes Auge, schwirrende Flügel, Stachel. */
function brummdrohne(f, colors = {}) {
  const body = ramp(colors.body ?? '#e07fb0');
  const wing = colors.wing ?? '#e8f0ff';
  const p = new Pix(32, 32);
  const up = f % 2 === 0;
  const bob = [0, -1, -2, -1][f % 4];
  // Flügel: abwechselnd hoch und flach – das Brummen sieht man.
  if (up) {
    p.poly(
      [
        [13, 9 + bob],
        [8, 1 + bob],
        [5, 3 + bob],
        [11, 11 + bob],
      ],
      mix(wing, '#9ab0d0', 0.2),
    );
    p.poly(
      [
        [17, 9 + bob],
        [20, 1 + bob],
        [24, 2 + bob],
        [19, 11 + bob],
      ],
      wing,
    );
  } else {
    p.poly(
      [
        [13, 11 + bob],
        [4, 8 + bob],
        [4, 11 + bob],
        [11, 13 + bob],
      ],
      mix(wing, '#9ab0d0', 0.2),
    );
    p.poly(
      [
        [18, 11 + bob],
        [27, 8 + bob],
        [27, 11 + bob],
        [20, 13 + bob],
      ],
      wing,
    );
  }
  p.ball(16, 16 + bob, 8, 7, body);
  // Streifen wie eine Hummel, aber pink.
  p.rect(10, 17 + bob, 12, 1, body[1]);
  p.rect(10, 20 + bob, 11, 1, body[1]);
  eye(p, 18, 12 + bob, 3, 2);
  if (colors.eye) p.rect(20, 14 + bob, 2, 2, colors.eye);
  p.poly(
    [
      [9, 19 + bob],
      [5, 22 + bob],
      [9, 21 + bob],
    ],
    '#2a1830',
  );
  if (colors.crown) {
    const c = ramp(colors.crown);
    p.rect(12, 7 + bob, 8, 2, c[2]);
    for (const x of [12, 15, 19]) p.set(x, 6 + bob, c[3]);
  }
  return p;
}

/** Schildling: kleiner Tintenfisch hinter einem Topfdeckel. Nahkämpfer verzweifeln. */
function schildling(f) {
  const p = saugling(f, { body: '#8fa0c0', glass: '#c8d8f0' });
  const lid = ramp('#b8bccb');
  const bob = [0, -1, -1, 0][f % 4];
  p.ball(25, 17 + bob, 5, 9, lid);
  p.rect(28, 16 + bob, 2, 2, lid[0]);
  p.set(23, 11 + bob, lid[4]);
  return p;
}

const BUILDERS = {
  saugling: (f) => saugling(f),
  blechkriecher: (f) => blechkriecher(f),
  brummdrohne: (f) => brummdrohne(f),
  schildling: (f) => schildling(f),
  // Elitegegner: gleiche Form, eigene Farben und ein Erkennungszeichen.
  muttersauger: (f) => saugling(f, { body: '#3fa8b8', glass: '#9fe8f0', eye: '#ff5d5d' }),
  blechkoloss: (f) => blechkriecher(f, { body: '#c8a860', visor: '#ffe66d', crown: '#ffe66d' }),
  brummkoenigin: (f) => brummdrohne(f, { body: '#f070c0', crown: '#f2b33d', eye: '#ff5d5d' }),
  kommandant: (f) => saugling(f, { body: '#ff6a5d', glass: '#ffc0b8', hat: '#3a3d50', eye: '#ffe66d' }),
};

export const ALIEN_IDS = Object.keys(BUILDERS);

/** Bilder je Animation: idle (Schweben/Wackeln), walk (Laufen), hit (Treffer). */
export function alienFrames(id) {
  const build = BUILDERS[id];
  const finish = (p) => p.outline().flipped();
  return {
    idle: [0, 1, 2, 3].map((f) => finish(build(f))),
    walk: [0, 1, 2, 3].map((f) => finish(build(f + 1))),
    hit: [finish(build(0)).flashed(0.6)],
  };
}
