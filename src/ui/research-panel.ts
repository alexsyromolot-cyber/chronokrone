/**
 * Forschungsbaum als Raster: erforscht (grün), verfügbar (Gold), gesperrt (blass).
 */
import { RESEARCH } from '../data/research';
import { tk } from '../i18n';
import { hasResearch, researchBlocker } from '../systems/research';
import type { GameState } from '../systems/state';
import { esc, num, reasonText, tip } from './dom';
import { action } from './panels-top';

export function researchHtml(state: GameState): string {
  // Knoten späterer Epochen bleiben unsichtbar – der Baum wächst mit der Zeitreise.
  const nodes = RESEARCH.filter((r) => !r.epoch || r.epoch <= state.epoch)
    .map((r) => {
      const done = hasResearch(state, r.id);
      const blocker = researchBlocker(state, r.id);
      const unlocks = (r.buildings ?? []).map((b) => tk(`building.${b}`)).join(', ');
      const requires = r.requires.map((q) => tk(`research.${q}`)).join(', ');
      const tipText = [
        tk(`research.${r.id}`),
        tk(`research.${r.id}.desc`),
        unlocks ? tk('research.unlocks', { list: unlocks }) : '',
        requires ? `← ${requires}` : '',
        !done && blocker ? reasonText(blocker) : '',
      ]
        .filter(Boolean)
        .join('\n');
      const locked = blocker === 'reason.requiresResearch';
      const cls = done ? 'done' : locked ? 'locked' : blocker ? 'pending' : 'ready';
      // Gesperrte Knoten ohne erfüllte Voraussetzung zeigen nur „???“ – Neugier statt Spoiler.
      const anyReq = r.requires.length === 0 || r.requires.some((q) => hasResearch(state, q));
      const name = anyReq || done ? tk(`research.${r.id}`) : '???';
      return `<button class="node ${cls}" style="grid-column:${r.pos[0] + 1};grid-row:${r.pos[1] + 1}" ${
        done || blocker ? 'disabled' : ''
      } ${action({ type: 'research', id: r.id })} ${tip(tipText)}>
      <span class="name">${esc(name)}</span>
      <span class="cost">${done ? esc(tk('research.done')) : `${num(r.cost)} ${esc(tk('res.knowledge'))}`}</span>
    </button>`;
    })
    .join('');
  return `<div class="research-grid">${nodes}</div>`;
}
