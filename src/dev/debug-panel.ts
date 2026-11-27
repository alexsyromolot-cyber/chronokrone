/**
 * Debug-Panel (Strg+Umschalt+D, im Dev-Modus zusätzlich per Knopf).
 * Zeitbeschleuniger, Vorspulen, Ressourcen, Skillpunkte, Schlacht gewinnen, Save löschen.
 * Epoche wählen und Sprung erzwingen folgen mit Meilenstein 4.
 */
import Decimal from 'break_eternity.js';
import type { FixedStepLoop } from '../core/loop';
import { RESOURCE_IDS } from '../data/resources';
import { t } from '../i18n';
import { dispatch } from '../systems/actions';
import { endBattle } from '../systems/battle';
import type { GameState } from '../systems/state';
import { esc } from '../ui/dom';

export interface DebugApi {
  getState(): GameState;
  loop: FixedStepLoop;
  resetSave(): void;
  rerender(): void;
}

const SPEEDS = [1, 2, 5, 10, 25, 50, 100];

export function installDebugPanel(root: HTMLElement, api: DebugApi): { toggle(): void } {
  const render = () => {
    const speedButtons = SPEEDS.map(
      (s) =>
        `<button class="btn small ${api.loop.speed === s ? 'primary' : ''}" data-debug="speed" data-value="${s}">×${s}</button>`,
    ).join('');
    root.innerHTML = `<h3>${esc(t('debug.title'))}</h3>
      <p>${esc(t('debug.speed', { speed: api.loop.speed }))}</p><div class="row">${speedButtons}</div>
      <div class="row">
        <button class="btn small" data-debug="ff">${esc(t('debug.ff'))}</button>
        <button class="btn small" data-debug="res">${esc(t('debug.resources'))}</button>
        <button class="btn small" data-debug="sp">${esc(t('debug.skillPoints'))}</button>
        <button class="btn small" data-debug="win">${esc(t('debug.win'))}</button>
      </div>
      <div class="row">
                <button class="btn small" data-debug="jump">${esc(t('debug.jump'))}</button>
        <button class="btn small" data-debug="shards">${esc(t('debug.shards'))}</button>
        <button class="btn small danger" data-debug="reset">${esc(t('debug.reset'))}</button>
      </div>
      <p class="hint">${esc(t('debug.simulate'))}</p>`;
  };

  root.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-debug]');
    if (!btn) return;
    const state = api.getState();
    switch (btn.dataset.debug) {
      case 'speed':
        api.loop.speed = Number(btn.dataset.value);
        break;
      case 'ff':
        api.loop.fastForward(3600);
        break;
      case 'res':
        // Absichtlich über das Lagerlimit hinaus – zum Testen von Kosten weiter oben.
        for (const id of RESOURCE_IDS) state.resources[id] = state.resources[id].add(new Decimal(1000));
        break;
      case 'sp':
        for (const c of Object.keys(state.skillPoints) as (keyof GameState['skillPoints'])[])
          state.skillPoints[c] += 5;
        break;
      case 'win':
        if (state.battle) {
          state.battle.wave = 8;
          endBattle(state, 'won');
        }
        break;
      case 'jump':
        // Alle Bedingungen erfüllen und springen – zum Testen der Epochen.
        state.battle = null;
        state.timeMachineAt = state.time;
        dispatch(state, { type: 'jump' });
        break;
      case 'shards':
        state.shards += 50;
        state.totalShards += 50;
        break;
      case 'reset':
        if (confirm(t('debug.resetConfirm'))) api.resetSave();
        break;
    }
    render();
    api.rerender();
  });

  return {
    toggle() {
      root.hidden = !root.hidden;
      if (!root.hidden) render();
    },
  };
}
