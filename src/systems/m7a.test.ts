import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { COMPANION_RULES, COMPANIONS } from '../data/companions';
import { BASE_PRICES, MARKET } from '../data/market';
import { dispatch } from './actions';
import { researchBlocker } from './research';
import { resetForEpoch } from './prestige';
import { createInitialState, type GameState } from './state';
import { companionBonus, companionSetMultiplier, price, rollCompanion, spread, tickMarket } from './trade';

/** Zustand in Epoche 2 mit gebautem Markt auf einem freien Feld. */
function withMarket(level = 1): GameState {
  const s = createInitialState(7);
  s.epoch = 2;
  s.unlocked.castle = true;
  const tile = s.tiles.find((t) => t.unlocked && !t.building)!;
  tile.building = 'market';
  tile.level = level;
  return s;
}

describe('Markt', () => {
  it('bewegt Preise nur mit Markt und bleibt über 25 % des Grundpreises', () => {
    const none = createInitialState(7);
    tickMarket(none, 100);
    expect(none.market.prices).toEqual({});

    const s = withMarket();
    for (let i = 0; i < 2000; i++) tickMarket(s, MARKET.priceStep);
    for (const [id, base] of Object.entries(BASE_PRICES)) {
      const p = s.market.prices[id as keyof typeof BASE_PRICES]!;
      expect(p).toBeGreaterThanOrEqual(base * 0.25);
      // Zug zum Grundpreis: kein Davonlaufen nach oben.
      expect(p).toBeLessThan(base * 5);
    }
    expect(s.market.history.wood!.length).toBe(MARKET.history);
  });

  it('Kaufen und sofort Verkaufen ist ein Verlustgeschäft (Spanne)', () => {
    const s = withMarket();
    s.resources.gold = new Decimal(1e6);
    const before = s.resources.gold.toNumber();
    expect(dispatch(s, { type: 'marketBuy', resource: 'wood' })).toBeNull();
    // Alles Gekaufte wieder verkaufen (in 10-%-Schritten, bis fast nichts übrig ist).
    for (let i = 0; i < 200 && s.resources.wood.gte(10); i++)
      dispatch(s, { type: 'marketSell', resource: 'wood' });
    expect(s.resources.gold.toNumber()).toBeLessThan(before);
  });

  it('Spanne sinkt mit dem Marktlevel, aber nie unter 2 %', () => {
    expect(spread(withMarket(1))).toBeCloseTo(0.1);
    expect(spread(withMarket(5))).toBeCloseTo(0.06);
    expect(spread(withMarket(50))).toBeCloseTo(0.02);
  });

  it('Verkauf bringt Preis × Menge abzüglich Spanne', () => {
    const s = withMarket();
    s.resources.wood = new Decimal(100);
    s.resources.gold = new Decimal(0);
    dispatch(s, { type: 'marketSell', resource: 'wood' });
    expect(s.resources.wood.toNumber()).toBe(90);
    expect(s.resources.gold.toNumber()).toBeCloseTo(10 * price(s, 'wood') * 0.9);
  });

  it('wird beim Sprung zurückgesetzt', () => {
    const s = withMarket();
    tickMarket(s, MARKET.priceStep);
    resetForEpoch(s);
    expect(s.market.prices).toEqual({});
  });
});

describe('Begleiter', () => {
  it('erst ab Epoche 2 und spätestens nach der Pity-Grenze', () => {
    const s = createInitialState(3);
    for (let i = 0; i < 20; i++) rollCompanion(s);
    expect(Object.keys(s.companions)).toHaveLength(0);

    s.epoch = 2;
    let wins = 0;
    while (Object.keys(s.companions).length < COMPANIONS.length && wins < 500) {
      const had = Object.keys(s.companions).length;
      let streak = 0;
      while (Object.keys(s.companions).length === had) {
        rollCompanion(s);
        streak++;
        wins++;
      }
      expect(streak).toBeLessThanOrEqual(COMPANION_RULES.pity);
    }
    expect(Object.keys(s.companions)).toHaveLength(COMPANIONS.length);
  });

  it('gibt Klassenbonus und Sammlungsbonus und überlebt den Sprung', () => {
    const s = createInitialState(3);
    s.companions.battleGoose = true;
    expect(companionBonus(s, 'knight', 'damage')).toBeCloseTo(0.15);
    expect(companionBonus(s, 'knight', 'production')).toBe(0);
    expect(companionSetMultiplier(s)).toBe(1);
    for (const c of COMPANIONS) s.companions[c.id] = true;
    expect(companionSetMultiplier(s)).toBeCloseTo(1 + COMPANION_RULES.setBonus);
    resetForEpoch(s);
    expect(s.companions.battleGoose).toBe(true);
  });
});

describe('Forschung der Epoche 2', () => {
  it('ist in Epoche 1 gesperrt', () => {
    const s = createInitialState(1);
    s.resources.scrolls = new Decimal(1e6);
    expect(researchBlocker(s, 'steamPower')).toBe('reason.laterEpoch');
    s.epoch = 2;
    expect(researchBlocker(s, 'steamPower')).not.toBe('reason.laterEpoch');
  });
});
