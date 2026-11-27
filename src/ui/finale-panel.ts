/**
 * Sammlung „Komplettierung“ und der Abspann nach dem Sieg über das Mutterschiff.
 */
import { COMPLETION } from '../data/starship';
import { EPOCHS } from '../data/epochs';
import { t, tk } from '../i18n';
import { completionActive, completionBonus, completionParts, completionShare } from '../systems/starship';
import type { GameState } from '../systems/state';
import { esc, pct } from './dom';
import { showModal, type ModalButton } from './modal';

export function completionHtml(state: GameState): string {
  const rows = completionParts(state)
    .map((p) => {
      const done = p.have >= p.total;
      return `<li class="${done ? 'done' : ''}">${esc(
        t('completion.row', { name: tk(`completion.part.${p.id}`), have: p.have, total: p.total }),
      )} <span class="bar"><span style="width:${Math.min(100, (p.have / p.total) * 100).toFixed(1)}%"></span></span></li>`;
    })
    .join('');
  return `<p>${esc(
    t('completion.intro', {
      pct: pct(completionShare(state)),
      bonus: pct(completionBonus(state)),
      max: pct(COMPLETION.maxBonus),
    }),
  )}</p>
    ${completionActive(state) ? '' : `<p class="hint">${esc(t('completion.inactive'))}</p>`}
    <ul class="completion-list">${rows}</ul>`;
}

const hms = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

/** Abspann: Geschichte, Zahlen des Durchlaufs, Mitwirkende. Extra-Knöpfe (z. B. Zeitschleife) von außen. */
export function showCredits(state: GameState, reducedMotion: boolean, extra: ModalButton[] = []): void {
  const epochs = state.epochTimes
    .slice(-EPOCHS.length)
    .map((sec, i) => t('credits.epoch', { n: i + 1, time: hms(sec) }));
  showModal({
    title: t('credits.title'),
    lines: [
      t('credits.story1'),
      t('credits.story2'),
      t('credits.story3'),
      t('credits.stats', {
        time: hms(state.time),
        kills: state.stats.kills,
        clicks: state.stats.clicks,
        jumps: state.epochTimes.length - state.finale.wins,
      }),
      ...epochs,
      t('credits.roles'),
      t('credits.thanks'),
    ],
    variant: `celebrate credits ${reducedMotion ? '' : 'animated'}`,
    buttons: [...extra, { label: t('credits.close'), primary: extra.length === 0 }],
  });
}
