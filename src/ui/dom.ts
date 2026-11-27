/**
 * Kleine DOM-Helfer für die Panels.
 *
 * Panels bauen ihr HTML als Text und schreiben es nur, wenn es sich geändert hat.
 * Das ist simpel, schnell genug und erfüllt „UI nur bei Änderungen aktualisieren“.
 */
import type Decimal from 'break_eternity.js';
import { formatNumber } from '../core/format';
import { RESOURCES, RESOURCE_IDS } from '../data/resources';
import { decimalSeparator, t } from '../i18n';
import type { MessageKey } from '../i18n/de';
import { productionRates } from '../systems/castle';
import { secondsUntilAffordable, type Cost } from '../systems/resources';
import type { GameState } from '../systems/state';

const lastHtml = new WeakMap<HTMLElement, string>();

export function setHtml(el: HTMLElement, html: string): void {
  if (lastHtml.get(el) === html) return;
  lastHtml.set(el, html);
  el.innerHTML = html;
}

export function el<T extends HTMLElement = HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Element fehlt im HTML: ${selector}`);
  return found;
}

/** Für Text in HTML-Attributen und Inhalten (Tooltips enthalten Anführungszeichen). */
export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function num(value: number | Decimal, decimals = 0): string {
  return formatNumber(value, { decimalSeparator: decimalSeparator(), smallDecimals: decimals });
}

/** Prozent mit einer Nachkommastelle, ohne „,0“. */
export function pct(fraction: number): string {
  return num(Math.round(fraction * 1000) / 10, 1);
}

export function tip(text: string): string {
  return `data-tip="${esc(text)}"`;
}

/** Kostenliste: fehlende Ressourcen rot, dazu „leistbar in ~X s“ als nächstes sichtbares Ziel. */
export function costHtml(state: GameState, cost: Cost): string {
  const parts: string[] = [];
  for (const id of RESOURCE_IDS) {
    const c = cost[id];
    if (!c) continue;
    const ok = state.resources[id].gte(c);
    parts.push(
      `<span class="cost ${ok ? '' : 'missing'}" style="${ok ? `color:${RESOURCES[id].color}` : ''}">${num(c)} ${esc(t(`res.${id}`))}</span>`,
    );
  }
  const wait = secondsUntilAffordable(state, cost, productionRates(state));
  // Schlacht-Beute ist hier nicht eingerechnet – die Angabe ist also eine Obergrenze.
  let hint = '';
  if (wait > 0) {
    const text = Number.isFinite(wait) ? t('cost.wait', { s: Math.ceil(wait) }) : t('cost.never');
    hint = `<span class="wait">${esc(text)}</span>`;
  }
  return `<span class="costs">${parts.join(' ')}</span>${hint}`;
}

export function reasonText(key: MessageKey | null): string {
  return key ? t(key) : '';
}
