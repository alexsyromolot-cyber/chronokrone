/**
 * Stromnetz und Karten (Epoche 3). Formeln in data/power.ts und data/cards.ts.
 */
import { chance, randomInt } from '../core/rng';
import { BUILDINGS } from '../data/buildings';
import { CARD_RULES, CARDS, type CardEffect } from '../data/cards';
import { POWER } from '../data/power';
import type { MessageKey } from '../i18n/de';
import { milestoneMultiplier, neighbors } from './castle';
import { addLog, type GameState, type Tile } from './state';

// ---------- Stromnetz ----------

const isConductor = (t: Tile) => !!t.building && POWER.conductors.includes(t.building) && t.level > 0;
/** Verbraucher: Gebäude, die etwas herstellen (Erzeuger oder Rezept). */
const isConsumer = (t: Tile) =>
  !!t.building &&
  t.level > 0 &&
  !isConductor(t) &&
  !!(BUILDINGS[t.building].produces || BUILDINGS[t.building].recipe);

interface Network {
  key: string;
  connected: Set<Tile>;
  supply: number;
  demand: number;
}

// Das Netz wird nur neu berechnet, wenn sich Gebäude, Level oder Brennstoff ändern – sonst
// liefe die Breitensuche für jedes Feld in jedem Tick.
const cache = new WeakMap<GameState, Network>();

function networkKey(state: GameState): string {
  let k = state.power.fuel.toFixed(3);
  for (const t of state.tiles) k += t.building ? `${t.building}${t.level},` : '.';
  return k;
}

export function powerNetwork(state: GameState): Network {
  const key = networkKey(state);
  const hit = cache.get(state);
  if (hit && hit.key === key) return hit;

  // Breitensuche: von den Kraftwerken über benachbarte Masten.
  const plants = state.tiles.filter((t) => t.building === 'powerPlant' && t.level > 0);
  const grid = new Set<Tile>(plants);
  const queue = [...plants];
  while (queue.length) {
    const t = queue.shift()!;
    for (const n of neighbors(state, t)) {
      if (isConductor(n) && !grid.has(n)) {
        grid.add(n);
        queue.push(n);
      }
    }
  }
  const connected = new Set<Tile>();
  for (const g of grid) for (const n of neighbors(state, g)) if (isConsumer(n)) connected.add(n);

  const supply =
    plants.reduce((s, p) => s + POWER.supplyPerLevel * p.level * milestoneMultiplier(p.level), 0) *
    state.power.fuel;
  const demand = [...connected].reduce((s, t) => s + POWER.demandPerLevel * t.level, 0);
  const net = { key, connected, supply, demand };
  cache.set(state, net);
  return net;
}

/** Versorgung 0…1 (Angebot ÷ Nachfrage). */
export function powerSatisfaction(state: GameState): number {
  const n = powerNetwork(state);
  return n.demand > 0 ? Math.min(1, n.supply / n.demand) : 1;
}

/** Bonus-Anteil für ein Gebäude (0, wenn nicht am Netz). */
export function powerBonus(state: GameState, tile: Tile): number {
  if (!state.tiles.some((t) => t.building === 'powerPlant')) return 0;
  const n = powerNetwork(state);
  return n.connected.has(tile) ? POWER.maxBonus * powerSatisfaction(state) : 0;
}

/** Kraftwerke verbrennen Kohle; fehlt Kohle, sinkt der Brennstoff-Anteil und damit der Strom. */
export function tickPower(state: GameState, dt: number): void {
  const levels = state.tiles.reduce((s, t) => s + (t.building === 'powerPlant' ? t.level : 0), 0);
  if (levels === 0) {
    state.power.fuel = 1;
    return;
  }
  const need = POWER.coalPerLevel * levels * dt;
  const have = state.resources.coal.toNumber();
  const ratio = Math.min(1, have / need);
  state.resources.coal = state.resources.coal.sub(need * ratio);
  // Auf 1 % gerundet, damit das Netz nicht wegen Rundungsrauschen ständig neu berechnet wird.
  state.power.fuel = Math.round(ratio * 100) / 100;
}

// ---------- Karten ----------

export function cardBonus(state: GameState, effect: CardEffect): number {
  let sum = 0;
  for (const id of state.cardSlots) sum += CARDS.find((c) => c.id === id)?.effects[effect] ?? 0;
  if ((effect === 'damage' || effect === 'gold') && CARDS.every((c) => state.cards[c.id]))
    sum += CARD_RULES.setBonus;
  return sum;
}

export function equipCard(state: GameState, id: string): MessageKey | null {
  if (!state.cards[id]) return 'reason.unknown';
  if (state.battle) return 'reason.battleRunning';
  if (state.cardSlots.includes(id)) return 'reason.done';
  if (state.cardSlots.length >= CARD_RULES.slots) return 'reason.slotsFull';
  state.cardSlots.push(id);
  return null;
}

export function unequipCard(state: GameState, id: string): MessageKey | null {
  if (state.battle) return 'reason.battleRunning';
  const i = state.cardSlots.indexOf(id);
  if (i < 0) return 'reason.unknown';
  state.cardSlots.splice(i, 1);
  return null;
}

/** Nach einem Sieg: mit Glück (spätestens nach der Pity-Grenze) eine neue Karte. Leere Slots füllen sich selbst. */
export function rollCard(state: GameState): void {
  if (state.epoch < CARD_RULES.fromEpoch) return;
  const missing = CARDS.filter((c) => !state.cards[c.id]);
  if (missing.length === 0) return;
  state.cardPity++;
  if (!chance(state.rng, CARD_RULES.findChance) && state.cardPity < CARD_RULES.pity) return;
  state.cardPity = 0;
  const found = missing[randomInt(state.rng, 0, missing.length - 1)]!;
  state.cards[found.id] = true;
  if (state.cardSlots.length < CARD_RULES.slots) state.cardSlots.push(found.id);
  addLog(state, 'narrator.card', { name: `@card.${found.id}` });
}
