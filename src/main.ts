/**
 * Einstiegspunkt im Browser. Verbindet die DOM-freie Spiellogik (core/) mit
 * Darstellung (render/) und Oberfläche. Hier – und nur hier – laufen
 * requestAnimationFrame und DOM-Zugriffe zusammen.
 */
import Decimal from 'break_eternity.js';
import './style.css';
import { formatNumber } from './core/format';
import { FixedStepLoop } from './core/loop';
import { decimalSeparator, getLocale, setLocale, t } from './i18n';
import type { MessageKey } from './i18n/de';
import { createTitleScene } from './render/title-scene';

/** Dauer eines Meteor-Durchflugs in Logik-Ticks (20 Ticks = 1 s). */
const METEOR_TICKS = 80;

// Platzhalter-Zustand für Meilenstein 1: nur, um Loop und Formatierung sichtbar zu machen.
const state = { gold: new Decimal(0), meteorTick: 0 };

const loop = new FixedStepLoop((dt) => {
  // Exponentiell wachsendes Gold zeigt, dass Suffixe und große Zahlen funktionieren.
  state.gold = state.gold.add(1).mul(Decimal.pow(1.5, dt));
  state.meteorTick = (state.meteorTick + 1) % METEOR_TICKS;
});

function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Element fehlt im HTML: ${selector}`);
  return found;
}

function applyTexts(): void {
  document.documentElement.lang = getLocale();
  for (const node of document.querySelectorAll<HTMLElement>('[data-i18n]')) {
    node.textContent = t(node.dataset.i18n as MessageKey);
  }
  el('#lang').textContent = t('lang.switch');
}

async function start(): Promise<void> {
  applyTexts();
  el('#lang').addEventListener('click', () => {
    setLocale(getLocale() === 'de' ? 'en' : 'de');
    applyTexts();
  });

  const scene = await createTitleScene(el('#stage'));
  const goldEl = el('#gold');
  const ticksEl = el('#ticks');

  let last = performance.now();
  let lastShownTicks = -1;
  const frame = (now: number) => {
    loop.advance(now - last);
    last = now;
    scene.draw((state.meteorTick + loop.alpha) / METEOR_TICKS);

    // DOM nur anfassen, wenn sich wirklich etwas geändert hat (Qualitätsregel: flüssig nach Stunden).
    if (loop.ticks !== lastShownTicks) {
      lastShownTicks = loop.ticks;
      const gold = formatNumber(state.gold, { decimalSeparator: decimalSeparator() });
      goldEl.textContent = `${t('hud.gold')}: ${gold}`;
      ticksEl.textContent = `${t('hud.ticks')}: ${loop.ticks}`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Für den Playwright-Smoke-Test und spätere Debug-Werkzeuge.
  (window as unknown as { __chronokrone: unknown }).__chronokrone = { loop, state };
  document.body.dataset.ready = 'true';
}

void start();
