/**
 * Kulisse der Epoche 1 in Parallax-Ebenen, 640×360 (doppelte Logik-Auflösung 320×180).
 * Ebenen: sky (Himmel, Mond, Sterne), far (Berge), forest (Tannen), ground (Boden, Krater),
 * castle (Turm und Mauer). Das Spiel legt sie übereinander und lässt Wolken, Rauch und
 * Fackeln darüber leben.
 *
 * Koordinaten passen zur Logik (×2): Boden der Kampfbahn y = 292, Waldrand y = 244,
 * Turm von x = 80 bis 144, Oberkante (Wehrgang) y = 200.
 */
import { Pix, mix, ramp } from './lib.mjs';

const W = 640;
const H = 360;

/** Deterministischer Zufall: gleiche Kulisse bei jedem Lauf. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sky() {
  const p = new Pix(W, H);
  const bands = ['#0b0f1a', '#10162a', '#151d36', '#1b2542', '#212d4d', '#28355a'];
  // Bänder mit Schachbrett-Dither an den Übergängen – klassischer Pixelart-Verlauf ohne Matsch.
  const bandH = 46;
  for (let y = 0; y < 250; y++) {
    const b = Math.min(bands.length - 1, Math.floor(y / bandH));
    const inBand = y % bandH;
    for (let x = 0; x < W; x++) {
      const next = bands[Math.min(bands.length - 1, b + 1)];
      const dither = inBand > bandH - 6 && (x + y) % 2 === 0;
      p.set(x, y, dither ? next : bands[b]);
    }
  }
  const r = rng(7);
  for (let i = 0; i < 140; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * 200);
    const bright = r();
    p.set(x, y, bright > 0.9 ? '#ffffff' : bright > 0.6 ? '#c8d0f0' : '#5d6b94');
    if (bright > 0.96) {
      p.set(x - 1, y, '#5d6b94');
      p.set(x + 1, y, '#5d6b94');
      p.set(x, y - 1, '#5d6b94');
      p.set(x, y + 1, '#5d6b94');
    }
  }
  // Mond mit Kratern und Hof.
  for (let k = 3; k >= 1; k--) {
    const rad = 18 + k * 7;
    for (let y = -rad; y <= rad; y++)
      for (let x = -rad; x <= rad; x++)
        if (x * x + y * y <= rad * rad && (x + y) % 2 === 0)
          p.set(548 + x, 50 + y, mix(p.get(548 + x, 50 + y) ?? '#10162a', '#e8e2c8', 0.06 * (4 - k)));
  }
  p.ball(548, 50, 17, 17, ramp('#e8e2c8'));
  for (const [x, y, rr] of [
    [541, 44, 3],
    [553, 56, 4],
    [556, 42, 2],
    [544, 58, 2],
  ])
    p.ball(x, y, rr, rr, ramp('#c9c2a3'));
  return p;
}

function far() {
  const p = new Pix(W, H);
  /**
   * Bergkette aus überlagerten Wellen (weich, aber mit Zacken). Jede Spalte: Kamm-Höhe
   * aus der Funktion, Hang zur Lichtseite (Gelände steigt nach rechts an) heller.
   * Nach unten wird es heller und blauer: Dunst in der Ferne (Luftperspektive).
   */
  const ridge = (base, amp, seed, col, haze, snow) => {
    const rnd = rng(seed);
    const waves = [0, 1, 2, 3].map((k) => ({
      f: (0.006 + rnd() * 0.01) * (k + 1),
      ph: rnd() * 6.3,
      a: amp / (k + 1.4),
    }));
    const height = (x) => base - waves.reduce((s, w) => s + Math.abs(Math.sin(x * w.f + w.ph)) * w.a, 0);
    const r = ramp(col);
    for (let x = 0; x < W; x++) {
      const top = Math.round(height(x));
      const slope = height(x + 2) - height(x - 2);
      const lit = slope < -0.4;
      for (let y = top; y < 252; y++) {
        const depth = y - top;
        let c = depth < 2 ? r[lit ? 4 : 1] : r[lit ? 3 : 2];
        if (!lit && depth > 2 && (x + y) % 2 === 0 && slope > 1.2) c = r[1];
        // Dunst: unten heller zur Horizontfarbe ziehen.
        c = mix(c, haze, Math.min(0.55, Math.max(0, (y - top) / 90)));
        if (snow && top < base - amp * snow && depth < (lit ? 5 : 3)) c = lit ? '#d8e0f0' : '#8a96b8';
        p.set(x, y, c);
      }
    }
  };
  ridge(214, 84, 11, '#1e2742', '#222d4c', 0.8);
  ridge(240, 48, 23, '#161e34', '#1c2640', 0);
  return p;
}

function pine(p, x, base, h, r) {
  // Tanne aus drei Etagen, linke Kante im Licht.
  p.rect(x - 1, base - 4, 2, 4, '#2a1c14');
  const tiers = 3;
  for (let k = 0; k < tiers; k++) {
    const top = base - h + Math.floor((k * h) / (tiers + 1));
    const bottom = top + Math.floor(h / 2);
    const half = 3 + k * 2 + Math.floor(h / 12);
    p.poly(
      [
        [x, top],
        [x + half, bottom],
        [x - half, bottom],
      ],
      r[2],
    );
    for (let y = top + 1; y < bottom; y++) {
      const w = Math.floor(((y - top) / (bottom - top)) * half);
      p.set(x - w, y, r[3]);
      p.set(x + w, y, r[1]);
    }
    p.rect(x - half + 1, bottom - 1, half * 2 - 1, 1, r[1]);
  }
  p.set(x, base - h, r[4]);
}

function forest() {
  const p = new Pix(W, H);
  const backR = ramp('#16261f');
  const frontR = ramp('#1d3326');
  const r1 = rng(31);
  for (let x = -6; x < W + 6; x += 9 + Math.floor(r1() * 6))
    pine(p, x, 238, 24 + Math.floor(r1() * 16), backR);
  const r2 = rng(47);
  for (let x = -4; x < W + 6; x += 12 + Math.floor(r2() * 9)) {
    // Lücke für die Mauer links und den Krater rechts lassen.
    if (x > 420 && x < 540) continue;
    pine(p, x, 248, 30 + Math.floor(r2() * 22), frontR);
  }
  return p;
}

function ground() {
  const p = new Pix(W, H);
  const grass = ramp('#1f2f22');
  const field = ramp('#18261b');
  for (let y = 244; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const deep = y > 292;
      const base = deep ? field[2] : grass[2];
      const n = (x * 13 + y * 29 + ((x * y) % 7)) % 31;
      p.set(x, y, n === 0 ? (deep ? field[1] : grass[3]) : n === 11 ? (deep ? field[3] : grass[1]) : base);
    }
  }
  // Kante der Kampfbahn und Grasbüschel.
  for (let x = 0; x < W; x++) p.set(x, 292, field[1]);
  const r = rng(91);
  for (let i = 0; i < 160; i++) {
    const x = Math.floor(r() * W);
    const y = 250 + Math.floor(r() * 105);
    const g = y > 292 ? field : grass;
    p.set(x, y, g[4]);
    p.set(x + 1, y - 1, g[3]);
    p.set(x - 1, y - 1, g[3]);
  }
  // Steine am Wegrand.
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(r() * W);
    const y = 296 + Math.floor(r() * 60);
    p.ball(x, y, 2 + r() * 2, 1.5, ramp('#4a4e5c'));
  }
  // Meteorkrater mit glühender Mitte (Rauch steigt im Spiel daraus auf).
  const cx = 480;
  const cy = 252;
  for (let y = -10; y <= 10; y++)
    for (let x = -46; x <= 46; x++) {
      const q = (x * x) / (46 * 46) + (y * y) / (10 * 10);
      if (q > 1) continue;
      p.set(
        cx + x,
        cy + y,
        q > 0.75 ? '#2a2420' : q > 0.35 ? '#3a2a24' : mix('#5a2a2a', '#ff8a3a', 0.6 * (1 - q / 0.35)),
      );
    }
  for (const dx of [-38, -20, 15, 34]) p.ball(cx + dx, cy - 6 + (dx % 3), 3, 2, ramp('#5a4e48'));
  return p;
}

function castle() {
  const p = new Pix(W, H);
  const stone = ramp('#4a4f64');
  const stoneDark = ramp('#3b3f52');
  // Niedrige Mauer links (zum Dorf hin).
  for (let y = 240; y < 292; y += 6) {
    const off = (y / 6) % 2 ? 0 : 6;
    for (let x = -off; x < 80; x += 12) p.slab(x, y, 12, 6, stoneDark);
  }
  for (let x = 0; x < 80; x += 10) p.slab(x, 232, 6, 8, stoneDark);
  // Turm: Quader im Verband, rechte Seite im Schatten.
  for (let y = 200; y < 292; y += 8) {
    const off = (y / 8) % 2 ? 0 : 8;
    for (let x = 80 - off; x < 144; x += 16) {
      const w = Math.min(16, 144 - Math.max(80, x));
      const sx = Math.max(80, x);
      p.slab(sx, y, w, 8, x + 16 > 132 ? stoneDark : stone);
    }
  }
  // Moos und Risse für Leben im Stein.
  const r = rng(5);
  for (let i = 0; i < 30; i++)
    p.set(80 + Math.floor(r() * 64), 204 + Math.floor(r() * 86), r() > 0.5 ? '#2f4a34' : stone[0]);
  // Zinnen auf dem Wehrgang.
  for (let x = 80; x < 144; x += 12) p.slab(x, 190, 8, 10, stone);
  p.rect(80, 199, 64, 2, stone[1]);
  // Schießscharte mit warmem Licht.
  p.rect(108, 226, 4, 12, '#1a1206');
  p.rect(109, 228, 2, 8, '#f2b33d');
  p.set(109, 228, '#ffe6a0');
  // Tor unten.
  p.poly(
    [
      [100, 292],
      [100, 266],
      [104, 260],
      [120, 260],
      [124, 266],
      [124, 292],
    ],
    '#2d2118',
  );
  for (let x = 102; x < 124; x += 4) p.rect(x, 262, 1, 30, '#5a3a22');
  p.rect(100, 272, 24, 1, '#1a1206');
  // Banner mit Krone.
  p.rect(126, 204, 10, 18, '#7a2a2a');
  p.poly(
    [
      [126, 222],
      [131, 218],
      [136, 222],
    ],
    null,
  );
  p.rect(129, 209, 4, 3, '#f2b33d');
  p.set(129, 208, '#f2b33d');
  p.set(132, 208, '#f2b33d');
  p.outline(0.6);
  return p;
}

export function drawBackdrop() {
  return { sky: sky(), far: far(), forest: forest(), ground: ground(), castle: castle() };
}
