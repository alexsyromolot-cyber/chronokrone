/**
 * `npm run sprites` – erzeugt alle Sprite-Sheets deterministisch aus Code.
 *
 * Ausgabe nach src/assets/sprites/ (eingecheckt):
 *   figures.png + figures.json   Atlas im PixiJS-Spritesheet-Format (frames + animations)
 *   backdrop-1.png               Kulisse der Epoche 1 in Ebenen (siehe backdrop.mjs)
 * Und zum Anschauen (nicht eingecheckt): test-results/sprites-preview.png, 4-fach vergrößert.
 *
 * Warum src/assets statt public/: Vite bindet die Dateien so in den Build ein (mit Hash im
 * Namen), und die Desktop-App lädt sie ohne fetch() direkt von der Festplatte.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngjs from 'pngjs';
import { Pix, packSheet, toPngBuffer } from './lib.mjs';
import { FIGURES, POSES, drawFigure } from './figures.mjs';
import { ALIEN_IDS, alienFrames } from './aliens.mjs';
import { drawBackdrop } from './backdrop.mjs';
import { drawUi } from './ui.mjs';

const { PNG } = pngjs;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'src/assets/sprites');
fs.mkdirSync(outDir, { recursive: true });

// ---------- Figuren und Aliens in ein Blatt ----------
const frames = [];
const animations = {};
const add = (anim, list) => {
  animations[anim] = list.map((pix, i) => {
    const name = `${anim}_${i}`;
    frames.push({ name, pix });
    return name;
  });
};
for (const [id, def] of Object.entries(FIGURES)) {
  for (const [anim, poses] of Object.entries(POSES))
    add(
      `${id}_${anim}`,
      poses.map((pose) => drawFigure(def, pose)),
    );
}
for (const id of ALIEN_IDS) {
  for (const [anim, list] of Object.entries(alienFrames(id))) add(`${id}_${anim}`, list);
}

const COLS = 16;
const { sheet, rects } = packSheet(frames, 32, 32, COLS);
fs.writeFileSync(path.join(outDir, 'figures.png'), toPngBuffer(PNG, sheet));
const atlas = {
  frames: Object.fromEntries(
    Object.entries(rects).map(([name, r]) => [
      name,
      {
        frame: { x: r.x, y: r.y, w: r.w, h: r.h },
        sourceSize: { w: r.w, h: r.h },
        spriteSourceSize: { x: 0, y: 0, w: r.w, h: r.h },
      },
    ]),
  ),
  animations,
  meta: { image: 'figures.png', size: { w: sheet.w, h: sheet.h }, scale: '1', format: 'RGBA8888' },
};
fs.writeFileSync(path.join(outDir, 'figures.json'), JSON.stringify(atlas));

// ---------- Kulisse ----------
const backdrop = drawBackdrop();
for (const [name, pix] of Object.entries(backdrop)) {
  fs.writeFileSync(path.join(outDir, `backdrop-1-${name}.png`), toPngBuffer(PNG, pix));
}

// ---------- Overlay (Kampf-HUD) ----------
const uiDir = path.join(root, 'src/assets/ui');
fs.mkdirSync(uiDir, { recursive: true });
const ui = drawUi();
for (const [name, pix] of Object.entries(ui))
  fs.writeFileSync(path.join(uiDir, name + '.png'), toPngBuffer(PNG, pix));

// ---------- Vorschau (4×) ----------
function scaled(pix, k, bg) {
  const o = new Pix(pix.w * k, pix.h * k);
  for (let y = 0; y < o.h; y++)
    for (let x = 0; x < o.w; x++) o.c[y * o.w + x] = pix.get(Math.floor(x / k), Math.floor(y / k)) ?? bg;
  return o;
}
const previewDir = path.join(root, 'test-results');
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(path.join(previewDir, 'sprites-preview.png'), toPngBuffer(PNG, scaled(sheet, 4, '#2a2f45')));
// Overlay-Teile nebeneinander, 6×.
const uiPreview = new Pix(240, 30);
let ux = 2;
for (const pix of Object.values(ui)) {
  uiPreview.blit(pix, ux, 2);
  ux += pix.w + 3;
}
fs.writeFileSync(path.join(previewDir, 'ui-preview.png'), toPngBuffer(PNG, scaled(uiPreview, 6, '#1a2030')));
console.log(
  `Sprites: ${frames.length} Bilder, ${Object.keys(animations).length} Animationen, Blatt ${sheet.w}×${sheet.h}`,
);
