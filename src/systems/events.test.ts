import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { DICE, EVENTS, SEASON_LENGTH } from '../data/events';
import { de } from '../i18n/de';
import { dispatch } from './actions';
import { tileAt, tileProduction } from './castle';
import { currentSeason, tickEvents } from './events';
import { newGame, tick } from './game';
import type { GameState } from './state';

function castle(): GameState {
  const s = newGame(61);
  while (s.battle) tick(s, 0.05);
  s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
  s.resources.gold = new Decimal(200);
  s.resources.wood = new Decimal(100);
  s.resources.stone = new Decimal(100);
  dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' });
  return s;
}

describe('Jahreszeiten', () => {
  it('wechseln alle 8 Minuten und bremsen im Winter das Holz', () => {
    const s = castle();
    s.epochStartedAt = s.time;
    expect(currentSeason(s)).toBe('spring');
    const spring = tileProduction(s, tileAt(s, 2, 3)!)!;
    s.time += 3 * SEASON_LENGTH;
    expect(currentSeason(s)).toBe('winter');
    const winter = tileProduction(s, tileAt(s, 2, 3)!)!;
    expect(winter.season).toBe(0.75);
    expect(winter.total).toBeCloseTo((spring.total / spring.season) * 0.75);
  });
});

describe('Ereignisse', () => {
  it('jedes Ereignis und jede Option hat Texte', () => {
    for (const e of EVENTS) {
      expect(de).toHaveProperty(`event.${e.id}.title`);
      expect(de).toHaveProperty(`event.${e.id}.log`);
      for (const o of e.options) {
        expect(de).toHaveProperty(`eventopt.${e.id}.${o}`);
        expect(de).toHaveProperty(`event.${e.id}.${o}`);
      }
    }
  });

  it('Stallfeuer: brennen lassen kostet ein Level, löschen kostet Holz und Stein', () => {
    const s = castle();
    const tile = tileAt(s, 2, 3)!;
    tile.level = 3;
    s.events.active = { id: 'stableFire', expiresAt: s.time + 60, params: { x: 2, y: 3 } };
    expect(dispatch(s, { type: 'eventChoice', option: 'letBurn' })).toBeNull();
    expect(tile.level).toBe(2);
    s.events.active = { id: 'stableFire', expiresAt: s.time + 60, params: { x: 2, y: 3 } };
    const wood = s.resources.wood.toNumber();
    dispatch(s, { type: 'eventChoice', option: 'extinguish' });
    expect(tile.level).toBe(2);
    expect(s.resources.wood.toNumber()).toBeCloseTo(wood - Math.floor(wood * 0.15));
  });

  it('verfällt nicht mehr: Eine offene Entscheidung pausiert das Spiel', () => {
    const s = castle();
    tileAt(s, 2, 3)!.level = 2;
    s.events.active = { id: 'stableFire', expiresAt: s.time, params: { x: 2, y: 3 } };
    const t0 = s.time;
    const gold = s.resources.gold.toNumber();
    for (let i = 0; i < 20 * 120; i++) tick(s, 0.05);
    expect(s.events.active?.id).toBe('stableFire');
    expect(s.time).toBe(t0);
    expect(s.resources.gold.toNumber()).toBe(gold);
    expect(tileAt(s, 2, 3)!.level).toBe(2);
  });

  it('Händler tauscht Volles gegen Knappes', () => {
    const s = castle();
    s.events.active = {
      id: 'merchant',
      expiresAt: s.time + 60,
      params: { give: 'wood', giveAmount: 30, get: 'stone', getAmount: 40 },
    };
    const wood = s.resources.wood.toNumber();
    const stone = s.resources.stone.toNumber();
    dispatch(s, { type: 'eventChoice', option: 'trade' });
    expect(s.resources.wood.toNumber()).toBe(wood - 30);
    expect(s.resources.stone.toNumber()).toBe(stone + 40);
  });

  it('kommen von selbst, sobald die Burg steht', () => {
    const s = castle();
    s.events.timer = 1;
    tickEvents(s, 2);
    expect(s.events.active).not.toBeNull();
    expect(s.stats.eventsSeen).toBe(1);
  });
});

describe('Minispiele', () => {
  it('Drohne fangen bringt Gold und Schrott', () => {
    const s = castle();
    s.events.drone = { left: 5, lane: 0 };
    const gold = s.resources.gold.toNumber();
    expect(dispatch(s, { type: 'catchDrone' })).toBeNull();
    expect(s.resources.gold.toNumber()).toBeGreaterThan(gold);
    expect(s.events.drone).toBeNull();
    expect(dispatch(s, { type: 'catchDrone' })).toBe('reason.unknown');
  });

  it('Würfelspiel ist fair: Auszahlung = Einsatz ÷ Chance, Erwartungswert ≈ Einsatz', () => {
    const s = castle();
    expect(dispatch(s, { type: 'rollDice', bet: 'high' })).toBe('reason.requiresBuilding');
    tileAt(s, 3, 2)!.unlocked = true;
    tileAt(s, 3, 2)!.building = 'tavern';
    tileAt(s, 3, 2)!.level = 1;
    let staked = 0;
    let paid = 0;
    for (let i = 0; i < 20000; i++) {
      s.resources.gold = new Decimal(1000);
      dispatch(s, { type: 'rollDice', bet: 'high' });
      staked += 100;
      paid += s.events.lastDice!.payout;
    }
    expect(paid / staked).toBeGreaterThan(0.95);
    expect(paid / staked).toBeLessThan(1.05);
    expect(Math.floor(100 / DICE.bets.high.chance)).toBe(171);
  });
});
