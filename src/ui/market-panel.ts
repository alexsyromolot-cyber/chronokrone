/**
 * Markt (im Gebäudedetail des Markts) und Sammlung „Begleiter“ (eigener Bereich ab Epoche 2).
 */
import { BASE_PRICES, MARKET } from '../data/market';
import { COMPANION_RULES, COMPANIONS } from '../data/companions';
import { t, tk } from '../i18n';
import { buyAmount, companionSetMultiplier, price, sellAmount, spread, TRADABLE } from '../systems/trade';
import type { GameState } from '../systems/state';
import { esc, num, pct, tip } from './dom';
import { action } from './panels-top';

/** Mini-Kurve als Inline-SVG: zeigt, ob der Preis gerade hoch oder tief steht. */
function sparkline(values: number[], base: number): string {
  if (values.length < 2) return '<svg class="spark" viewBox="0 0 60 16"></svg>';
  const lo = Math.min(base, ...values);
  const hi = Math.max(base, ...values);
  const span = hi - lo || 1;
  const y = (v: number) => (15 - ((v - lo) / span) * 14).toFixed(1);
  const step = 60 / (MARKET.history - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${y(v)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 60 16"><line x1="0" x2="60" y1="${y(base)}" y2="${y(base)}" class="spark-base"/><polyline points="${pts}"/></svg>`;
}

export function marketHtml(state: GameState): string {
  const s = spread(state);
  const rows = TRADABLE.filter((id) => state.resources[id].gt(0) || state.market.prices[id] !== undefined)
    .map((id) => {
      const p = price(state, id);
      const base = BASE_PRICES[id]!;
      const trend = p >= base * 1.1 ? 'good' : p <= base * 0.9 ? 'bad' : '';
      const sell = sellAmount(state, id);
      const buy = buyAmount(state, id);
      const buyCost = buy * p * (1 + s);
      return `<tr>
        <td>${esc(tk(`res.${id}`))}</td>
        <td class="${trend}" ${tip(t('market.priceTip', { base: num(base, 2) }))}>${num(p, 2)}</td>
        <td>${sparkline(state.market.history[id] ?? [], base)}</td>
        <td><button class="btn small" ${sell < 1 ? 'disabled' : ''} ${action({ type: 'marketSell', resource: id })} ${tip(
          t('market.sellTip', { n: num(sell), gold: num(sell * p * (1 - s)) }),
        )}>${esc(t('market.sell'))}</button>
        <button class="btn small" ${state.resources.gold.lt(buyCost) || buy < 1 ? 'disabled' : ''} ${action({
          type: 'marketBuy',
          resource: id,
        })} ${tip(t('market.buyTip', { n: num(buy), gold: num(buyCost) }))}>${esc(t('market.buy'))}</button></td>
      </tr>`;
    })
    .join('');
  return `<p>${esc(t('market.intro', { spread: pct(s), step: MARKET.priceStep }))}</p>
    <table class="market">${rows}</table>`;
}

export function companionsHtml(state: GameState): string {
  const found = COMPANIONS.filter((c) => state.companions[c.id]).length;
  const items = COMPANIONS.map((c) => {
    const has = !!state.companions[c.id];
    const effect = t(c.kind === 'damage' ? 'companion.damage' : 'companion.production', {
      cls: tk(`class.${c.classId}`),
      pct: pct(c.bonus),
    });
    return `<li class="${has ? 'done' : 'locked'}" ${tip(has ? effect : t('companion.unknown'))}>${esc(
      has ? tk(`companion.${c.id}`) : '???',
    )}${has ? ` <small>${esc(effect)}</small>` : ''}</li>`;
  }).join('');
  const set = companionSetMultiplier(state) > 1;
  return `<p>${esc(
    t('companion.intro', {
      found,
      total: COMPANIONS.length,
      chance: pct(COMPANION_RULES.findChance),
      pity: COMPANION_RULES.pity,
    }),
  )}</p>
    <ul class="companion-list">${items}</ul>
    <p class="${set ? 'good' : 'hint'}">${esc(t('companion.set', { pct: pct(COMPANION_RULES.setBonus) }))}</p>`;
}
