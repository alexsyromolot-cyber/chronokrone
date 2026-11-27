/**
 * Zeitmaschine: Checkliste aller Bedingungen mit Haken, Rechenorakel und Bau.
 * „Nie eine Wartezeit ohne nächstes sichtbares Ziel“ – hier sieht man genau, was fehlt.
 */
import { ELITES } from '../data/enemies';
import { t, tk } from '../i18n';
import type { GameState } from '../systems/state';
import {
  oracleBlocker,
  oracleCost,
  timeMachineBlocker,
  timeMachineChecklist,
  timeMachineCost,
} from '../systems/timemachine';
import { spriteUrl } from '../render/pixel';
import { ENEMY_SPRITES } from '../render/sprites';
import { costHtml, esc, reasonText, tip } from './dom';
import { action } from './panels-top';

const check = (ok: boolean) => `<span class="${ok ? 'good' : 'bad'}">${ok ? '✔' : '✘'}</span>`;

export function timeMachineHtml(state: GameState): string {
  const c = timeMachineChecklist(state);
  if (state.timeMachineAt !== null) {
    const m = Math.floor(state.timeMachineAt / 60);
    const s = String(Math.floor(state.timeMachineAt % 60)).padStart(2, '0');
    return `<p class="good">${esc(t('tm.done', { time: `${m}:${s}` }))}</p>`;
  }
  const parts = ELITES.map((e) => {
    const have = !!state.timeParts[e.enemy];
    const name = state.bestiary[e.enemy] ? tk(`enemy.${e.enemy}`) : '???';
    return `<li class="part ${have ? 'have' : ''} ${state.bestiary[e.enemy] ? 'seen' : ''}" ${tip(t('tm.partHint', { siege: e.siege + 1, name }))}>
      <img src="${spriteUrl(ENEMY_SPRITES[e.enemy])}" alt=""> ${check(have)}
    </li>`;
  }).join('');

  const oracleB = oracleBlocker(state);
  const oracle = state.oracle
    ? ''
    : `<div class="buy"><button class="btn" ${oracleB ? 'disabled' : ''} ${action({ type: 'buildOracle' })} ${tip(
        oracleB ? reasonText(oracleB) : t('tm.buildOracle'),
      )}>${esc(t('tm.buildOracle'))}</button>${costHtml(state, oracleCost())}</div>`;

  const tmB = timeMachineBlocker(state);
  return `<p>${check(c.parts.have >= c.parts.need)} ${esc(t('tm.parts', c.parts))}</p>
    <ul class="parts">${parts}</ul>
    <p>${check(c.oracle)} ${esc(t('tm.oracle'))}</p>${oracle}
    <p>${check(c.chronology)} ${esc(t('tm.chronology'))}</p>
    <p>${check(c.skills.have >= c.skills.need)} ${esc(t('tm.skills', c.skills))}</p>
    <div class="buy"><button class="btn primary" ${tmB ? 'disabled' : ''} ${action({ type: 'buildTimeMachine' })} ${tip(
      tmB ? reasonText(tmB) : t('tm.build'),
    )}>${esc(t('tm.build'))}</button>${costHtml(state, timeMachineCost())}</div>`;
}
