/**
 * Der Erzähler unten links: Pixelfigur mit Sprechblase für die neueste Zeile.
 * Ein Klick öffnet den Verlauf (die frühere „Chronik des Erzählers“).
 */
import { t } from '../i18n';
import { spriteUrl } from '../render/pixel';
import { NARRATOR_SPRITE } from '../render/icons';
import type { GameState } from '../systems/state';
import { esc } from './dom';
import { logHtml } from './panels-top';

export function narratorHtml(state: GameState): string {
  const last = state.log.at(-1);
  const line = last ? t(last.key, last.params) : '';
  return `<button class="narrator-figure" data-narrator aria-label="${esc(t('narrator.open'))}">
      <img src="${spriteUrl(NARRATOR_SPRITE)}" alt="">
    </button>
    ${line ? `<div class="bubble" data-narrator>${esc(line)}</div>` : ''}`;
}

export function narratorLogHtml(state: GameState): string {
  return `<div class="narrator-log-head"><strong>${esc(t('log.title'))}</strong>
      <button class="btn small" data-narrator-close aria-label="${esc(t('narrator.close'))}">×</button></div>
    <div id="log-body">${logHtml(state)}</div>`;
}
