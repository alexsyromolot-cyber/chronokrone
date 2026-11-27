/**
 * Fenster in der Mitte (Ergebnis der Schlacht, Ereignis mit Entscheidung) und die
 * Countdown-Karte des Hofbefehls. Alles reine HTML-Erzeugung aus dem Spielzustand.
 */
import { BATTLE } from '../data/enemies';
import { t, tk } from '../i18n';
import type { GameState } from '../systems/state';
import { esc, num } from './dom';
import { eventHtml } from './events-panel';
import { action } from './panels-top';

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

/** Ergebnisfenster: muss weggeklickt werden, erst dann geht es ins Dorf. */
export function resultHtml(state: GameState): string {
  const r = state.scene.result;
  if (!r) return '';
  const won = r.result === 'won';
  const head = r.retreat ? 'result.retreatHead' : won ? 'result.won' : 'result.lost';
  const title =
    r.final && won
      ? 'result.finalTitle'
      : r.retreat
        ? 'result.retreatTitle'
        : won
          ? 'result.wonTitle'
          : 'result.lostTitle';
  const extras: string[] = [];
  for (const id of r.newEnemies) {
    extras.push(`<div class="result-note">${esc(t('result.newEnemy', { name: tk(`enemy.${id}`) }))}</div>`);
  }
  if (r.part)
    extras.push(
      `<div class="result-note big">${esc(t('result.part', { name: tk(`enemy.${r.part}`) }))}</div>`,
    );
  return `<div class="modal result-modal ${won ? 'won' : 'lost'}" role="dialog" aria-modal="true">
    <div class="result-head">${esc(t(head, { siege: r.siege + 1 }))}</div>
    <h2>${esc(t(title))}</h2>
    <p class="hint">${esc(t('result.summary', { wave: r.wave, total: BATTLE.wavesPerBattle, time: mmss(r.seconds), kills: r.kills }))}</p>
    <div class="result-grid">
      <div><span>${esc(t('result.gold'))}</span><b class="good">+${num(r.goldEarned)}</b></div>
      <div><span>${esc(t('result.xp'))}</span><b>+${num(r.xp)}</b></div>
    </div>
    ${extras.join('')}
    <button class="btn primary big" ${action({ type: 'dismissResult' })}>${esc(t('result.back'))}</button>
  </div>`;
}

/** Ereignis mit Entscheidung: das Spiel steht still, bis gewählt ist. */
export function eventModalHtml(state: GameState): string {
  if (!state.events.active) return '';
  return `<div class="modal event-modal" role="dialog" aria-modal="true">
    <div class="event-head"><span class="event-label">${esc(t('event.label'))}</span><span class="chip">${esc(t('event.paused'))}</span></div>
    ${eventHtml(state)}
  </div>`;
}

export function countdownHtml(state: GameState): string {
  const c = state.scene.countdown;
  if (c === null) return '';
  return `<strong>${esc(t('countdown.title'))}</strong>
    <span>${esc(t('countdown.text', { s: Math.max(0, Math.ceil(c)) }))}</span>
    <button class="btn small" ${action({ type: 'cancelCountdown' })}>${esc(t('countdown.cancel'))}</button>`;
}
