/**
 * Erfolge (Abzeichen-Raster) und Statistik-Seite mit Epochen-Dauer und Zeitstrahl.
 */
import { ACHIEVEMENTS, type MetricId } from '../data/achievements';
import { t, tk } from '../i18n';
import { achievementCount, achievementMultiplier, achievementTier, metric } from '../systems/achievements';
import type { GameState } from '../systems/state';
import { esc, num, tip } from './dom';

const mmss = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(Math.floor(sec % 60)).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

export function achievementTitle(id: string, metricId: MetricId): string {
  return `${tk(`achm.${metricId}`)} ${achievementTier(id)}`.trim();
}

export function achievementsHtml(state: GameState): string {
  const badges = ACHIEVEMENTS.map((a) => {
    const at = state.achievements[a.id];
    const done = at !== undefined;
    if (a.secret && !done) {
      return `<li class="badge secret" ${tip(`${t('ach.secret')}\n${t('ach.secretDesc')}`)}>?</li>`;
    }
    const title = achievementTitle(a.id, a.metric);
    const desc = tk(`achd.${a.metric}`, { n: num(a.threshold, a.threshold < 1 ? 1 : 0) });
    const progress = done
      ? t('ach.unlockedAt', { time: mmss(at) })
      : `${num(metric(state, a.metric), 1)} / ${num(a.threshold, 1)}`;
    return `<li class="badge ${done ? 'done' : ''}" ${tip(`${title}\n${desc}\n${progress}`)}>${esc(
      achievementTier(a.id) || '★',
    )}</li>`;
  }).join('');
  return `<p class="good">${esc(
    t('ach.count', {
      n: achievementCount(state),
      total: ACHIEVEMENTS.length,
      mult: num(achievementMultiplier(state), 2),
    }),
  )}</p><ul class="badges">${badges}</ul>`;
}

/** Kennzahlen für die Statistik-Seite (geheime ohne eigene Zeile). */
const STAT_ROWS: MetricId[] = [
  'kills',
  'wins',
  'battles',
  'highestSiege',
  'clicks',
  'goldEarned',
  'scrapCollected',
  'buildingsBuilt',
  'maxBuildingLevel',
  'recruits',
  'maxUnitLevel',
  'research',
  'skillRanksBought',
  'spellsCast',
  'bestiary',
  'elites',
  'timeMachines',
  'jumps',
  'totalShards',
  'chronicleRanks',
  'eventsSeen',
  'dronesCaught',
  'diceGames',
  'ordersExecuted',
  'retreats',
];

export function statsHtml(state: GameState): string {
  const rows = STAT_ROWS.map(
    (m) => `<tr><th>${esc(tk(`stat.${m}`))}</th><td>${esc(num(metric(state, m)))}</td></tr>`,
  ).join('');
  const epochs = state.epochTimes
    .map((sec, i) => `<li>${esc(t('stats.epochTime', { n: i + 1, time: mmss(sec) }))}</li>`)
    .join('');
  const timeline = [...state.timeline]
    .reverse()
    .map((e) => {
      const [head] = e.key.split('.');
      const template = head === 'unlock' ? e.key : (head ?? e.key);
      return `<li><time>${mmss(e.time)}</time> ${esc(tk(`tl.${template}`, e.params))}</li>`;
    })
    .join('');
  return `<table class="stats-table">${rows}<tr><th>${esc(tk('stat.playHours'))}</th><td>${esc(mmss(state.time))}</td></tr></table>
    ${epochs ? `<h3 class="sub">${esc(t('stats.epochs'))}</h3><ul class="plain">${epochs}</ul>` : ''}
    ${timeline ? `<h3 class="sub">${esc(t('timeline.title'))}</h3><ul class="log-list timeline">${timeline}</ul>` : ''}`;
}
