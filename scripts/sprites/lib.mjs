/**
 * Kleine Pixel-Bibliothek für die Sprite-Erzeugung (läuft in Node, deterministisch).
 *
 * Grundidee moderner Pixelart, hier automatisiert:
 *  - Farbrampen statt Einzelfarben: jede Materialfarbe bekommt 5 Stufen. Schatten wandern
 *    leicht ins Kühle (Richtung Blau/Violett), Lichter ins Warme – das wirkt lebendiger
 *    als bloßes Abdunkeln.
 *  - Licht fällt von oben links. Formen (Kugel, Zylinder) bekommen ihre Stufe aus der
 *    Flächennormalen, damit sie Volumen haben, ohne dass jedes Pixel von Hand gesetzt wird.
 *  - Umriss „sel-out“: Die Kontur nimmt die dunkelste Stufe der angrenzenden Farbe statt
 *    überall Schwarz – so bleiben Figuren klar, aber nicht hart.
 */

// ---------- Farben ----------

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b]
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb([h, s, l]) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Hue zum Ziel drehen (kürzester Weg) – für warme Lichter und kühle Schatten. */
function hueToward(h, target, amount) {
  let d = ((target - h + 540) % 360) - 180;
  return h + d * amount;
}

/**
 * 5-stufige Rampe aus einer Grundfarbe: [Kontur, Schatten, Grund, Licht, Glanz].
 */
export function ramp(base) {
  const [h, s, l] = rgbToHsl(hexToRgb(base));
  const step = (dl, toward, amt, ds) =>
    rgbToHex(
      hslToRgb([
        hueToward(h, toward, amt),
        Math.max(0, Math.min(1, s + ds)),
        Math.max(0.03, Math.min(0.97, l + dl)),
      ]),
    );
  // Schatten nur leicht ins Kühle drehen: Bei warmen Tönen (Haut) führt der kurze Weg
  // nach Blau über Rot/Magenta – zu viel Drehung macht Gesichter rot.
  return [
    step(-0.42, 250, 0.18, 0),
    step(-0.15, 240, 0.08, 0.02),
    base,
    step(0.12, 55, 0.12, -0.02),
    step(0.24, 55, 0.22, -0.08),
  ];
}

export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

export function lighten(hex, amount) {
  return mix(hex, '#ffffff', amount);
}

// ---------- Licht ----------

const LIGHT = (() => {
  const v = [-0.55, -0.7, 0.45];
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
})();

/** Normalenvektor → Rampenstufe 1–4 (0 bleibt der Kontur vorbehalten). */
function shadeLevel(nx, ny, nz) {
  const d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
  if (d > 0.82) return 4;
  if (d > 0.42) return 3;
  if (d > -0.05) return 2;
  return 1;
}

// ---------- Leinwand ----------

export class Pix {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.c = new Array(w * h).fill(null);
  }

  in(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    return this.in(x, y) ? this.c[y * this.w + x] : null;
  }

  set(x, y, col) {
    x = Math.round(x);
    y = Math.round(y);
    if (col && this.in(x, y)) this.c[y * this.w + x] = col;
  }

  rect(x, y, w, h, col) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, col);
    return this;
  }

  /** Kugelig schattierte Ellipse (Köpfe, Bäuche, Kuppeln). */
  ball(cx, cy, rx, ry, r) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x + 0.5 - cx) / rx;
        const v = (y + 0.5 - cy) / ry;
        const q = u * u + v * v;
        if (q > 1) continue;
        this.set(x, y, r[shadeLevel(u, v, Math.sqrt(Math.max(0, 1 - q)))]);
      }
    }
    return this;
  }

  /** Senkrechter Zylinder (Rumpf, Beine, Säulen): Licht links, Schatten rechts, Oberkante heller. */
  cyl(x, y, w, h, r, topLight = 1) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const u = w === 1 ? 0 : ((i + 0.5) / w) * 2 - 1;
        let lvl = shadeLevel(u, j < topLight ? -0.6 : 0, Math.sqrt(Math.max(0, 1 - u * u)));
        if (j === h - 1 && h > 2) lvl = Math.max(1, lvl - 1);
        this.set(x + i, y + j, r[lvl]);
      }
    }
    return this;
  }

  /** Waagrechter Quader von oben beleuchtet (Mauersteine, Bretter). */
  slab(x, y, w, h, r) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const lvl = j === 0 ? 3 : i === 0 ? 3 : j === h - 1 || i === w - 1 ? 1 : 2;
        this.set(x + i, y + j, r[lvl]);
      }
    }
    return this;
  }

  /** Linie mit Dicke (Waffen, Stiele). */
  line(x0, y0, x1, y1, col, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) {
      const x = x0 + ((x1 - x0) * k) / n;
      const y = y0 + ((y1 - y0) * k) / n;
      for (let t = 0; t < thick; t++)
        this.set(
          x + (thick > 1 && Math.abs(x1 - x0) < Math.abs(y1 - y0) ? t : 0),
          y + (thick > 1 && Math.abs(x1 - x0) >= Math.abs(y1 - y0) ? t : 0),
          col,
        );
    }
    return this;
  }

  /** Polygon füllen (Dächer, Klingen, Hüte). Ecken als [x, y]-Paare. */
  poly(points, col) {
    const ys = points.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) {
          xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, col);
      }
    }
    return this;
  }

  /** Andere Leinwand an (dx, dy) einfügen. */
  blit(o, dx, dy) {
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) this.set(x + dx, y + dy, o.get(x, y));
    return this;
  }

  /** Kontur: jedes leere Pixel neben einer Farbe bekommt deren dunkle Stufe (sel-out). */
  outline(darkness = 0.72) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        const n = [this.get(x, y - 1), this.get(x, y + 1), this.get(x - 1, y), this.get(x + 1, y)].find(
          Boolean,
        );
        if (n) add.push([x, y, mix(n, '#0d0b14', darkness)]);
      }
    }
    for (const [x, y, c] of add) this.set(x, y, c);
    return this;
  }

  /** Waagrecht spiegeln (Aliens schauen nach links, Verteidiger nach rechts). */
  flipped() {
    const o = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) o.c[y * this.w + (this.w - 1 - x)] = this.get(x, y);
    return o;
  }

  /** Alle Farben zu Weiß hin aufhellen (Treffer-Blitz). */
  flashed(amount = 0.65) {
    const o = new Pix(this.w, this.h);
    o.c = this.c.map((c) => (c ? lighten(c, amount) : null));
    return o;
  }

  /** Farben tauschen (Elitegegner aus normalen Aliens). */
  recolored(map) {
    const o = new Pix(this.w, this.h);
    o.c = this.c.map((c) => (c && map[c] ? map[c] : c));
    return o;
  }
}

// ---------- PNG + Atlas ----------

/** Mehrere Bilder in ein Blatt packen (Zeilen gleicher Höhe). */
export function packSheet(frames, cellW, cellH, columns) {
  const rows = Math.ceil(frames.length / columns);
  const sheet = new Pix(columns * cellW, rows * cellH);
  const rects = {};
  frames.forEach(({ name, pix }, i) => {
    const x = (i % columns) * cellW;
    const y = Math.floor(i / columns) * cellH;
    sheet.blit(pix, x, y);
    rects[name] = { x, y, w: cellW, h: cellH };
  });
  return { sheet, rects };
}

export function toPngBuffer(PNG, pix) {
  const png = new PNG({ width: pix.w, height: pix.h });
  for (let i = 0; i < pix.c.length; i++) {
    const c = pix.c[i];
    const o = i * 4;
    if (!c) {
      png.data[o + 3] = 0;
      continue;
    }
    const [r, g, b] = hexToRgb(c);
    png.data[o] = r;
    png.data[o + 1] = g;
    png.data[o + 2] = b;
    png.data[o + 3] = 255;
  }
  return PNG.sync.write(png);
}
