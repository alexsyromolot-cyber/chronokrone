/**
 * Isometrischer Bauplatz: Gelände-Rauten (64×32 + 8 px Seitenkante) und Gebäude.
 *
 * Bildformate:
 *   Gelände 64×40 – Rautenmitte (Boden) bei (32, 16).
 *   Gebäude/Deko 64×96 – Bodenmitte der Raute bei (32, 80); darüber ist Platz für Höhe.
 * Licht von oben links: linke Wand hell, rechte Wand im Schatten, Dächer entsprechend.
 * Je Gebäude drei Ausbaustufen (Level-Meilensteine): 0 schlicht, 1 mit Fahne, 2 zusätzlich
 * mit Goldbeschlag am Dach.
 */
import { Pix, mix, ramp } from './lib.mjs';

const A = 32; // halbe Rautenbreite
const B = 16; // halbe Rautenhöhe
const GROUND = { x: 32, y: 80 };

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Linke Wand, rechte Wand und Deckel eines Quaders mit Bodenmitte (cx, cy). */
function block(p, cx, cy, a, b, h, wall, top = null) {
  p.poly(
    [
      [cx - a, cy],
      [cx, cy + b],
      [cx, cy + b - h],
      [cx - a, cy - h],
    ],
    wall[3],
  );
  p.poly(
    [
      [cx, cy + b],
      [cx + a, cy],
      [cx + a, cy - h],
      [cx, cy + b - h],
    ],
    wall[1],
  );
  if (top)
    p.poly(
      [
        [cx - a, cy - h],
        [cx, cy - b - h],
        [cx + a, cy - h],
        [cx, cy + b - h],
      ],
      top,
    );
  // Kante vorn im Licht.
  p.line(cx, cy + b, cx, cy + b - h, wall[2]);
}

/** Mauerfugen auf beiden Wänden (Stein) bzw. Bretterkanten (Holz). */
function courses(p, cx, cy, a, b, h, wall, wood = false) {
  if (wood) {
    for (let u = 0.2; u < 1; u += 0.2) {
      p.line(cx - a + u * a, cy + u * b, cx - a + u * a, cy + u * b - h + 1, wall[2]);
      p.line(cx + u * a, cy + b - u * b, cx + u * a, cy + b - u * b - h + 1, wall[0]);
    }
    return;
  }
  for (let v = 4; v < h; v += 4) {
    p.line(cx - a, cy - v, cx, cy + b - v, wall[2]);
    p.line(cx, cy + b - v, cx + a, cy - v, wall[0]);
  }
}

/** Punkt auf der linken Wand: u entlang der Unterkante (0 = links hinten, 1 = vorn), v = Höhe. */
const onLeft = (cx, cy, a, b, u, v) => [cx - a + u * a, cy + u * b - v];
const onRight = (cx, cy, a, b, u, v) => [cx + u * a, cy + b - u * b - v];

/** Fenster (2×3, schräg wie die Wand) mit warmem Licht. */
function windowAt(p, [x, y], col = '#ffd27a', right = false) {
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 3; j++)
      p.set(x + i, y - j + (right ? -i * 0.5 : i * 0.5), j === 2 ? mix(col, '#ffffff', 0.4) : col);
}

function doorAt(p, [x, y], right = false) {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 6; j++)
      p.set(x + i, y - j + (right ? -i * 0.5 : i * 0.5), j > 4 ? '#3a2410' : '#5a3a22');
}

/** Walmdach (Pyramide) über einem Quader: Überstand o, Firsthöhe rh. */
function hipRoof(p, cx, cy, a, b, h, rh, roof, o = 3) {
  const top = cy - h;
  const L = [cx - a - o, top];
  const F = [cx, top + b + o / 2];
  const R = [cx + a + o, top];
  const K = [cx, top - b - o / 2];
  const apex = [cx, top - rh];
  p.poly([K, L, apex], roof[1]);
  p.poly([K, R, apex], roof[0]);
  p.poly([L, F, apex], roof[3]);
  p.poly([F, R, apex], roof[1]);
  const lerp = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
  const rows = Math.max(2, Math.round(rh / 3));
  for (let k = 1; k < rows; k++) {
    const t = k / rows;
    const [a1, b1] = [lerp(L, apex, t), lerp(F, apex, t)];
    const [a2, b2] = [lerp(F, apex, t), lerp(R, apex, t)];
    p.line(a1[0], a1[1], b1[0], b1[1], roof[2]);
    p.line(a2[0], a2[1], b2[0], b2[1], roof[0]);
  }
  p.line(apex[0], apex[1], F[0], F[1], roof[4]);
  p.line(L[0], L[1], F[0], F[1], roof[2]);
  // Traufe als dunkle Kante – Dächer heben sich klar von den Wänden ab.
  p.line(F[0], F[1] + 1, R[0], R[1] + 1, roof[0]);
  p.line(L[0], L[1] + 1, F[0], F[1] + 1, roof[1]);
  return apex;
}

/** Zinnen auf einem flachen Dach. */
function battlements(p, cx, cy, a, b, h, wall) {
  const top = cy - h;
  for (let u = 0; u <= 1.001; u += 0.25) {
    const [x, y] = [cx - a + u * a, top + u * b];
    p.rect(Math.round(x) - 1, Math.round(y) - 4, 3, 4, wall[3]);
    const [x2, y2] = [cx + u * a, top + b - u * b];
    p.rect(Math.round(x2) - 1, Math.round(y2) - 4, 3, 4, wall[1]);
  }
}

function flag(p, [x, y], col = '#d9483b') {
  p.line(x, y, x, y - 10, '#3a2410');
  p.poly(
    [
      [x + 1, y - 10],
      [x + 7, y - 8],
      [x + 1, y - 6],
    ],
    col,
  );
  p.set(x + 2, y - 9, mix(col, '#ffffff', 0.35));
}

function smoke(p, [x, y], col = '#9aa0b0') {
  p.ball(x, y - 3, 2, 2, ramp(col));
  p.ball(x + 2, y - 7, 2.5, 2.5, ramp(mix(col, '#ffffff', 0.15)));
}

function chimney(p, [x, y], wall, glow) {
  p.cyl(x, y - 6, 3, 7, wall);
  if (glow) p.rect(x, y - 7, 3, 1, glow);
}

function logs(p, x, y) {
  const w = ramp('#8a5a2a');
  for (const [dx, dy] of [
    [0, 0],
    [4, 1],
    [2, -3],
  ]) {
    p.cyl(x + dx, y + dy - 3, 6, 3, w);
    p.set(x + dx + 5, y + dy - 2, '#d8a870');
  }
}

function crate(p, x, y) {
  block(p, x, y, 4, 2, 4, ramp('#a0703a'), '#c89050');
}

function goldTrim(p, apex) {
  p.set(apex[0], apex[1] - 1, '#ffe66d');
  p.set(apex[0], apex[1] - 2, '#ffe66d');
  p.set(apex[0] - 1, apex[1] - 1, '#c8963a');
}

// ---------- Gebäude ----------

const STONE = ramp('#8d93a6');
const DARKSTONE = ramp('#6d7386');
const TIMBER = ramp('#9a6a3a');
const PLASTER = ramp('#d8c8a0');

const ROOFS = {
  red: ramp('#a3423a'),
  brown: ramp('#7a4a2a'),
  blue: ramp('#3a5a8a'),
  slate: ramp('#4a5068'),
  green: ramp('#3a6a3a'),
  purple: ramp('#5a3a8a'),
  straw: ramp('#c8a050'),
};

/** Ein Wohnhaus mit Fachwerk – Grundlage vieler Gebäude. */
function house(p, { a = 18, b = 9, h = 14, wall = PLASTER, roof = ROOFS.red, rh = 14, wood = false } = {}) {
  const { x, y } = GROUND;
  block(p, x, y, a, b, h, wall);
  // Steinsockel: Häuser stehen auf einem Fundament statt direkt auf der Wiese.
  for (let v = 0; v < 3; v++) {
    p.line(x - a, y - v, x, y + b - v, STONE[v === 2 ? 3 : 2]);
    p.line(x, y + b - v, x + a, y - v, STONE[v === 2 ? 1 : 0]);
  }
  // Putz bleibt glatt; Fugen nur bei Holz und Stein.
  if (wall !== PLASTER) courses(p, x, y, a, b, h, wall, wood);
  if (!wood) {
    // Fachwerkbalken über Putz.
    p.line(x - a, y - h, x, y + b - h, TIMBER[1]);
    p.line(x - a + a / 2, y + b / 2, x - a + a / 2, y + b / 2 - h, TIMBER[1]);
  }
  doorAt(p, onLeft(x, y, a, b, 0.62, 0));
  windowAt(p, onLeft(x, y, a, b, 0.25, 8));
  windowAt(p, onRight(x, y, a, b, 0.5, 8), '#e8b860', true);
  return hipRoof(p, x, y, a, b, h, rh, roof);
}

const BUILDINGS = {
  keep: (p, stage) => {
    const { x, y } = GROUND;
    block(p, x, y, 22, 11, 26, STONE, STONE[2]);
    courses(p, x, y, 22, 11, 26, STONE);
    battlements(p, x, y, 22, 11, 26, STONE);
    // Turm hinten.
    block(p, x + 4, y - 30, 8, 4, 18, DARKSTONE, DARKSTONE[2]);
    battlements(p, x + 4, y - 30, 8, 4, 18, DARKSTONE);
    doorAt(p, onLeft(x, y, 22, 11, 0.6, 0));
    windowAt(p, onLeft(x, y, 22, 11, 0.3, 14));
    windowAt(p, onRight(x, y, 22, 11, 0.4, 14), '#e8b860', true);
    flag(p, [x + 4, y - 52], stage >= 1 ? '#f2b33d' : '#d9483b');
    if (stage >= 2) flag(p, [x - 14, y - 32], '#f2b33d');
  },
  lumberHut: (p, stage) => {
    const apex = house(p, { a: 15, b: 8, h: 11, wall: TIMBER, roof: ROOFS.brown, rh: 11, wood: true });
    logs(p, 40, 88);
    if (stage >= 1) flag(p, apex, '#4f7d45');
    if (stage >= 2) goldTrim(p, apex);
  },
  quarry: (p, stage) => {
    const { x, y } = GROUND;
    // Grube mit Steinblöcken und Kran.
    p.poly(
      [
        [x - 20, y],
        [x, y + 10],
        [x + 20, y],
        [x, y - 10],
      ],
      '#3a3a44',
    );
    for (const [dx, dy] of [
      [-8, -2],
      [4, 2],
      [10, -4],
      [-2, -6],
    ])
      block(p, x + dx, y + dy, 4, 2, 4, STONE, STONE[3]);
    p.line(x - 14, y - 2, x - 14, y - 26, TIMBER[1]);
    p.line(x - 14, y - 26, x + 2, y - 20, TIMBER[2]);
    p.line(x + 2, y - 20, x + 2, y - 12, '#c8c8c8');
    if (stage >= 1) flag(p, [x - 14, y - 26], '#8d93a6');
    if (stage >= 2) goldTrim(p, [x - 14, y - 27]);
  },
  barracks: (p, stage) => {
    const { x, y } = GROUND;
    block(p, x, y, 22, 11, 16, DARKSTONE, DARKSTONE[2]);
    courses(p, x, y, 22, 11, 16, DARKSTONE);
    battlements(p, x, y, 22, 11, 16, DARKSTONE);
    doorAt(p, onLeft(x, y, 22, 11, 0.55, 0));
    // Schild mit Schwertern an der Wand.
    const [sx, sy] = onLeft(x, y, 22, 11, 0.25, 10);
    p.ball(sx + 1, sy, 2.5, 3, ramp('#a33a3a'));
    flag(p, [x, y - 20], stage >= 1 ? '#f2b33d' : '#a33a3a');
    if (stage >= 2) flag(p, [x + 16, y - 22], '#a33a3a');
  },
  monastery: (p, stage) => {
    const { x, y } = GROUND;
    const apex = house(p, { a: 18, b: 9, h: 14, wall: PLASTER, roof: ROOFS.slate, rh: 12 });
    // Glockenturm.
    block(p, x - 10, y - 6, 5, 3, 26, PLASTER);
    const top = hipRoof(p, x - 10, y - 6, 5, 3, 26, 10, ROOFS.slate, 1);
    p.line(top[0], top[1] - 1, top[0], top[1] - 5, '#e8c070');
    p.line(top[0] - 2, top[1] - 3, top[0] + 2, top[1] - 3, '#e8c070');
    if (stage >= 1) flag(p, apex, '#e8e2c8');
    if (stage >= 2) goldTrim(p, top);
  },
  mine: (p, stage) => {
    const { x, y } = GROUND;
    // Felshügel mit Stolleneingang und Lore.
    p.ball(x, y - 6, 22, 14, ramp('#6a6a72'));
    p.poly(
      [
        [x - 6, y + 2],
        [x - 6, y - 10],
        [x + 4, y - 14],
        [x + 4, y - 2],
      ],
      '#1a1418',
    );
    p.line(x - 7, y + 2, x - 7, y - 11, TIMBER[2]);
    p.line(x + 5, y - 2, x + 5, y - 15, TIMBER[1]);
    p.line(x - 7, y - 11, x + 5, y - 15, TIMBER[3]);
    block(p, x + 12, y + 4, 4, 2, 4, ramp('#5a4a3a'), '#8a7a5a');
    p.set(x + 12, y - 1, '#e8c070');
    if (stage >= 1) flag(p, [x + 10, y - 18], '#d8a830');
    if (stage >= 2) goldTrim(p, [x + 10, y - 19]);
  },
  herbGarden: (p, stage) => {
    const { x, y } = GROUND;
    // Beete in Reihen und ein Zaun.
    p.poly(
      [
        [x - 26, y],
        [x, y + 13],
        [x + 26, y],
        [x, y - 13],
      ],
      '#4a3a24',
    );
    const r = rng(3);
    for (let k = -3; k <= 3; k++)
      for (let j = -3; j <= 3; j++) {
        const px = x + (k - j) * 3.5;
        const py = y + (k + j) * 1.75;
        p.set(px, py - 1, r() > 0.5 ? '#7ed37e' : '#5aa04a');
        p.set(px, py - 2, '#a0e080');
      }
    for (let u = 0; u <= 1; u += 0.125)
      p.line(x - 26 + u * 26, y + u * 13, x - 26 + u * 26, y + u * 13 - 4, TIMBER[2]);
    block(p, x + 14, y - 8, 5, 3, 8, TIMBER);
    hipRoof(p, x + 14, y - 8, 5, 3, 8, 6, ROOFS.straw, 1);
    if (stage >= 1) flag(p, [x + 14, y - 24], '#7ed37e');
    if (stage >= 2) goldTrim(p, [x + 14, y - 22]);
  },
  storehouse: (p, stage) => {
    const apex = house(p, { a: 22, b: 11, h: 15, wall: TIMBER, roof: ROOFS.red, rh: 12, wood: true });
    crate(p, 14, 88);
    crate(p, 20, 90);
    if (stage >= 1) flag(p, apex, '#f2b33d');
    if (stage >= 2) goldTrim(p, apex);
  },
  sawmill: (p, stage) => {
    const { x, y } = GROUND;
    const apex = house(p, { a: 16, b: 8, h: 12, wall: TIMBER, roof: ROOFS.brown, rh: 10, wood: true });
    // Wasserrad an der rechten Seite.
    p.ball(x + 18, y - 4, 4, 6, ramp('#6a4a2a'));
    p.line(x + 18, y - 10, x + 18, y + 2, '#3a2410');
    logs(p, 6, 90);
    if (stage >= 1) flag(p, apex, '#c08a50');
    if (stage >= 2) goldTrim(p, apex);
  },
  smelter: (p, stage) => {
    const { x, y } = GROUND;
    block(p, x, y, 14, 7, 14, DARKSTONE, DARKSTONE[2]);
    courses(p, x, y, 14, 7, 14, DARKSTONE);
    // Glühender Ofenmund.
    const [fx, fy] = onLeft(x, y, 14, 7, 0.5, 2);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) p.set(fx + i, fy - j + i * 0.5, j > 2 ? '#ffe08a' : '#ff8a3a');
    chimney(p, [x + 4, y - 16], STONE, '#ff8a3a');
    smoke(p, [x + 5, y - 24]);
    if (stage >= 1) flag(p, [x - 8, y - 18], '#ff8a3a');
    if (stage >= 2) goldTrim(p, [x + 5, y - 23]);
  },
  alchemy: (p, stage) => {
    const { x, y } = GROUND;
    const apex = house(p, { a: 15, b: 8, h: 13, wall: PLASTER, roof: ROOFS.purple, rh: 13 });
    for (const [dx, col] of [
      [-16, '#7ed37e'],
      [-12, '#c07ad8'],
      [-8, '#6ac0e8'],
    ]) {
      p.ball(x + dx, y + 6, 1.8, 1.8, ramp(col));
      p.set(x + dx, y + 3, '#e8e2c8');
    }
    smoke(p, [apex[0] + 6, apex[1] + 4], '#b07ad8');
    if (stage >= 1) flag(p, apex, '#c07ad8');
    if (stage >= 2) goldTrim(p, apex);
  },
  tavern: (p, stage) => {
    const { x, y } = GROUND;
    const apex = house(p, { a: 20, b: 10, h: 16, wall: PLASTER, roof: ROOFS.red, rh: 13 });
    windowAt(p, onLeft(x, y, 20, 10, 0.4, 11));
    // Wirtshausschild und Fass.
    const [sx, sy] = onLeft(x, y, 20, 10, 0.85, 12);
    p.rect(sx - 6, sy - 2, 5, 4, '#c89050');
    p.set(sx - 4, sy, '#7a2a2a');
    p.cyl(x - 22, y - 4, 4, 5, ramp('#8a5a2a'));
    if (stage >= 1) flag(p, apex, '#f2b33d');
    if (stage >= 2) goldTrim(p, apex);
  },
  smithy: (p, stage) => {
    const { x, y } = GROUND;
    const apex = house(p, { a: 16, b: 8, h: 12, wall: DARKSTONE, roof: ROOFS.slate, rh: 9 });
    chimney(p, [x - 6, y - 20], STONE, '#ff8a3a');
    // Amboss vor dem Haus.
    p.rect(x - 22, y + 2, 6, 2, '#4a4e5c');
    p.rect(x - 21, y + 4, 3, 2, '#3a3d4a');
    if (stage >= 1) flag(p, apex, '#8d93a6');
    if (stage >= 2) goldTrim(p, apex);
  },
  scriptorium: (p, stage) => {
    const apex = house(p, { a: 14, b: 7, h: 20, wall: PLASTER, roof: ROOFS.blue, rh: 14 });
    if (stage >= 1) flag(p, apex, '#3a5a8a');
    if (stage >= 2) goldTrim(p, apex);
  },
  archeryRange: (p, stage) => {
    const { x, y } = GROUND;
    // Zielscheibe auf Pfosten, kleine Hütte, Heuballen.
    p.line(x + 6, y + 2, x + 6, y - 14, TIMBER[1]);
    p.ball(x + 6, y - 18, 5, 5, ramp('#e8e2c8'));
    p.ball(x + 6, y - 18, 3, 3, ramp('#d9483b'));
    p.set(x + 6, y - 18, '#ffe66d');
    block(p, x - 12, y - 4, 7, 4, 9, TIMBER);
    hipRoof(p, x - 12, y - 4, 7, 4, 9, 7, ROOFS.straw, 1);
    p.ball(x + 16, y + 2, 4, 3, ramp('#d8b060'));
    if (stage >= 1) flag(p, [x - 12, y - 20], '#3f6b3a');
    if (stage >= 2) goldTrim(p, [x + 6, y - 23]);
  },
  workshop: (p, stage) => {
    const { x, y } = GROUND;
    const apex = house(p, { a: 18, b: 9, h: 12, wall: TIMBER, roof: ROOFS.slate, rh: 8, wood: true });
    // Zahnrad am Giebel – hier wird später die Zeitmaschine gebaut.
    p.ball(x + 2, y - 20, 3, 3, ramp('#c8963a'));
    p.set(x + 2, y - 20, '#3a2410');
    if (stage >= 1) flag(p, apex, '#c8963a');
    if (stage >= 2) goldTrim(p, apex);
  },
  mageTower: (p, stage) => {
    const { x, y } = GROUND;
    block(p, x, y, 9, 5, 34, STONE);
    courses(p, x, y, 9, 5, 34, STONE);
    windowAt(p, onLeft(x, y, 9, 5, 0.5, 24), '#c09aff');
    doorAt(p, onLeft(x, y, 9, 5, 0.5, 0));
    const apex = hipRoof(p, x, y, 9, 5, 34, 18, ROOFS.purple, 3);
    p.set(apex[0], apex[1] - 1, '#9ad8ff');
    if (stage >= 1) flag(p, apex, '#9ad8ff');
    if (stage >= 2) goldTrim(p, apex);
  },
};

/** Neutrales Haus für Gebäude, die noch keine eigene Iso-Grafik haben (spätere Epochen). */
function generic(p, stage) {
  const apex = house(p, { a: 18, b: 9, h: 14, wall: STONE, roof: ROOFS.slate, rh: 10 });
  if (stage >= 1) flag(p, apex, '#f2b33d');
  if (stage >= 2) goldTrim(p, apex);
}

// ---------- Gelände ----------

const TERRAIN = {
  grass: { top: ramp('#3f6a34'), side: ramp('#5a3a22') },
  forest: { top: ramp('#2f5a2e'), side: ramp('#5a3a22') },
  rock: { top: ramp('#6a6a72'), side: ramp('#4a4a52') },
  stream: { top: ramp('#3a6aa8'), side: ramp('#5a3a22') },
};

function terrainTile(kind, variant = '', seed = 0) {
  const p = new Pix(64, 40);
  const t = TERRAIN[kind];
  const cx = 32;
  const cy = 16;
  // Seitenkanten (Erdschicht) – links heller.
  p.poly(
    [
      [cx - A, cy],
      [cx, cy + B],
      [cx, cy + B + 8],
      [cx - A, cy + 8],
    ],
    t.side[2],
  );
  p.poly(
    [
      [cx, cy + B],
      [cx + A, cy],
      [cx + A, cy + 8],
      [cx, cy + B + 8],
    ],
    t.side[1],
  );
  p.poly(
    [
      [cx - A, cy],
      [cx, cy - B],
      [cx + A, cy],
      [cx, cy + B],
    ],
    t.top[2],
  );
  const r = rng(kind.length * 31 + variant.length * 7 + seed * 101);
  const inside = (x, y) => Math.abs(x - cx) / A + Math.abs(y - cy) / B < 0.92;
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * 64);
    const y = Math.floor(r() * 32);
    if (!inside(x, y)) continue;
    if (kind === 'stream') p.set(x, y, r() > 0.5 ? t.top[3] : t.top[4]);
    else if (kind === 'rock') p.set(x, y, r() > 0.5 ? t.top[1] : t.top[3]);
    else p.set(x, y, r() > 0.6 ? t.top[3] : t.top[1]);
  }
  if (kind === 'stream') {
    // Wellenlinien quer zur Fließrichtung.
    for (let k = -2; k <= 2; k++)
      p.line(cx - 10 + k * 6, cy - 2 + k * 3, cx - 4 + k * 6, cy + 1 + k * 3, t.top[4]);
  }
  if (kind === 'rock')
    for (const [dx, dy] of [
      [-12, 0],
      [8, -4],
      [2, 6],
    ])
      p.ball(cx + dx, cy + dy, 3, 2, ramp('#8a8a94'));
  // Oberkante im Licht (links oben).
  p.line(cx - A, cy, cx, cy - B, t.top[3]);
  if (kind === 'grass' || kind === 'forest') {
    // Grasbüschel (kleine helle Spitzen) und bei Wiese ein paar Blumen.
    for (let i = 0; i < 14; i++) {
      const x = Math.floor(r() * 64);
      const y = Math.floor(r() * 32);
      if (!inside(x, y)) continue;
      p.set(x, y, t.top[4]);
      p.set(x - 1, y + 1, t.top[3]);
      p.set(x + 1, y + 1, t.top[3]);
    }
    if (kind === 'grass' && seed > 0)
      for (let i = 0; i < 5 + seed * 2; i++) {
        const x = Math.floor(r() * 64);
        const y = Math.floor(r() * 32);
        if (inside(x, y)) p.set(x, y, ['#f2e070', '#f0a0c0', '#e8f0ff', '#c0a0f0'][Math.floor(r() * 4)]);
      }
  }
  // Vorderkanten dunkler: Felder setzen sich voneinander ab, ohne harte Gitterlinien.
  p.line(cx - A, cy, cx, cy + B, t.top[1]);
  p.line(cx, cy + B, cx + A, cy, t.top[0]);
  if (variant === 'locked') p.c = p.c.map((c) => (c ? mix(c, '#0b0f1a', 0.55) : c));
  if (variant === 'fog') p.c = p.c.map((c) => (c ? mix(c, '#05070c', 0.82) : c));
  return p;
}

function pine(p, x, base, h, r) {
  p.rect(x, base - 3, 1, 3, '#3a2410');
  for (let k = 0; k < 3; k++) {
    const top = base - h + k * (h / 4);
    const half = 2 + k * 1.5;
    p.poly(
      [
        [x, top],
        [x + half + 1, top + h / 2.4],
        [x - half, top + h / 2.4],
      ],
      r[2],
    );
    p.line(x, top, x - half, top + h / 2.4, r[3]);
  }
}

function forestDeco() {
  const p = new Pix(64, 96);
  const r = ramp('#2a5a30');
  for (const [dx, dy, h] of [
    [-14, -2, 20],
    [6, -6, 24],
    [-2, 5, 18],
    [14, 2, 16],
  ])
    pine(p, GROUND.x + dx, GROUND.y + dy, h, r);
  return p.outline(0.6);
}

// ---------- Sammler (klein, 8×12, zwei Schritte) ----------

const WORKERS = {
  woodcutter: '#4f7d45',
  miner: '#7a6a5a',
  herbalist: '#7a9a4a',
  monk: '#7a5a3a',
  generic: '#8a6a3a',
};

function worker(col, f) {
  const p = new Pix(8, 12);
  const body = ramp(col);
  p.ball(4, 3, 2.2, 2.2, ramp('#e8b48a'));
  p.cyl(2, 5, 4, 4, body);
  p.rect(2 + (f ? 0 : 1), 9, 1, 2, '#3a2a1a');
  p.rect(5 - (f ? 0 : 1), 9, 1, 2, '#3a2a1a');
  return p.outline(0.6);
}

export function drawIso() {
  const buildings = {};
  for (const [id, draw] of Object.entries(BUILDINGS)) {
    for (const stage of [0, 1, 2]) {
      const p = new Pix(64, 96);
      draw(p, stage);
      buildings[`${id}_${stage}`] = p.outline(0.6);
    }
  }
  for (const stage of [0, 1, 2]) {
    const p = new Pix(64, 96);
    generic(p, stage);
    buildings[`generic_${stage}`] = p.outline(0.6);
  }
  buildings['deco_forest'] = forestDeco();

  const terrain = {};
  for (const kind of Object.keys(TERRAIN)) {
    terrain[kind] = terrainTile(kind);
    // Zwei Varianten je Gelände, damit große Flächen nicht wie gekachelt aussehen.
    terrain[`${kind}_v1`] = terrainTile(kind, '', 1);
    terrain[`${kind}_v2`] = terrainTile(kind, '', 2);
    terrain[`${kind}_locked`] = terrainTile(kind, 'locked');
    terrain[`${kind}_fog`] = terrainTile(kind, 'fog');
  }

  const workers = {};
  for (const [id, col] of Object.entries(WORKERS)) {
    workers[`${id}_0`] = worker(col, 0);
    workers[`${id}_1`] = worker(col, 1);
  }
  return { buildings, terrain, workers };
}
