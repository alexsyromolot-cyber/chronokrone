/**
 * Ereignisse, Jahreszeiten, Alien-Drohne und Würfelspiel. Daten und Formeln in data/events.ts.
 */
import Decimal from 'break_eternity.js';
import { chance, nextRandom, randomInt } from '../core/rng';
import {
  DICE,
  DRONE,
  EVENT_INTERVAL,
  EVENT_NUMBERS as N,
  EVENT_TIMEOUT,
  EVENTS,
  SEASON_EFFECTS,
  SEASON_LENGTH,
  SEASONS,
  type DiceBet,
  type EventId,
  type SeasonId,
} from '../data/events';
import { RESOURCE_IDS, type ResourceId } from '../data/resources';
import type { MessageKey } from '../i18n/de';
import { gain, resourceCap } from './resources';
import { resolveMeltdown } from './reactor';
import { hasRelic } from './relics';
import { RELIC_NUMBERS } from '../data/reactor';
import { addLog, type GameState } from './state';
import { addXp, xpForNext } from './units';

export function currentSeason(state: GameState): SeasonId {
  const index = Math.floor((state.time - state.epochStartedAt) / SEASON_LENGTH) % SEASONS.length;
  return SEASONS[index]!;
}

/** Produktions-Multiplikator aus Jahreszeit und laufenden Ereignis-Boni. */
export function productionModifier(state: GameState, resource: ResourceId): number {
  let mult = SEASON_EFFECTS[currentSeason(state)][resource] ?? 1;
  for (const b of state.events.buffs) {
    if (b.until > state.time && (b.resource === 'all' || b.resource === resource)) mult *= b.mult;
  }
  return mult;
}

function between(state: GameState, [min, max]: [number, number]): number {
  return min + nextRandom(state.rng) * (max - min);
}

/** Füllstand eines Rohstoffs (0–1); nur Rohstoffe, die man schon hat. */
function fill(state: GameState, id: ResourceId): number {
  return state.resources[id].div(resourceCap(state, id)).toNumber();
}

function startEvent(state: GameState): void {
  const pool = EVENTS.filter((e) => (e.fromEpoch ?? 1) <= state.epoch);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = nextRandom(state.rng) * total;
  const def = pool.find((e) => (roll -= e.weight) < 0) ?? pool[0]!;
  const params: Record<string, string | number> = {};

  if (def.id === 'stableFire') {
    const tiles = state.tiles.filter((t) => t.building && t.building !== 'keep');
    if (tiles.length === 0) return; // Nichts, was brennen könnte – dann eben kein Feuer.
    const tile = tiles[randomInt(state.rng, 0, tiles.length - 1)]!;
    params.x = tile.x;
    params.y = tile.y;
    params.building = `@building.${tile.building}`;
  } else if (def.id === 'merchant') {
    const owned = RESOURCE_IDS.filter((r) => r !== 'gold' && r !== 'scrap' && state.resources[r].gt(0));
    if (owned.length < 2) return;
    const sorted = [...owned].sort((a, b) => fill(state, b) - fill(state, a));
    const give = sorted[0]!;
    const get = sorted[sorted.length - 1]!;
    params.give = give;
    params.giveAmount = Math.floor(state.resources[give].toNumber() * N.merchantGive);
    params.get = get;
    params.getAmount = Math.floor(resourceCap(state, get).toNumber() * N.merchantGet);
    params.giveName = `@res.${give}`;
    params.getName = `@res.${get}`;
  } else if (def.id === 'defector') {
    const goldRate = Math.max(1, state.tiles.find((t) => t.building === 'keep')?.level ?? 1);
    params.chips = N.defectorChips;
    params.price = Math.ceil(goldRate * N.defectorGoldSeconds);
  }
  state.events.active = { id: def.id, expiresAt: state.time + EVENT_TIMEOUT, params };
  state.stats.eventsSeen++;
  addLog(state, `event.${def.id}.log` as MessageKey, params);
}

/** Eine Antwort auf das aktuelle Ereignis. */
export function resolveEvent(state: GameState, option: string): MessageKey | null {
  const ev = state.events.active;
  if (!ev) return 'reason.noEvent';
  const def = EVENTS.find((e) => e.id === ev.id)!;
  if (!def.options.includes(option)) return 'reason.unknown';
  const p = ev.params;
  const tile = state.tiles.find((t) => t.x === p.x && t.y === p.y);

  switch (`${ev.id}.${option}`) {
    case 'stableFire.extinguish': {
      const wood = state.resources.wood.mul(N.extinguishShare).floor();
      const stone = state.resources.stone.mul(N.extinguishShare).floor();
      state.resources.wood = state.resources.wood.sub(wood);
      state.resources.stone = state.resources.stone.sub(stone);
      break;
    }
    case 'stableFire.pray':
      // Beten kostet nichts und hilft fast nie – aber eben manchmal.
      if (chance(state.rng, N.prayChance)) {
        addLog(state, 'event.stableFire.miracle');
        state.stats.miracles++;
        break;
      }
      if (tile && tile.level > 1) tile.level--;
      break;
    case 'stableFire.letBurn':
      if (tile && tile.level > 1) tile.level--;
      break;
    case 'merchant.trade': {
      const give = p.give as ResourceId;
      const get = p.get as ResourceId;
      if (state.resources[give].lt(p.giveAmount as number)) return 'reason.tooExpensive';
      state.resources[give] = state.resources[give].sub(p.giveAmount as number);
      gain(state, get, p.getAmount as number);
      break;
    }
    case 'defector.buy':
      if (state.resources.gold.lt(p.price as number)) return 'reason.tooExpensive';
      state.resources.gold = state.resources.gold.sub(p.price as number);
      gain(state, 'chips', p.chips as number);
      break;
    case 'rain.ok':
      state.events.buffs.push({ resource: 'herbs', mult: N.rainHerbs, until: state.time + N.rainSeconds });
      break;
    case 'harvest.ok':
      state.events.buffs.push({ resource: 'all', mult: N.harvestAll, until: state.time + N.harvestSeconds });
      break;
    case 'bard.listen':
      for (const u of state.units) addXp(state, u, xpForNext(u.level) * N.bardXpShare);
      break;
    case 'bard.chase':
      gain(state, 'gold', N.bardGold);
      break;
    case 'sandstorm.endure':
      state.events.buffs.push({
        resource: 'all',
        mult: N.sandstormMult,
        until: state.time + N.sandstormSeconds,
      });
      break;
    case 'sandstorm.shelter':
      state.resources.gold = state.resources.gold.sub(state.resources.gold.mul(N.shelterGoldShare).floor());
      break;
    case 'meltdown.evacuate':
    case 'meltdown.contain':
    case 'meltdown.pray':
      resolveMeltdown(state, option);
      break;
  }
  state.events.active = null;
  addLog(state, `event.${ev.id}.${option}` as MessageKey, p);
  return null;
}

/** Beute der Drohne = 10 % der Gold-Beute der letzten Schlacht (mindestens 25) + 2 Schrott. */
export function droneLoot(state: GameState): number {
  return Math.max(DRONE.minGold, Math.round((state.lastBattle?.goldEarned ?? 0) * DRONE.lastBattleShare));
}

export function catchDrone(state: GameState): MessageKey | null {
  if (!state.events.drone) return 'reason.unknown';
  state.events.drone = null;
  const gold = droneLoot(state);
  gain(state, 'gold', gold);
  gain(state, 'scrap', DRONE.scrap);
  state.stats.scrapCollected += DRONE.scrap;
  state.stats.goldEarned += gold;
  state.stats.dronesCaught++;
  state.fx.push({ kind: 'drone', gold });
  return null;
}

export function diceStake(state: GameState): number {
  return Math.floor(state.resources.gold.toNumber() * DICE.maxStakeShare);
}

/** Zwei Würfel, faire Auszahlung = Einsatz ÷ Gewinnchance. */
export function rollDice(state: GameState, bet: DiceBet): MessageKey | null {
  if (!state.tiles.some((t) => t.building === 'tavern')) return 'reason.requiresBuilding';
  const stake = diceStake(state);
  if (stake < 1) return 'reason.tooExpensive';
  const d1 = randomInt(state.rng, 1, 6);
  const d2 = randomInt(state.rng, 1, 6);
  const rule = DICE.bets[bet];
  const win = rule.wins(d1 + d2);
  const payout = win ? Math.floor(stake / rule.chance) : 0;
  state.resources.gold = state.resources.gold.sub(stake).add(new Decimal(payout));
  state.stats.diceGames++;
  if (win && bet === 'twelve') state.stats.diceJackpots++;
  state.events.lastDice = { d1, d2, bet, stake, payout };
  return null;
}

export function tickEvents(state: GameState, dt: number): void {
  if (!state.unlocked.castle) return;
  const ev = state.events;
  ev.buffs = ev.buffs.filter((b) => b.until > state.time);

  if (ev.active && state.time >= ev.active.expiresAt) {
    // Wer nicht antwortet, bekommt die erste Option (bei Feuer: brennen lassen).
    const def = EVENTS.find((e) => e.id === ev.active!.id)!;
    resolveEvent(state, def.options[0]!);
  }
  if (!ev.active) {
    ev.timer -= dt;
    if (ev.timer <= 0) {
      ev.timer = between(state, EVENT_INTERVAL);
      startEvent(state);
    }
  }

  if (ev.drone) {
    ev.drone.left -= dt;
    if (ev.drone.left <= 0) ev.drone = null;
  } else {
    ev.droneTimer -= dt;
    if (ev.droneTimer <= 0) {
      ev.droneTimer =
        between(state, DRONE.interval) *
        (hasRelic(state, 'treasureMap') ? RELIC_NUMBERS.treasureMapInterval : 1);
      ev.drone = { left: DRONE.flightTime, lane: randomInt(state.rng, 0, 2) };
    }
  }
}

export type { EventId };
