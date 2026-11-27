/**
 * Hofbefehle ausführen. Regeln und Stufen stehen in data/orders.ts.
 */
import {
  ORDER_INTERVAL,
  ORDER_LOG_LIMIT,
  ORDER_STAGES,
  type OrderAction,
  type OrderCondition,
  type OrderRule,
  type OrderStage,
} from '../data/orders';
import { RESOURCE_IDS } from '../data/resources';
import type { MessageKey } from '../i18n/de';
import { dispatch, type Action } from './actions';
import { resourceCap } from './resources';
import type { GameState, OrdersState } from './state';

/** Stufe 1 am Ende von Epoche 1, danach eine Stufe je Epoche (höchstens 4). */
export function orderStageNumber(state: GameState): number {
  return Math.min(4, Math.max(1, state.epoch));
}

export function orderStage(state: GameState): OrderStage {
  return ORDER_STAGES[orderStageNumber(state)]!;
}

export function conditionMet(state: GameState, c: OrderCondition): boolean {
  const b = state.battle;
  switch (c.kind) {
    case 'resourceAtLeast':
      return state.resources[c.resource].gte(c.value);
    case 'resourceFull':
      return state.resources[c.resource].gte(resourceCap(state, c.resource).mul(c.percent / 100));
    case 'noBattle':
      return !b;
    case 'inBattle':
      return !!b;
    case 'wallBelow':
      return !!b && b.wallHp < (b.wallMaxHp * c.percent) / 100;
    case 'enemiesAtLeast':
      return !!b && b.enemies.length >= c.count;
    case 'skillPoints':
      return Object.values(state.skillPoints).some((p) => p > 0);
  }
}

export function ruleMet(state: GameState, rule: OrderRule): boolean {
  if (rule.conditions.length === 0) return false;
  const results = rule.conditions.map((c) => conditionMet(state, c));
  return rule.join === 'or' ? results.some(Boolean) : results.every(Boolean);
}

/** Übersetzt eine Regel-Aktion in eine normale Spieler-Aktion. */
export function toAction(state: GameState, a: OrderAction): Action | null {
  switch (a.kind) {
    case 'startBattle':
      return { type: 'startBattle' };
    case 'castSpell':
      return { type: 'castSpell', spell: a.spell };
    case 'recruit':
      return { type: 'recruit', classId: a.classId };
    case 'upgradeWall':
      return { type: 'upgradeWall' };
    case 'upgradeCheapest': {
      const tile = state.tiles.filter((t) => t.building === a.building).sort((x, y) => x.level - y.level)[0];
      return tile ? { type: 'upgrade', x: tile.x, y: tile.y } : null;
    }
    case 'notify':
      return null;
  }
}

function log(orders: OrdersState, entry: OrdersState['log'][number]): void {
  orders.log.push(entry);
  if (orders.log.length > ORDER_LOG_LIMIT) orders.log.splice(0, orders.log.length - ORDER_LOG_LIMIT);
}

/** Einmal pro Tick: alle ORDER_INTERVAL Sekunden die Regeln abarbeiten. */
export function tickOrders(state: GameState, dt: number): void {
  if (!state.unlocked.orders) return;
  const orders = state.orders;
  orders.timer -= dt;
  if (orders.timer > 0) return;
  orders.timer = ORDER_INTERVAL;
  const limit = orderStage(state).maxRules;

  orders.rules.slice(0, limit).forEach((rule) => {
    if (!rule.enabled) return;
    const met = ruleMet(state, rule);
    const wasMet = orders.lastTrue[rule.id] ?? false;
    orders.lastTrue[rule.id] = met;
    if (!met) return;

    if (rule.action.kind === 'notify') {
      // Meldungen nur beim Umschalten auf „erfüllt“, sonst stünde das Log voll.
      if (!wasMet) log(orders, { time: state.time, ruleId: rule.id, ok: true });
      return;
    }
    const action = toAction(state, rule.action);
    const reason = action ? dispatch(state, action) : 'reason.unknown';
    // Fehlschläge nur protokollieren, wenn sich der Grund ändert – sonst jede Sekunde dasselbe.
    const last = [...orders.log].reverse().find((l) => l.ruleId === rule.id);
    if (reason === null) log(orders, { time: state.time, ruleId: rule.id, ok: true });
    else if (!last || last.ok || last.reason !== reason)
      log(orders, { time: state.time, ruleId: rule.id, ok: false, reason });
  });
}

/** Regeln prüfen und gegen die Stufe begrenzen – auch für importierte oder manipulierte Listen. */
export function validateRules(state: GameState, rules: OrderRule[]): OrderRule[] {
  const stage = orderStage(state);
  return rules.slice(0, stage.maxRules === Infinity ? rules.length : stage.maxRules).map((r) => ({
    ...r,
    join: stage.maxConditions > 1 ? r.join : 'and',
    conditions: r.conditions
      .slice(0, stage.maxConditions)
      .filter((c) => !('resource' in c) || RESOURCE_IDS.includes(c.resource)),
  }));
}

export function setOrders(state: GameState, rules: OrderRule[]): MessageKey | null {
  const valid = validateRules(state, rules);
  state.orders.rules = valid;
  state.orders.nextId = Math.max(state.orders.nextId, ...valid.map((r) => r.id + 1));
  return null;
}
