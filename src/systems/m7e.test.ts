import { describe, expect, it } from 'vitest';
import { CURSE_NUMBERS, LOOP, LOOP_RULE_NUMBERS } from '../data/loop';
import { dispatch } from './actions';
import { clickDamage, startBattle, tickBattle, wallMaxHp } from './battle';
import { tileAt, tileProduction } from './castle';
import { curseKey, loopRule, sealBonus } from './loop';
import { createInitialState, type GameState } from './state';

function afterFinale(): GameState {
  const s = createInitialState(5);
  s.epoch = 5;
  s.unlocked.castle = true;
  s.loop.startedAt = 0;
  s.time = 3600;
  s.finale = { wonAt: 3600, wins: 1 };
  s.research = { mining: true };
  s.chronicle = { prodAll: 2 };
  s.relics = { leadApron: true };
  return s;
}

describe('Zeitschleife', () => {
  it('erst nach dem Finale; zurück in Epoche 1, Dauerhaftes bleibt', () => {
    const s = afterFinale();
    s.finale.wonAt = null;
    expect(dispatch(s, { type: 'startLoop' })).toBe('reason.needsFinale');
    s.finale.wonAt = 3600;
    const shards = s.shards;
    expect(dispatch(s, { type: 'startLoop' })).toBeNull();
    expect(s.epoch).toBe(1);
    expect(s.loop.count).toBe(1);
    expect(s.loop.seals).toBe(1);
    expect(s.loop.best['']).toBe(3600);
    expect(s.shards).toBeGreaterThan(shards);
    expect(s.research).toEqual({});
    expect(s.chronicle.prodAll).toBe(2);
    expect(s.relics.leadApron).toBe(true);
    expect(s.finale.wonAt).toBeNull();
    expect(dispatch(s, { type: 'startLoop' })).toBe('reason.needsFinale');
  });

  it('Siegel geben Produktion und Schaden', () => {
    const s = afterFinale();
    s.epoch = 1;
    const hut = tileAt(s, 2, 3)!;
    hut.building = 'lumberHut';
    hut.level = 1;
    const before = tileProduction(s, hut)!.total;
    s.loop.seals = 2;
    expect(sealBonus(s)).toBeCloseTo(2 * LOOP.sealBonus);
    expect(tileProduction(s, hut)!.total).toBeCloseTo(before * (1 + 2 * LOOP.sealBonus));
  });

  it('erste Schleife spiegelt die Karte, zweite macht Aliens flink', () => {
    const s = afterFinale();
    dispatch(s, { type: 'startLoop' });
    expect(loopRule(s)).toBe('mirror');
    const keep = s.tiles.find((t) => t.building === 'keep')!;
    expect(keep.x).toBe(4); // Bergfried (3,3) gespiegelt auf 8er-Raster
    s.finale.wonAt = s.time;
    dispatch(s, { type: 'startLoop' });
    expect(loopRule(s)).toBe('swiftAliens');
    expect(LOOP_RULE_NUMBERS.swiftSpeed).toBeGreaterThan(1);
  });
});

describe('Fluch-Siegel', () => {
  it('wählbar nach dem Finale, höchstens fünf, wirken in der nächsten Schleife', () => {
    const s = afterFinale();
    expect(dispatch(s, { type: 'toggleCurse', curse: 'frailWalls' })).toBeNull();
    expect(dispatch(s, { type: 'toggleCurse', curse: 'weakClicks' })).toBeNull();
    expect(dispatch(s, { type: 'toggleCurse', curse: 'bogus' })).toBe('reason.unknown');
    s.units = [{ id: 1, classId: 'knight', level: 1, xp: 0 }];
    const wall = wallMaxHp(s);
    const click = clickDamage(s);
    dispatch(s, { type: 'startLoop' });
    expect(s.loop.curses).toEqual(['frailWalls', 'weakClicks']);
    expect(s.loop.nextCurses).toEqual(['frailWalls', 'weakClicks']);
    expect(wallMaxHp(s)).toBeLessThanOrEqual(Math.round(wall * CURSE_NUMBERS.frailWallsMult) + 1);
    expect(clickDamage(s)).toBeCloseTo(click * CURSE_NUMBERS.weakClicksMult);
    // Abwählen nach Finale; Bestzeit je Kombination.
    s.finale.wonAt = s.time + 100;
    dispatch(s, { type: 'startLoop' });
    expect(s.loop.best[curseKey(['weakClicks', 'frailWalls'])]).toBe(100);
    expect(s.loop.seals).toBeCloseTo(1 + 1 + 2 * LOOP.sealPerCurse);
  });

  it('zähe Aliens haben doppelte LP', () => {
    const spawnHp = (curses: string[]) => {
      const s = afterFinale();
      s.epoch = 1;
      s.units = [{ id: 1, classId: 'knight', level: 1, xp: 0 }];
      s.loop.curses = curses;
      startBattle(s, 0);
      for (let i = 0; i < 100 && s.battle!.enemies.length === 0; i++) tickBattle(s, 0.05);
      return s.battle!.enemies[0]!.maxHp;
    };
    expect(spawnHp(['toughAliens'])).toBeCloseTo(spawnHp([]) * CURSE_NUMBERS.toughAliensMult);
  });
});
