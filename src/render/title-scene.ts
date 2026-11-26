/**
 * Platzhalter-Szene für Meilenstein 1: Nachthimmel, Burg-Silhouette und ein
 * fallender Meteor. Sie beweist, dass die Pipeline (PixiJS, Integer-Skalierung,
 * Interpolation zwischen Logik-Ticks) funktioniert. Wird in Meilenstein 2 ersetzt.
 */
import { Application, Graphics } from 'pixi.js';

/** Interne Auflösung: klein, damit jedes Pixel sichtbar groß skaliert wird. */
export const VIEW_WIDTH = 320;
export const VIEW_HEIGHT = 180;

export interface TitleScene {
  /** Pro Frame aufrufen. `meteorProgress` 0–1, bereits interpoliert. */
  draw(meteorProgress: number): void;
  destroy(): void;
}

export async function createTitleScene(host: HTMLElement): Promise<TitleScene> {
  const app = new Application();
  await app.init({
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    background: '#0b0f1a',
    antialias: false,
    // Wir steuern das Rendern selbst aus dem Haupt-Loop, nicht über Pixis Ticker.
    autoStart: false,
  });
  host.appendChild(app.canvas);

  const stars = new Graphics();
  // Deterministische Verteilung: Die Sterne stehen bei jedem Laden gleich.
  for (let i = 0; i < 40; i++) {
    const x = (i * 73) % VIEW_WIDTH;
    const y = (i * 37) % 110;
    stars.rect(x, y, 1, 1).fill(i % 5 === 0 ? '#f3ead7' : '#5d6b94');
  }

  const castle = new Graphics()
    // Hügel
    .rect(0, 150, VIEW_WIDTH, 30)
    .fill('#1c2a1f')
    // Mauer
    .rect(90, 120, 140, 30)
    .fill('#3b3f52');
  // Zinnen
  for (let x = 90; x < 230; x += 10) castle.rect(x, 114, 6, 6).fill('#3b3f52');
  // Türme
  castle.rect(80, 96, 24, 54).fill('#454a60').rect(216, 96, 24, 54).fill('#454a60');
  // Warmes Fensterlicht: Das Düstere entsteht über Kontrast, nicht über dunkle Farben überall.
  castle.rect(89, 110, 4, 6).fill('#f2b33d').rect(225, 110, 4, 6).fill('#f2b33d');
  // Tor
  castle.rect(150, 130, 20, 20).fill('#2a2d3b');

  const meteor = new Graphics();
  app.stage.addChild(stars, castle, meteor);

  return {
    draw(progress: number) {
      meteor.clear();
      const x = Math.round(300 - progress * 120);
      const y = Math.round(10 + progress * 100);
      // Schweif aus drei Segmenten, nach hinten dunkler.
      meteor
        .rect(x + 9, y - 9, 3, 3)
        .fill('#7a3b1d')
        .rect(x + 5, y - 5, 3, 3)
        .fill('#c2602a')
        .rect(x, y, 4, 4)
        .fill('#f2b33d');
      app.render();
    },
    destroy() {
      app.destroy(true);
    },
  };
}
