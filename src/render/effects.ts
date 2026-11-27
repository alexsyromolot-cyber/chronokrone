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

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
}

const PARTICLES = 96;
const FLOATERS = 40;

export class Effects {
  private readonly particles: Particle[] = [];
  private nextParticle = 0;
  private readonly floaters: HTMLSpanElement[] = [];
  private nextFloater = 0;

  constructor(layer: Container, domLayer: HTMLElement) {
    for (let i = 0; i < PARTICLES; i++) {
      const g = new Graphics().rect(0, 0, 2, 2).fill('#ffffff');
      g.visible = false;
      layer.addChild(g);
      this.particles.push({ g, vx: 0, vy: 0, life: 0 });
    }
    for (let i = 0; i < FLOATERS; i++) {
      const span = document.createElement('span');
      span.className = 'floater';
      // Animation über CSS; nach Ende einfach unsichtbar, bis der Pool sie wiederverwendet.
      span.addEventListener('animationend', () => span.classList.remove('show'));
      domLayer.appendChild(span);
      this.floaters.push(span);
    }
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
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy += 140 * dt;
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
