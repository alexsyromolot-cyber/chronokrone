/**
 * Run-Karte im Browser: Spitzname eingeben, Karte als Bild sehen und speichern,
 * Code kopieren – und fremde Codes ansehen. Das Bild entsteht in einem Canvas, ohne Server.
 */
import Decimal from 'break_eternity.js';
import { formatNumber } from '../core/format';
import { t, tk } from '../i18n';
import { decodeRunCard, encodeRunCard, NAME_MAX, runCardOf, type RunCard } from '../systems/runcard';
import type { GameState } from '../systems/state';
import { esc } from './dom';

const W = 640;
const H = 360;

const hms = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

function curseNames(key: string): string {
  return key
    ? key
        .split('+')
        .map((c) => tk(`curse.${c}`))
        .join(' + ')
    : t('runcard.noCurse');
}

/** Zeichnet die Karte – Pixel-Optik passend zum Spiel, Farben aus der aktuellen Epoche. */
export function drawRunCard(canvas: HTMLCanvasElement, card: RunCard, accent: string): void {
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0f1a');
  bg.addColorStop(1, '#1b2542');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Sterne: fest verteilt (aus dem Namen abgeleitet), damit dieselbe Karte immer gleich aussieht.
  let seed = [...card.name].reduce((a, c) => a + c.charCodeAt(0), 7);
  g.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 60; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const x = (seed / 233280) * W;
    seed = (seed * 9301 + 49297) % 233280;
    g.fillRect(Math.floor(x), Math.floor((seed / 233280) * H), 2, 2);
  }
  g.strokeStyle = accent;
  g.lineWidth = 4;
  g.strokeRect(6, 6, W - 12, H - 12);

  g.fillStyle = accent;
  g.font = 'bold 30px monospace';
  g.fillText(t('app.title').toUpperCase(), 28, 52);
  g.fillStyle = '#ffffff';
  g.font = 'bold 22px monospace';
  g.fillText(card.name || t('runcard.anonymous'), 28, 86);

  const rows: [string, string][] = [
    [t('runcard.highest'), formatNumber(new Decimal(card.highest))],
    [t('runcard.fastestJump'), card.fastestJump === null ? '–' : hms(card.fastestJump)],
    [
      t('runcard.progress'),
      t('runcard.progressValue', { epoch: card.epoch, loops: card.loops, wins: card.finaleWins }),
    ],
    [t('runcard.playtime'), hms(card.playtime)],
    [t('runcard.kills'), formatNumber(new Decimal(card.kills))],
  ];
  g.font = '16px monospace';
  rows.forEach(([label, value], i) => {
    g.fillStyle = '#9aa6c8';
    g.fillText(label, 28, 128 + i * 26);
    g.fillStyle = '#ffffff';
    // Lange Werte (z. B. Fortschritt) passend verkleinern statt über den Rand laufen lassen.
    const maxWidth = W - 250 - 28;
    let size = 16;
    g.font = `${size}px monospace`;
    while (g.measureText(value).width > maxWidth && size > 10) g.font = `${--size}px monospace`;
    g.fillText(value, 250, 128 + i * 26);
    g.font = '16px monospace';
  });

  const challenges = Object.entries(card.challenges)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);
  g.fillStyle = accent;
  g.font = 'bold 16px monospace';
  g.fillText(t('runcard.challenges'), 28, 270);
  g.font = '14px monospace';
  g.fillStyle = '#ffffff';
  if (challenges.length === 0) g.fillText(t('runcard.noChallenges'), 28, 292);
  // Eine Zeile je Bestzeit; zu lange Fluch-Kombinationen werden mit „…“ gekürzt.
  challenges.forEach(([key, sec], i) => {
    let text = `${hms(sec)}  ${curseNames(key)}`;
    while (g.measureText(text).width > W - 56 && text.length > 12) text = `${text.slice(0, -2)}…`;
    g.fillText(text, 28, 292 + i * 20);
  });
}

/** Overlay öffnen. Der Spitzname wird in den Einstellungen gemerkt. */
export function openRunCard(state: GameState, accent: string, onName: (name: string) => void): void {
  document.querySelector('.runcard-backdrop')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop runcard-backdrop';
  backdrop.innerHTML = `<div class="modal runcard" role="dialog" aria-modal="true" aria-label="${esc(t('runcard.title'))}">
    <h2>${esc(t('runcard.title'))}</h2>
    <label>${esc(t('runcard.name'))} <input class="rc-name" maxlength="${NAME_MAX}" value="${esc(state.settings.nickname)}"></label>
    <canvas class="rc-canvas" width="${W}" height="${H}"></canvas>
    <div class="modal-buttons">
      <button class="btn primary rc-png">${esc(t('runcard.savePng'))}</button>
      <button class="btn rc-copy">${esc(t('runcard.copyCode'))}</button>
    </div>
    <textarea class="rc-code" rows="3" readonly></textarea>
    <h3>${esc(t('runcard.viewTitle'))}</h3>
    <textarea class="rc-input" rows="2" placeholder="${esc(t('runcard.pastePlaceholder'))}"></textarea>
    <div class="modal-buttons">
      <button class="btn rc-view">${esc(t('runcard.view'))}</button>
      <button class="btn rc-close">${esc(t('runcard.close'))}</button>
    </div>
    <p class="hint rc-msg"></p>
  </div>`;
  document.body.appendChild(backdrop);

  const $ = <T extends Element>(sel: string) => backdrop.querySelector<T>(sel)!;
  const canvas = $<HTMLCanvasElement>('.rc-canvas');
  const nameInput = $<HTMLInputElement>('.rc-name');
  const codeBox = $<HTMLTextAreaElement>('.rc-code');
  const msg = $<HTMLElement>('.rc-msg');
  let shown: RunCard = runCardOf(state, nameInput.value);

  const redraw = (card: RunCard) => {
    shown = card;
    drawRunCard(canvas, card, accent);
    codeBox.value = encodeRunCard(card);
  };
  redraw(shown);

  nameInput.addEventListener('input', () => {
    onName(nameInput.value);
    redraw(runCardOf(state, nameInput.value));
  });
  $('.rc-png').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `chronokrone-${(shown.name || 'run').replace(/[^\w-]+/g, '_')}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  });
  $('.rc-copy').addEventListener('click', () => {
    codeBox.select();
    navigator.clipboard?.writeText(codeBox.value).then(
      () => (msg.textContent = t('runcard.copied')),
      () => (msg.textContent = t('runcard.copyManual')),
    );
  });
  $('.rc-view').addEventListener('click', () => {
    const card = decodeRunCard($<HTMLTextAreaElement>('.rc-input').value);
    msg.textContent = card
      ? t('runcard.viewing', { name: card.name || t('runcard.anonymous') })
      : t('runcard.invalid');
    if (card) redraw(card);
  });
  $('.rc-close').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
}
