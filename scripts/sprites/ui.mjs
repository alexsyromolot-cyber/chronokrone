/**
 * Pixel-Grafiken für das Kampf-Overlay: mittelalterlich mit einem Hauch Zeitreise.
 * Holztafeln mit Eisenbeschlag und Messing-Zahnrädern, ein Pergamentband für Titel,
 * Taschenuhr-Medaillons für Porträts, eine Sanduhr für die Wut, ein Beutel für die Beute.
 * Rahmen und Band sind 9-Slice-Bilder (CSS border-image), alles in 1:1-Pixeln.
 */
import { Pix, mix, ramp } from './lib.mjs';

// Dunkles, ruhiges Holz – der Text darauf muss gut lesbar bleiben.
const WOOD = ramp('#3e2716');
const IRON = ramp('#5d6274');
const BRASS = ramp('#c8963a');
const PARCH = ramp('#e8d8b0');
const LEATHER = ramp('#7a4a2a');
const GLASS = '#9ab4c8';
const SAND = ramp('#e8c070');

/** Kleines Messing-Zahnrad (7×7) mit Achse. */
function gear(p, cx, cy, on = true) {
  const r = on ? BRASS : IRON;
  for (const [dx, dy] of [
    [0, -3],
    [0, 3],
    [-3, 0],
    [3, 0],
    [-2, -2],
    [2, -2],
    [-2, 2],
    [2, 2],
  ])
    p.set(cx + dx, cy + dy, r[1]);
  p.ball(cx + 0.5, cy + 0.5, 2.6, 2.6, r);
  p.set(cx, cy, r[0]);
}

/** Holztafel 24×24, Ränder 8 px: Eisenband, Nieten, Zahnräder in den Ecken. */
function frame() {
  const p = new Pix(24, 24);
  // Bretter mit Maserung (waagrecht), nach innen gekachelt.
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) {
      const plank = Math.floor(y / 6) % 2;
      const grain = (x * 5 + plank * 7) % 13 === 0 && y % 6 === 3;
      p.set(
        x,
        y,
        grain
          ? mix(WOOD[2], WOOD[1], 0.6)
          : y % 6 === 0
            ? mix(WOOD[1], WOOD[0], 0.5)
            : plank
              ? WOOD[2]
              : mix(WOOD[2], WOOD[1], 0.2),
      );
    }
  // Eisenband rundum.
  for (let i = 0; i < 24; i++) {
    for (const [x, y] of [
      [i, 0],
      [i, 1],
      [i, 22],
      [i, 23],
      [0, i],
      [1, i],
      [22, i],
      [23, i],
    ])
      p.set(x, y, IRON[2]);
    p.set(i, 0, IRON[3]);
    p.set(0, i, IRON[3]);
    p.set(i, 23, IRON[0]);
    p.set(23, i, IRON[0]);
    p.set(i, 2, mix(WOOD[0], '#000000', 0.3));
    p.set(2, i, mix(WOOD[0], '#000000', 0.3));
  }
  // Zahnräder in den Ecken: das Zeitmaschinen-Erbe des Königs.
  for (const [x, y] of [
    [4, 4],
    [19, 4],
    [4, 19],
    [19, 19],
  ])
    gear(p, x, y);
  // Nieten an den Kanten (in der Mitte der Ränder, kacheln mit).
  for (const [x, y] of [
    [12, 1],
    [12, 22],
    [1, 12],
    [22, 12],
  ]) {
    p.set(x, y, BRASS[3]);
    p.set(x + 1, y, BRASS[1]);
  }
  return p;
}

/** Pergamentband 32×12 (9-Slice mit 8 px links/rechts): eingerollte Enden. */
function banner() {
  const p = new Pix(32, 12);
  for (let y = 1; y < 11; y++)
    for (let x = 3; x < 29; x++)
      p.set(x, y, y === 1 ? PARCH[3] : y === 10 ? PARCH[1] : (x + y) % 9 === 0 ? PARCH[1] : PARCH[2]);
  for (const x of [0, 29]) {
    p.cyl(x, 2, 3, 9, PARCH);
    p.set(x + 1, 6, PARCH[0]);
  }
  p.rect(3, 11, 26, 1, mix(PARCH[0], '#000000', 0.2));
  return p;
}

/** Taschenuhr-Medaillon 22×22 mit Stundenmarken; die Mitte bleibt frei fürs Porträt. */
function medallion() {
  const p = new Pix(22, 22);
  const c = 10.5;
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < 22; x++) {
      const d = Math.hypot(x + 0.5 - c - 0.5, y + 0.5 - c - 0.5);
      if (d > 10.5 || d < 8.2) continue;
      const lit = x + y < 20;
      p.set(x, y, d > 9.6 ? BRASS[lit ? 3 : 1] : BRASS[lit ? 2 : 1]);
    }
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    p.set(Math.round(11 + Math.cos(a) * 9), Math.round(11 + Math.sin(a) * 9), BRASS[0]);
  }
  // Aufzugskrone oben.
  p.rect(10, 0, 2, 2, BRASS[3]);
  return p;
}

/** Sanduhr 12×16 – level 0 (oben voll) bis 4 (abgelaufen). */
function hourglass(level, angry = false) {
  const p = new Pix(12, 16);
  const cap = angry ? ramp('#8a2a2a') : WOOD;
  p.slab(0, 0, 12, 2, cap);
  p.slab(0, 14, 12, 2, cap);
  // Glas: zwei Kegel.
  for (let y = 2; y < 14; y++) {
    const half =
      y < 8 ? Math.max(1, 5 - Math.floor((y - 2) * 0.8)) : Math.max(1, 1 + Math.floor((y - 8) * 0.8));
    for (let x = 6 - half; x < 6 + half; x++) p.set(x, y, mix(GLASS, '#1a2030', 0.55));
    p.set(6 - half, y, GLASS);
  }
  const top = 4 - level;
  const sand = angry ? ramp('#ff7a5a') : SAND;
  for (let y = 2; y < 8; y++) {
    if (y < 8 - top - 1) continue;
    const half = Math.max(1, 5 - Math.floor((y - 2) * 0.8)) - 1;
    for (let x = 6 - half; x < 6 + half; x++) p.set(x, y, sand[2]);
  }
  for (let y = 13; y > 13 - level - (level > 0 ? 1 : 0); y--) {
    const half = Math.max(1, 1 + Math.floor((y - 8) * 0.8)) - 1;
    for (let x = 6 - half; x <= 5 + half; x++) p.set(x, y, sand[y === 13 - level ? 3 : 2]);
  }
  if (level < 4) p.set(6, 8 + (level % 2), sand[3]);
  return p.outline(0.5);
}

/** Lederbeutel 12×12 mit Goldmünze. */
function pouch() {
  const p = new Pix(12, 12);
  p.ball(6, 7.5, 5, 4.5, LEATHER);
  p.rect(4, 2, 4, 2, LEATHER[1]);
  p.rect(3, 3, 6, 1, '#d8b070');
  p.ball(9, 9, 2.4, 2.4, BRASS);
  p.set(9, 9, BRASS[4]);
  return p.outline(0.5);
}

/** Zahnrad-Marke für die Wellen: an (Messing) / aus (Eisen). */
function wavePip(on) {
  const p = new Pix(9, 9);
  gear(p, 4, 4, on);
  return p.outline(0.5);
}

export function drawUi() {
  return {
    frame: frame(),
    banner: banner(),
    medallion: medallion(),
    pouch: pouch(),
    'gear-on': wavePip(true),
    'gear-off': wavePip(false),
    ...Object.fromEntries([0, 1, 2, 3, 4].map((l) => [`hourglass-${l}`, hourglass(l)])),
    'hourglass-angry': hourglass(4, true),
  };
}
