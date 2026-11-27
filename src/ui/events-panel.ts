/**
 * Ereigniskarte, Jahreszeit-Anzeige und Würfeltisch.
 */
import { DICE, EVENTS, SEASON_EFFECTS, type DiceBet } from '../data/events';
import type { ResourceId } from '../data/resources';
import { t, tk } from '../i18n';
import { currentSeason, diceStake } from '../systems/events';
import type { GameState } from '../systems/state';
import { esc, num, pct, tip } from './dom';
import { action } from './panels-top';

export function eventHtml(state: GameState): string {
  const ev = state.events.active;
  if (!ev) return '';
  const def = EVENTS.find((e) => e.id === ev.id)!;
  const buttons = def.options
    .map(
      (o, i) =>
        `<button class="btn ${i === def.options.length - 1 ? 'primary' : ''}" ${action({ type: 'eventChoice', option: o })}>${esc(
          tk(`eventopt.${ev.id}.${o}`, ev.params),
        )}</button>`,
    )
    .join('');
  return `<h3>${esc(tk(`event.${ev.id}.title`))}</h3>
    <p>${esc(tk(`event.${ev.id}.log`, ev.params))}</p>
    <div class="event-choices">${buttons}</div>`;
}

export function seasonHtml(state: GameState): string {
  const season = currentSeason(state);
  const effects = (Object.entries(SEASON_EFFECTS[season]) as [ResourceId, number][])
    .map(([r, m]) => `${tk(`res.${r}`)} ×${num(m, 2)}`)
    .join(', ');
  return `<span class="season season-${season}" ${tip(t('season.tip', { effects: effects || t('season.none') }))}>${esc(
    tk(`season.${season}`),
  )}</span>`;
}

/** Würfeltisch in der Taverne: Chancen und Auszahlung stehen immer dabei. */
export function diceHtml(state: GameState): string {
  const stake = diceStake(state);
  const bets = (Object.keys(DICE.bets) as DiceBet[])
    .map((bet) => {
      const c = DICE.bets[bet].chance;
      return `<button class="btn small" ${stake < 1 ? 'disabled' : ''} ${action({ type: 'rollDice', bet })}>${esc(
        tk(`dice.${bet}`, { chance: pct(c), mult: num(1 / c, 2) }),
      )}</button>`;
    })
    .join('');
  const last = state.events.lastDice;
  const result = last
    ? `<p class="${last.payout > 0 ? 'good' : 'hint'}">${esc(
        t('dice.result', {
          d1: last.d1,
          d2: last.d2,
          sum: last.d1 + last.d2,
          outcome: last.payout > 0 ? t('dice.won', { payout: num(last.payout) }) : t('dice.lost'),
        }),
      )}</p>`
    : '';
  return `<h3 class="sub">${esc(t('dice.title'))}</h3>
    <p class="desc">${esc(t('dice.rules', { stake: num(stake) }))}</p>
    <div class="hud-row">${bets}</div>${result}`;
}
