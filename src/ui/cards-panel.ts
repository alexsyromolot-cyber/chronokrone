/**
 * Karten (Epoche 3): drei Slots vor der Schlacht, darunter die Sammlung.
 * Und die Netzanzeige für Kraftwerk und Strommast.
 */
import { CARD_RULES, CARDS, type CardDef, type CardEffect } from '../data/cards';
import { POWER } from '../data/power';
import { t, tk } from '../i18n';
import { powerNetwork, powerSatisfaction } from '../systems/power';
import type { GameState } from '../systems/state';
import { esc, num, pct, tip } from './dom';
import { action } from './panels-top';

/** „+25 % Schaden, −30 % Mauer-LP“ – Nachteile stehen ehrlich dabei. */
export function cardEffectText(card: CardDef): string {
  return (Object.entries(card.effects) as [CardEffect, number][])
    .map(([k, v]) => tk(`cardfx.${k}`, { sign: v >= 0 ? '+' : '−', pct: pct(Math.abs(v)) }))
    .join(', ');
}

export function cardsHtml(state: GameState): string {
  const found = CARDS.filter((c) => state.cards[c.id]);
  const locked = !!state.battle;
  const slots = Array.from({ length: CARD_RULES.slots }, (_, i) => {
    const id = state.cardSlots[i];
    const card = id ? CARDS.find((c) => c.id === id) : undefined;
    if (!card) return `<li class="slot empty">${esc(t('cards.emptySlot'))}</li>`;
    return `<li class="slot"><b>${esc(tk(`card.${card.id}`))}</b> <small>${esc(cardEffectText(card))}</small>
      <button class="btn small" ${locked ? 'disabled' : ''} ${action({ type: 'unequipCard', cardId: card.id })}>${esc(
        t('cards.remove'),
      )}</button></li>`;
  }).join('');
  const full = state.cardSlots.length >= CARD_RULES.slots;
  const collection = CARDS.map((c) => {
    if (!state.cards[c.id]) return `<li class="locked" ${tip(t('companion.unknown'))}>???</li>`;
    const inSlot = state.cardSlots.includes(c.id);
    const btn = inSlot
      ? ''
      : `<button class="btn small" ${locked || full ? 'disabled' : ''} ${action({ type: 'equipCard', cardId: c.id })}>${esc(
          t('cards.equip'),
        )}</button>`;
    return `<li class="${inSlot ? 'done' : ''}">${esc(tk(`card.${c.id}`))} <small>${esc(cardEffectText(c))}</small>${btn}</li>`;
  }).join('');
  return `<p>${esc(
    t('cards.intro', {
      found: found.length,
      total: CARDS.length,
      chance: pct(CARD_RULES.findChance),
      pity: CARD_RULES.pity,
    }),
  )}</p>
    <ul class="card-slots">${slots}</ul>
    ${locked ? `<p class="hint">${esc(t('cards.lockedInBattle'))}</p>` : ''}
    <ul class="companion-list">${collection}</ul>
    <p class="${found.length === CARDS.length ? 'good' : 'hint'}">${esc(t('cards.set', { pct: pct(CARD_RULES.setBonus) }))}</p>`;
}

/** Netzanzeige im Detail von Kraftwerk und Strommast. */
export function gridHtml(state: GameState): string {
  const n = powerNetwork(state);
  const sat = powerSatisfaction(state);
  return `<p ${tip(t('power.tip', { supply: POWER.supplyPerLevel, demand: POWER.demandPerLevel, coal: POWER.coalPerLevel, bonus: pct(POWER.maxBonus) }))}>${esc(
    t('power.status', {
      supply: num(n.supply, 1),
      demand: num(n.demand, 1),
      sat: pct(sat),
      bonus: pct(POWER.maxBonus * sat),
      count: n.connected.size,
    }),
  )} ⓘ</p>${state.power.fuel < 1 ? `<p class="bad">${esc(t('power.noCoal', { pct: pct(state.power.fuel) }))}</p>` : ''}`;
}
