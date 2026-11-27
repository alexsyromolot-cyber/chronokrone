/**
 * Reaktor-Steuerung (Epoche 4) im Detail von Reaktor und Kühlturm, dazu die Relikt-Sammlung.
 */
import { MELTDOWN, REACTOR, RELIC_IDS, RELIC_NUMBERS, RELIC_RULES } from '../data/reactor';
import { t, tk } from '../i18n';
import { heatRate, reactorBonus, reactorTile, rodUse } from '../systems/reactor';
import type { GameState } from '../systems/state';
import { esc, num, pct, tip } from './dom';
import { action } from './panels-top';

export function reactorHtml(state: GameState): string {
  const rs = state.reactor;
  const rate = heatRate(state);
  const heatClass = rs.heat >= REACTOR.warnAt ? 'bad' : rs.heat >= 0.5 ? 'warn' : 'good';
  const formula = t('reactor.tip', {
    bonus: pct(REACTOR.bonusPerLevel),
    heat: num(REACTOR.heatPerLevel, 3),
    cool: num(REACTOR.coolPerLevel, 3),
    rods: num(REACTOR.rodsPerLevel, 2),
  });
  const buttons = REACTOR.throttles
    .map(
      (th) =>
        `<button class="btn small ${rs.throttle === th ? 'primary' : ''}" ${action({ type: 'setThrottle', throttle: th })} ${tip(
          t('reactor.preview', { rate: num(heatRate(state, th) * 100, 2) }),
        )}>${esc(tk(`reactor.throttle.${th * 100}`))}</button>`,
    )
    .join('');
  const seconds = rate > 0 ? Math.ceil((1 - rs.heat) / rate) : null;
  return `<div class="reactor" ${tip(formula)}>
    <p>${esc(t('reactor.status', { bonus: pct(reactorBonus(state)), rods: num(rodUse(state), 2) }))} ⓘ</p>
    <div class="heat-bar ${heatClass}"><span style="width:${Math.min(100, rs.heat * 100).toFixed(1)}%"></span></div>
    <p class="${heatClass}">${esc(
      t('reactor.heat', { heat: pct(rs.heat), rate: num(rate * 100, 2) }) +
        (seconds !== null ? ' ' + t('reactor.eta', { s: seconds }) : ''),
    )}</p>
    ${reactorTile(state) ? `<div class="hud-row">${buttons}</div>` : `<p class="hint">${esc(t('reactor.none'))}</p>`}
    ${rs.fuel < 1 && rs.throttle > 0 ? `<p class="bad">${esc(t('reactor.noRods', { pct: pct(rs.fuel) }))}</p>` : ''}
    <p class="hint">${esc(t('reactor.meltdownHint', { gold: pct(MELTDOWN.containGoldShare) }))}</p>
  </div>`;
}

/** Was ein Relikt tut – mit den echten Zahlen aus data/reactor.ts. */
function relicText(id: string): string {
  const N = RELIC_NUMBERS;
  return tk(`relic.${id}.desc`, {
    heat: pct(N.leadApronHeat),
    delay: N.hourglassDelay,
    share: pct(N.twinStrikeShare),
    mirror: pct(N.mirrorShare),
    mult: N.chaliceMult,
    seconds: N.chaliceSeconds,
  });
}

export function relicsHtml(state: GameState): string {
  const found = RELIC_IDS.filter((id) => state.relics[id]).length;
  const list = RELIC_IDS.map((id) =>
    state.relics[id]
      ? `<li class="done"><b>${esc(tk(`relic.${id}`))}</b> <small>${esc(relicText(id))}</small></li>`
      : `<li class="locked" ${tip(t('companion.unknown'))}>???</li>`,
  ).join('');
  return `<p>${esc(
    t('relics.intro', {
      found,
      total: RELIC_IDS.length,
      chance: pct(RELIC_RULES.findChance),
      pity: RELIC_RULES.pity,
    }),
  )}</p>
    <ul class="companion-list">${list}</ul>
    <p class="${found === RELIC_IDS.length ? 'good' : 'hint'}">${esc(t('relics.set', { pct: pct(RELIC_RULES.setBonus) }))}</p>`;
}
