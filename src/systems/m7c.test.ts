import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { REACTOR, RELIC_IDS, RELIC_NUMBERS, RELIC_RULES } from '../data/reactor';
import { dispatch } from './actions';
import { tileAt, tileProduction } from './castle';
import { resolveEvent } from './events';
import { resetForEpoch } from './prestige';
import { heatRate, reactorBonus, tickReactor } from './reactor';
import { pityLimit, rollRelic } from './relics';
import { spread } from './trade';
import { createInitialState, type GameState, type Tile } from './state';

function place(s: GameState, x: number, y: number, building: Tile['building'], level = 1): Tile {
  const t = tileAt(s, x, y)!;
  t.unlocked = true;
  t.building = building;
  t.level = level;
  return t;
}

function epoch4(): GameState {
  const s = createInitialState(7);
  s.epoch = 4;
  s.unlocked.castle = true;
  s.resources.fuelRods = new Decimal(50);
  return s;
}

describe('Reaktor', () => {
  it('Bonus wirkt auf alle Gebäude, linear in Level und Leistung', () => {
    const s = epoch4();
    const hut = place(s, 0, 1, 'lumberHut');
    const before = tileProduction(s, hut)!.total;
    place(s, 5, 5, 'reactor', 4);
    expect(dispatch(s, { type: 'setThrottle', throttle: 1 })).toBeNull();
    expect(reactorBonus(s)).toBeCloseTo(REACTOR.bonusPerLevel * 4);
    expect(tileProduction(s, hut)!.total).toBeCloseTo(before * (1 + REACTOR.bonusPerLevel * 4));
    expect(dispatch(s, { type: 'setThrottle', throttle: 0.7 })).toBe('reason.unknown');
  });

  it('Hitze steigt quadratisch mit der Leistung, Kühltürme senken sie', () => {
    const s = epoch4();
    place(s, 5, 5, 'reactor', 2);
    const half = heatRate(s, 0.5, 1);
    const full = heatRate(s, 1, 1);
    expect(full).toBeCloseTo(half * 4);
    place(s, 0, 0, 'coolingTower', 2);
    expect(heatRate(s, 1, 1)).toBeCloseTo(full - 2 * REACTOR.coolPerLevel);
  });

  it('verbraucht Brennstäbe; ohne Stäbe kein Bonus und keine Hitze', () => {
    const s = epoch4();
    place(s, 5, 5, 'reactor', 2);
    s.reactor.throttle = 1;
    tickReactor(s, 1);
    expect(s.resources.fuelRods.toNumber()).toBeCloseTo(50 - REACTOR.rodsPerLevel * 2);
    s.resources.fuelRods = new Decimal(0);
    tickReactor(s, 1);
    expect(s.reactor.fuel).toBe(0);
    expect(reactorBonus(s)).toBe(0);
  });

  it('Kernschmelze: Reaktor fährt herunter, Entscheidung über die Folgen', () => {
    const s = epoch4();
    const r = place(s, 5, 5, 'reactor', 6);
    s.reactor.throttle = 1.5;
    s.reactor.heat = 0.999;
    tickReactor(s, 1);
    expect(s.reactor.throttle).toBe(0);
    expect(s.reactor.heat).toBeCloseTo(REACTOR.heatAfterMeltdown, 1);
    expect(s.events.active?.id).toBe('meltdown');
    expect(resolveEvent(s, 'evacuate')).toBeNull();
    expect(r.level).toBe(3);

    // Eindämmen kostet Gold, der Reaktor bleibt ganz.
    s.resources.gold = new Decimal(1000);
    s.reactor.heat = 1;
    s.reactor.throttle = 1;
    tickReactor(s, 0.05);
    resolveEvent(s, 'contain');
    expect(r.level).toBe(3);
    expect(s.resources.gold.toNumber()).toBe(750);
  });

  it('wird beim Sprung zurückgesetzt, Relikte bleiben', () => {
    const s = epoch4();
    s.reactor.heat = 0.6;
    s.reactor.throttle = 1.5;
    s.relics.leadApron = true;
    resetForEpoch(s);
    expect(s.reactor.heat).toBe(0);
    expect(s.reactor.throttle).toBe(0.5);
    expect(s.relics.leadApron).toBe(true);
  });
});

describe('Relikte', () => {
  it('erst ab Epoche 4, mit Glücksschutz', () => {
    const s = createInitialState(3);
    s.epoch = 3;
    for (let i = 0; i < 20; i++) rollRelic(s);
    expect(Object.keys(s.relics)).toHaveLength(0);
    s.epoch = 4;
    let streak = 0;
    while (Object.keys(s.relics).length === 0) {
      rollRelic(s);
      streak++;
    }
    expect(streak).toBeLessThanOrEqual(RELIC_RULES.pity);
  });

  it('brechen Regeln: Bleischürze, Goldene Waage, Glücksisotop, Brennender Kelch', () => {
    const s = epoch4();
    place(s, 5, 5, 'reactor', 2);
    const heat = heatRate(s, 1, 1);
    s.relics.leadApron = true;
    expect(heatRate(s, 1, 1)).toBeCloseTo(heat * (1 - RELIC_NUMBERS.leadApronHeat));

    expect(spread(s)).toBeGreaterThan(0);
    s.relics.goldenScale = true;
    expect(spread(s)).toBe(0);

    expect(pityLimit(s, 5)).toBe(5);
    s.relics.luckyIsotope = true;
    expect(pityLimit(s, 5)).toBe(3);

    s.relics.burningChalice = true;
    s.reactor.heat = 1;
    s.reactor.throttle = 1;
    tickReactor(s, 0.05);
    expect(s.events.active).toBeNull();
    expect(s.events.buffs.some((b) => b.mult === RELIC_NUMBERS.chaliceMult)).toBe(true);
  });

  it('alle Relikte haben Texte', async () => {
    const { de } = await import('../i18n/de');
    const { en } = await import('../i18n/en');
    for (const id of RELIC_IDS) {
      expect(de).toHaveProperty(`relic.${id}.desc`);
      expect(en).toHaveProperty(`relic.${id}.desc`);
    }
  });
});
