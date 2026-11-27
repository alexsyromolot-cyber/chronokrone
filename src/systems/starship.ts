/**
 * Raumschiff-Raster und Komplettierung (Epoche 5). Formeln in data/starship.ts.
 */
import { ACHIEVEMENTS } from '../data/achievements';
import { CARDS } from '../data/cards';
import { CHRONICLE } from '../data/chronicle';
import { COMPANIONS } from '../data/companions';
import { ENEMIES } from '../data/enemies';
import { RELIC_IDS } from '../data/reactor';
import { COMPLETION, STARSHIP } from '../data/starship';
import { neighbors } from './castle';
import type { GameState, Tile } from './state';

export const shipActive = (state: GameState) => state.epoch >= STARSHIP.fromEpoch;

interface Hull {
  key: string;
  connected: Set<Tile>;
}

// Nur neu berechnen, wenn sich die Bebauung ändert – nicht für jedes Feld in jedem Tick.
const cache = new WeakMap<GameState, Hull>();

function hullKey(state: GameState): string {
  let k = '';
  for (const t of state.tiles) k += t.building ? `${t.building},` : '.';
  return k;
}

/** Alle Module, die über bebaute Felder mit der Brücke (Bergfried) verbunden sind. */
export function hull(state: GameState): Set<Tile> {
  const key = hullKey(state);
  const hit = cache.get(state);
  if (hit && hit.key === key) return hit.connected;
  const bridge = state.tiles.find((t) => t.building === 'keep');
  const connected = new Set<Tile>(bridge ? [bridge] : []);
  const queue = [...connected];
  while (queue.length) {
    const t = queue.shift()!;
    for (const n of neighbors(state, t)) {
      if (n.building && !connected.has(n)) {
        connected.add(n);
        queue.push(n);
      }
    }
  }
  cache.set(state, { key, connected });
  return connected;
}

export function isConnected(state: GameState, tile: Tile): boolean {
  return !shipActive(state) || hull(state).has(tile);
}

/** Bonus durch Neon-Rosetten in derselben Zeile oder Spalte. */
export function rosetteBonus(state: GameState, tile: Tile): number {
  if (!shipActive(state) || tile.building === 'rosette' || tile.building === 'keep') return 0;
  const connected = hull(state);
  let levels = 0;
  for (const r of state.tiles) {
    if (r.building !== 'rosette' || r.level < 1 || !connected.has(r)) continue;
    if (r.x === tile.x || r.y === tile.y) levels += r.level;
  }
  return STARSHIP.rosettePerLevel * levels;
}

/** Faktor eines Moduls: 0 wenn es im All treibt, sonst 1 + Rosetten-Bonus. Vor Epoche 5 immer 1. */
export function shipFactor(state: GameState, tile: Tile): number {
  if (!shipActive(state)) return 1;
  if (!hull(state).has(tile)) return 0;
  return 1 + rosetteBonus(state, tile);
}

export interface CompletionPart {
  id: 'achievements' | 'bestiary' | 'companions' | 'cards' | 'relics' | 'chronicle';
  have: number;
  total: number;
}

export function completionParts(state: GameState): CompletionPart[] {
  const count = (o: Record<string, unknown>) => Object.values(o).filter(Boolean).length;
  return [
    { id: 'achievements', have: Object.keys(state.achievements).length, total: ACHIEVEMENTS.length },
    {
      id: 'bestiary',
      have: Object.values(state.bestiary).filter((n) => (n ?? 0) > 0).length,
      total: Object.keys(ENEMIES).length,
    },
    { id: 'companions', have: count(state.companions), total: COMPANIONS.length },
    { id: 'cards', have: count(state.cards), total: CARDS.length },
    { id: 'relics', have: count(state.relics), total: RELIC_IDS.length },
    {
      id: 'chronicle',
      have: CHRONICLE.filter((c) => (state.chronicle[c.id] ?? 0) > 0).length,
      total: CHRONICLE.length,
    },
  ];
}

/** Durchschnittlicher Anteil aller Sammlungen (0…1). */
export function completionShare(state: GameState): number {
  const parts = completionParts(state);
  return parts.reduce((s, p) => s + Math.min(1, p.have / p.total), 0) / parts.length;
}

export const completionActive = (state: GameState) =>
  state.epoch >= COMPLETION.fromEpoch || state.loop.count > 0;

/** Bonus auf Produktion und Schaden (ab Epoche 5). */
export function completionBonus(state: GameState): number {
  return completionActive(state) ? completionShare(state) * COMPLETION.maxBonus : 0;
}
