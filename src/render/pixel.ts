/**
 * Pixelart aus Text. Jede Grafik ist ein Raster aus Zeichen; jedes Zeichen steht für
 * eine Farbe der Palette, '.' ist durchsichtig. So bleibt die Grafik im Code lesbar
 * und lässt sich später 1:1 durch Aseprite-Exporte (PNG) ersetzen: Beide landen am
 * Ende als Canvas → Textur bzw. Bild-URL.
 */
import { Texture } from 'pixi.js';

export interface PixelSprite {
  rows: string[];
  palette: Record<string, string>;
}

const canvasCache = new Map<PixelSprite, HTMLCanvasElement>();
const textureCache = new Map<PixelSprite, Texture>();
const urlCache = new Map<PixelSprite, string>();

/** Hex-Farbe heller (amount > 0) oder dunkler (amount < 0) machen. */
export function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => {
    const v = (n >> shift) & 0xff;
    const out = amount > 0 ? v + (255 - v) * amount : v * (1 + amount);
    return Math.round(Math.min(255, Math.max(0, out)));
  };
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

const OUTLINE = '#14121c';

/**
 * Text-Raster → Canvas, mit automatischem Feinschliff:
 *  - Kontur: Jedes durchsichtige Pixel neben einer Figur wird dunkel (1 Pixel Rand).
 *    Dadurch heben sich Figuren vom Hintergrund ab – der wichtigste Trick moderner Pixelart.
 *  - Licht und Schatten: Pixel mit freier Kante nach oben werden heller (Licht von oben),
 *    Pixel mit freier Kante nach unten dunkler. Das gibt Volumen ohne Handarbeit.
 * Das Canvas ist deshalb 2 Pixel breiter und höher als das Raster.
 */
export function spriteCanvas(sprite: PixelSprite): HTMLCanvasElement {
  const cached = canvasCache.get(sprite);
  if (cached) return cached;
  const height = sprite.rows.length;
  const width = Math.max(...sprite.rows.map((r) => r.length));
  const filled = (x: number, y: number) => {
    const ch = sprite.rows[y]?.[x];
    return !!ch && ch !== '.' && !!sprite.palette[ch];
  };
  const canvas = document.createElement('canvas');
  canvas.width = width + 2;
  canvas.height = height + 2;
  const ctx = canvas.getContext('2d')!;
  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      if (filled(x, y)) {
        const base = sprite.palette[sprite.rows[y]![x]!]!;
        const color = !filled(x, y - 1) ? shade(base, 0.18) : !filled(x, y + 1) ? shade(base, -0.22) : base;
        ctx.fillStyle = color;
        ctx.fillRect(x + 1, y + 1, 1, 1);
      } else if (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1)) {
        ctx.fillStyle = OUTLINE;
        ctx.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }
  canvasCache.set(sprite, canvas);
  return canvas;
}

/** Textur für PixiJS – mit „nearest“-Filter, damit Pixel scharf bleiben. */
export function spriteTexture(sprite: PixelSprite): Texture {
  const cached = textureCache.get(sprite);
  if (cached) return cached;
  const texture = Texture.from(spriteCanvas(sprite));
  texture.source.scaleMode = 'nearest';
  textureCache.set(sprite, texture);
  return texture;
}

/** Bild-URL für HTML (Burg-Raster, Listen, Bestiarium). */
export function spriteUrl(sprite: PixelSprite): string {
  const cached = urlCache.get(sprite);
  if (cached) return cached;
  const url = spriteCanvas(sprite).toDataURL();
  urlCache.set(sprite, url);
  return url;
}
