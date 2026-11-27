/**
 * „Während du weg warst …“: die letzte Sitzung im Zeitraffer. Die Zahlen zählen hoch,
 * bei „Bewegung reduzieren“ stehen sie sofort da.
 */
import { t } from '../i18n';
import type { MessageKey } from '../i18n/de';
import type { SessionSnapshot } from '../systems/recap';
import { esc, num } from './dom';
import { showModal } from './modal';

const duration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
};

export function showRecap(
  back: { summary: SessionSnapshot; awayMs: number; restedMinutes: number },
  reducedMotion: boolean,
): void {
  const s = back.summary;
  const rows: [MessageKey, number][] = [
    ['recap.kills', s.kills],
    ['recap.wins', s.wins],
    ['recap.buildings', s.buildingsBuilt],
    ['recap.gold', s.goldEarned],
    ['recap.skills', s.skillRanksBought],
    ['recap.research', s.research],
    ['recap.achievements', s.achievements],
    ['recap.jumps', s.epoch],
  ];
  showModal({
    title: t('recap.title'),
    lines: [
      t('recap.away', { time: duration(back.awayMs / 1000) }),
      t('recap.last', { time: duration(s.time) }),
      t('recap.rested', { min: Math.round(back.restedMinutes) }),
    ],
    variant: 'recap',
    buttons: [{ label: t('recap.continue'), primary: true }],
  });
  // Tabelle mit hochzählenden Werten vor den Knöpfen einfügen; Nullen weglassen.
  const modal = document.querySelector('.modal-backdrop.recap .modal');
  const buttons = modal?.querySelector('.modal-buttons');
  if (!modal || !buttons) return;
  const table = document.createElement('table');
  table.className = 'stats-table recap-table';
  table.innerHTML = rows
    .filter(([, v]) => v > 0)
    .map(
      ([key, v]) =>
        `<tr><th>${esc(t(key))}</th><td data-count="${v}">${reducedMotion ? esc(num(v)) : '0'}</td></tr>`,
    )
    .join('');
  modal.insertBefore(table, buttons);
  if (reducedMotion) return;
  const cells = [...table.querySelectorAll<HTMLElement>('[data-count]')];
  const startAt = performance.now();
  const animate = (now: number) => {
    const p = Math.min(1, (now - startAt) / 1500);
    const ease = 1 - (1 - p) ** 3;
    for (const c of cells) c.textContent = num(Number(c.dataset.count) * ease);
    if (p < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}
