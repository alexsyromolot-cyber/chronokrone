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

export function spriteCanvas(sprite: PixelSprite): HTMLCanvasElement {
  const cached = canvasCache.get(sprite);
  if (cached) return cached;
  const height = sprite.rows.length;
  const width = Math.max(...sprite.rows.map((r) => r.length));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  sprite.rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = sprite.palette[ch];
      if (ch === '.' || !color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
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
