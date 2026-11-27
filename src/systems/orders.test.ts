import Decimal from 'break_eternity.js';
import { SCENE } from '../data/scene';
import { describe, expect, it } from 'vitest';
import type { OrderRule } from '../data/orders';
import { dispatch } from './actions';
import { tileAt } from './castle';
import { newGame, tick } from './game';
import { orderStage, validateRules } from './orders';
import type { GameState } from './state';

function withOrders(): GameState {
  const s = newGame(51);
  while (s.battle) tick(s, 0.05);
  s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
  Object.assign(s.unlocked, { orders: true, recruit: true });
  return s;
}

const rule = (id: number, over: Partial<OrderRule> = {}): OrderRule => ({
  id,
  enabled: true,
  join: 'and',
  conditions: [{ kind: 'noBattle' }],
  action: { kind: 'startBattle' },
  ...over,
});

describe('Hofbefehle', () => {
  it('sind gesperrt, bis sie freigeschaltet sind', () => {
    const s = newGame(1);
    expect(dispatch(s, { type: 'setOrders', rules: [rule(1)] })).toBe('reason.notYet');
  });

  it('WENN keine Schlacht DANN Schlacht starten – automatisch', () => {
    const s = withOrders();
    dispatch(s, { type: 'setOrders', rules: [rule(1)] });
    expect(s.battle).toBeNull();
    for (let i = 0; i < 25; i++) tick(s, 0.05);
    // Keine Schlacht im Hintergrund: erst ein sichtbarer Countdown im Dorf …
    expect(s.battle).toBeNull();
    expect(s.scene.countdown).not.toBeNull();
    expect(s.orders.log.at(-1)).toMatchObject({ ruleId: 1, ok: true });
    // … dann öffnet sich das Tor.
    for (let i = 0; i < 20 * SCENE.orderCountdown; i++) tick(s, 0.05);
    expect(s.battle).not.toBeNull();
    expect(s.scene.countdown).toBeNull();
  });

  it('Stufe 1 erlaubt 2 Regeln mit je einer Bedingung, Stufe 2 mehr', () => {
    const s = withOrders();
    const many = [1, 2, 3].map((id) =>
      rule(id, { join: 'or', conditions: [{ kind: 'noBattle' }, { kind: 'skillPoints' }] }),
    );
    let valid = validateRules(s, many);
    expect(valid).toHaveLength(2);
    expect(valid[0]!.conditions).toHaveLength(1);
    expect(valid[0]!.join).toBe('and');
    s.epoch = 2;
    expect(orderStage(s).maxRules).toBe(6);
    valid = validateRules(s, many);
    expect(valid).toHaveLength(3);
    expect(valid[0]!.join).toBe('or');
  });

  it('niedrigstes Gebäude ausbauen nutzt dieselbe Aktion wie ein Klick', () => {
    const s = withOrders();
    s.resources.gold = new Decimal(200);
    s.resources.stone = new Decimal(200);
    dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' });
    dispatch(s, {
      type: 'setOrders',
      rules: [
        rule(1, {
          conditions: [{ kind: 'resourceAtLeast', resource: 'gold', value: 50 }],
          action: { kind: 'upgradeCheapest', building: 'lumberHut' },
        }),
      ],
    });
    for (let i = 0; i < 25; i++) tick(s, 0.05);
    expect(tileAt(s, 2, 3)!.level).toBeGreaterThan(1);
  });

  it('wiederholte Fehlschläge stehen nur einmal im Log', () => {
    const s = withOrders();
    dispatch(s, {
      type: 'setOrders',
      rules: [rule(1, { action: { kind: 'recruit', classId: 'knight' } })],
    });
    for (let i = 0; i < 20 * 5; i++) tick(s, 0.05);
    const fails = s.orders.log.filter((l) => !l.ok);
    expect(fails).toHaveLength(1);
    expect(fails[0]!.reason).toBe('reason.requiresBuilding');
  });

  it('Meldungen kommen nur beim Umschalten auf „erfüllt“', () => {
    const s = withOrders();
    dispatch(s, { type: 'setOrders', rules: [rule(1, { action: { kind: 'notify' } })] });
    for (let i = 0; i < 20 * 5; i++) tick(s, 0.05);
    expect(s.orders.log).toHaveLength(1);
  });

  it('bleiben beim Zeitsprung erhalten', () => {
    const s = withOrders();
    dispatch(s, { type: 'setOrders', rules: [rule(1)] });
    s.unlocked.timeMachine = true;
    s.timeMachineAt = s.time;
    s.battle = null;
    expect(dispatch(s, { type: 'jump' })).toBeNull();
    expect(s.orders.rules).toHaveLength(1);
  });
});
