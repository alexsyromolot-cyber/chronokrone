/**
 * Juice: Partikel (PixiJS) und aufsteigende Zahlen (HTML über dem Canvas).
 *
 * Beides mit Objekt-Pools: Statt bei jedem Treffer neue Objekte zu erzeugen und
 * wegzuwerfen, werden feste Mengen wiederverwendet. Das hält den Speicher auch nach
 * Stunden flach (Qualitätsregel „flüssig nach Stunden“).
 *
 * Zahlen als HTML statt Pixi-Text, weil Text auf 320×180 hochskaliert matschig wird.
 */
import type { Container } from 'pixi.js';
import { Graphics } from 'pixi.js';
import { formatNumber } from '../core/format';
import { decimalSeparator } from '../i18n';
import { VIEW_H, VIEW_W } from './view';
import { uiIcon } from '../ui/ui-icons';

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  /** Partikel fallen, Geschosse fliegen gerade. */
  gravity: number;
}

const PARTICLES = 96;
const FLOATERS = 40;
/** Münzen, die von einem Abschuss in die Währungsleiste fliegen (Pool). */
const COINS = 16;
const COIN_MS = 650;

export class Effects {
  private readonly particles: Particle[] = [];
  private nextParticle = 0;
  private readonly floaters: HTMLSpanElement[] = [];
  private nextFloater = 0;
  private readonly coins: HTMLImageElement[] = [];
  private nextCoin = 0;

  constructor(layer: Container, domLayer: HTMLElement) {
    for (let i = 0; i < PARTICLES; i++) {
      const g = new Graphics().rect(0, 0, 2, 2).fill('#ffffff');
      g.visible = false;
      layer.addChild(g);
      this.particles.push({ g, vx: 0, vy: 0, life: 0, gravity: 0 });
    }
    for (let i = 0; i < FLOATERS; i++) {
      const span = document.createElement('span');
      span.className = 'floater';
      // Animation über CSS; nach Ende einfach unsichtbar, bis der Pool sie wiederverwendet.
      span.addEventListener('animationend', () => span.classList.remove('show'));
      domLayer.appendChild(span);
      this.floaters.push(span);
    }
    const coinUrl = uiIcon('res-gold');
    for (let i = 0; coinUrl && i < COINS; i++) {
      const img = document.createElement('img');
      img.src = coinUrl;
      img.className = 'flying-coin';
      img.alt = '';
      img.hidden = true;
      document.body.appendChild(img);
      this.coins.push(img);
    }
  }

  /**
   * Münze fliegt vom Schlachtfeld (Logik-Koordinaten) zum Gold in der Währungsleiste.
   * Fliegt in einem Bogen (Web Animations API) und ploppt am Ziel kurz auf.
   */
  flyCoin(x: number, y: number, canvas: HTMLElement): void {
    const coin = this.coins[this.nextCoin];
    const target = document.querySelector<HTMLElement>('.res-gold .res-icon, .res-gold');
    if (!coin || !target) return;
    this.nextCoin = (this.nextCoin + 1) % this.coins.length;
    const from = canvas.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const sx = from.left + (x / VIEW_W) * from.width;
    const sy = from.top + (y / VIEW_H) * from.height;
    const tx = to.left + to.width / 2 - sx;
    const ty = to.top + to.height / 2 - sy;
    coin.hidden = false;
    coin.style.left = `${sx - 12}px`;
    coin.style.top = `${sy - 12}px`;
    // Erst nach oben ausholen, dann in die Leiste – wirkt wie ein Wurf, nicht wie ein Lineal.
    const anim = coin.animate(
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${tx * 0.35}px, ${ty * 0.35 - 60}px) scale(1.2)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${tx}px, ${ty}px) scale(0.7)`, opacity: 0.9 },
      ],
      { duration: COIN_MS, easing: 'ease-in' },
    );
    // Am Ziel kurz aufploppen und verglühen – die Leiste selbst wird ständig neu geschrieben,
    // ein Effekt dort ginge verloren.
    anim.onfinish = () => {
      const pop = coin.animate(
        [
          { transform: `translate(${tx}px, ${ty}px) scale(0.7)`, opacity: 1 },
          { transform: `translate(${tx}px, ${ty}px) scale(1.8)`, opacity: 0 },
        ],
        { duration: 220, easing: 'ease-out' },
      );
      pop.onfinish = () => (coin.hidden = true);
    };
  }

  burst(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.nextParticle]!;
      this.nextParticle = (this.nextParticle + 1) % PARTICLES;
      p.g.tint = color;
      p.g.position.set(x, y);
      p.g.visible = true;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 20 + Math.random() * 40;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 30;
      p.life = 0.4 + Math.random() * 0.3;
      p.gravity = 140;
    }
  }

  /** Pfeil oder Zauberblitz: fliegt in FLIGHT Sekunden vom Schützen zum Ziel. */
  projectile(x0: number, y0: number, x1: number, y1: number, color: string): void {
    const FLIGHT = 0.16;
    const p = this.particles[this.nextParticle]!;
    this.nextParticle = (this.nextParticle + 1) % PARTICLES;
    p.g.tint = color;
    p.g.alpha = 1;
    p.g.position.set(x0, y0);
    p.g.visible = true;
    p.vx = (x1 - x0) / FLIGHT;
    p.vy = (y1 - y0) / FLIGHT;
    p.life = FLIGHT;
    p.gravity = 0;
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.g.x += p.vx * dt;
      p.g.y += p.vy * dt;
      p.g.alpha = Math.min(1, p.life * 3);
      if (p.life <= 0) p.g.visible = false;
    }
  }

  text(x: number, y: number, text: string, variant: 'hit' | 'click' | 'gold' | 'scrap' | 'level'): void {
    const span = this.floaters[this.nextFloater]!;
    this.nextFloater = (this.nextFloater + 1) % FLOATERS;
    span.textContent = text;
    span.className = `floater ${variant}`;
    span.style.left = `${(x / VIEW_W) * 100}%`;
    span.style.top = `${(y / VIEW_H) * 100}%`;
    // Reflow erzwingen, damit die CSS-Animation auch bei Wiederverwendung neu startet.
    void span.offsetWidth;
    span.classList.add('show');
  }

  number(x: number, y: number, amount: number, variant: 'hit' | 'click'): void {
    this.text(
      x,
      y,
      formatNumber(amount, { decimalSeparator: decimalSeparator(), smallDecimals: 1 }),
      variant,
    );
  }

  loot(x: number, y: number, gold: number, scrap: boolean): void {
    this.text(
      x,
      y,
      `+${formatNumber(gold, { decimalSeparator: decimalSeparator(), smallDecimals: 1 })}`,
      'gold',
    );
    if (scrap) this.text(x + 8, y - 8, '+1 ⚙', 'scrap');
  }
}
