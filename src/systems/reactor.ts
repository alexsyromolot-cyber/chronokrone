/**
 * Reaktor (Epoche 4). Formeln in data/reactor.ts.
 */
import { chance } from '../core/rng';
import { EVENT_TIMEOUT } from '../data/events';
import { MELTDOWN, REACTOR, RELIC_NUMBERS } from '../data/reactor';
import type { MessageKey } from '../i18n/de';
import { hasRelic } from './relics';
import { addLog, type GameState, type Tile } from './state';

export function reactorTile(state: GameState): Tile | undefined {
  return state.tiles.find((t) => t.building === 'reactor' && t.level > 0);
}

function coolingLevels(state: GameState): number {
  return state.tiles.reduce((s, t) => s + (t.building === 'coolingTower' ? t.level : 0), 0);
}

/** Produktionsbonus aller Gebäude (Anteil, 0 ohne Reaktor). */
export function reactorBonus(state: GameState): number {
  const r = reactorTile(state);
  if (!r) return 0;
  return REACTOR.bonusPerLevel * r.level * state.reactor.throttle * state.reactor.fuel;
}

/** Hitze pro Sekunde bei einer bestimmten Leistung (für Anzeige und Bot). Negativ = kühlt ab. */
export function heatRate(
  state: GameState,
  throttle = state.reactor.throttle,
  fuel = state.reactor.fuel,
): number {
  const r = reactorTile(state);
  const cool = REACTOR.coolPerLevel * coolingLevels(state);
  if (!r) return -REACTOR.idleCooling - cool;
  const apron = hasRelic(state, 'leadApron') ? 1 - RELIC_NUMBERS.leadApronHeat : 1;
  return REACTOR.heatPerLevel * r.level * throttle ** 2 * fuel * apron - cool;
}

export function rodUse(state: GameState): number {
  const r = reactorTile(state);
  return r ? REACTOR.rodsPerLevel * r.level * state.reactor.throttle : 0;
}

export function setThrottle(state: GameState, throttle: number): MessageKey | null {
  if (!(REACTOR.throttles as readonly number[]).includes(throttle)) return 'reason.unknown';
  state.reactor.throttle = throttle;
  return null;
}

export function tickReactor(state: GameState, dt: number): void {
  const rs = state.reactor;
  const need = rodUse(state) * dt;
  if (need > 0) {
    const ratio = Math.min(1, state.resources.fuelRods.toNumber() / need);
    state.resources.fuelRods = state.resources.fuelRods.sub(need * ratio);
    rs.fuel = Math.round(ratio * 100) / 100;
  } else rs.fuel = 1;

  rs.heat = Math.max(0, rs.heat + heatRate(state) * dt);
  if (rs.heat >= REACTOR.warnAt && !rs.warned) {
    rs.warned = true;
    addLog(state, 'narrator.reactorWarn');
  } else if (rs.heat < REACTOR.warnAt - 0.1) rs.warned = false;
  if (rs.heat >= 1) meltdown(state);
}

/** Kernschmelze: Reaktor fährt herunter, dann entscheidet der Spieler über die Folgen. */
export function meltdown(state: GameState): void {
  state.reactor.heat = REACTOR.heatAfterMeltdown;
  state.reactor.throttle = 0;
  state.reactor.meltdowns++;
  if (hasRelic(state, 'burningChalice')) {
    // Regelbruch: statt Schaden ein kurzer Rausch.
    state.events.buffs.push({
      resource: 'all',
      mult: RELIC_NUMBERS.chaliceMult,
      until: state.time + RELIC_NUMBERS.chaliceSeconds,
    });
    addLog(state, 'narrator.chalice');
    return;
  }
  // Die Kernschmelze verdrängt ein laufendes, harmloseres Ereignis.
  state.events.active = { id: 'meltdown', expiresAt: state.time + EVENT_TIMEOUT, params: {} };
  state.stats.eventsSeen++;
  addLog(state, 'event.meltdown.log');
}

/** Folgen der Kernschmelze; wird von resolveEvent aufgerufen. */
export function resolveMeltdown(state: GameState, option: string): MessageKey | null {
  const r = state.tiles.find((t) => t.building === 'reactor');
  if (option === 'contain') {
    const cost = state.resources.gold.mul(MELTDOWN.containGoldShare).floor();
    state.resources.gold = state.resources.gold.sub(cost);
    return null;
  }
  if (option === 'pray' && chance(state.rng, MELTDOWN.prayChance)) {
    state.stats.miracles++;
    addLog(state, 'event.meltdown.miracle');
    return null;
  }
  if (!r) return null;
  r.level = option === 'pray' ? 1 : Math.max(1, Math.floor(r.level / 2));
  return null;
}
