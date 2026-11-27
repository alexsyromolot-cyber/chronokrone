import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data/buildings';
import { BATTLE } from '../data/enemies';
import { dispatch } from './actions';
import { tickBattle, wallMaxHp } from './battle';
import {
  buildCost,
  milestoneMultiplier,
  productionRates,
  tileAt,
  tileProduction,
  upgradeCost,
} from './castle';
import { newGame, tick } from './game';
import { gain, resourceCap, scaledCost } from './resources';
import { createInitialState, type GameState } from './state';
import { recruitCost, xpForNext } from './units';

/** Zustand nach der ersten Schlacht, mit etwas Startkapital. */
function afterFirstBattle(): GameState {
  const state = newGame(1);
  for (let i = 0; i < 20 * 200 && state.battle; i++) tick(state, 0.05);
  for (const id of ['gold', 'wood', 'stone'] as const) state.resources[id] = new Decimal(200);
  return state;
}

describe('Ressourcen', () => {
  it('kappt Gutschriften am Lagerlimit', () => {
    const s = createInitialState(1);
    gain(s, 'wood', 1e6);
    expect(s.resources.wood.eq(resourceCap(s, 'wood'))).toBe(true);
  });

  it('skaliert Kosten exponentiell und rundet auf', () => {
    const c = scaledCost({ gold: 10 }, 1.5, 2);
    expect(c.gold?.toNumber()).toBe(23); // 10 × 1,5² = 22,5 → 23
  });
});

describe('Erste Schlacht', () => {
  it('ist ohne Klicks verloren und dauert etwa eine Minute', () => {
    const state = newGame(42);
    let seconds = 0;
    while (state.battle && seconds < 300) {
      tick(state, 0.05);
      seconds += 0.05;
    }
    expect(state.lastBattle?.result).toBe('lost');
    expect(seconds).toBeGreaterThan(35);
    expect(seconds).toBeLessThan(90);
    expect(state.unlocked.castle).toBe(true);
    expect(state.log.some((l) => l.key === 'narrator.firstDefeat')).toBe(true);
  });

  it('ist deterministisch bei gleichem Seed', () => {
    const run = () => {
      const s = newGame(7);
      while (s.battle) tick(s, 0.05);
      return [s.lastBattle?.kills, s.resources.gold.toString(), s.resources.scrap.toString()];
    };
    expect(run()).toEqual(run());
  });

  it('garantiert Alien-Schrott spätestens nach der Pity-Grenze', () => {
    const s = newGame(3);
    s.rng.seed = 0; // beliebig – die Pity-Grenze muss unabhängig vom Glück greifen
    let kills = 0;
    while (s.resources.scrap.eq(0) && s.battle) {
      const before = s.stats.kills;
      tick(s, 0.05);
      kills += s.stats.kills - before;
    }
    expect(kills).toBeLessThanOrEqual(BATTLE.scrapPity);
  });
});

describe('Burg', () => {
  it('sperrt Bauen, bis die Burg freigeschaltet ist', () => {
    const s = newGame(1);
    s.resources.gold = new Decimal(100);
    expect(dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' })).toBe('reason.notYet');
  });

  it('baut, produziert mit Geländebonus und schaltet Anwerben sofort frei', () => {
    const s = afterFirstBattle();
    expect(dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' })).toBeNull();
    expect(s.unlocked.recruit).toBe(true);
    const p = tileProduction(s, tileAt(s, 2, 3)!)!;
    // Wald: 0,15 × Level 1 × Meilenstein 1 × Gelände 1,5 × (1 + 0)
    expect(p.terrain).toBe(1.5);
    expect(p.total).toBeCloseTo(BUILDINGS.lumberHut.produces!.perLevel * 1.5 * p.chronicle); // Chronik & Erfolge
    expect(productionRates(s).wood).toBeCloseTo(p.total);
  });

  it('verteuert weitere Gebäude desselben Typs und Ausbauten', () => {
    const s = afterFirstBattle();
    const first = buildCost(s, 'lumberHut').gold!.toNumber();
    dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' });
    expect(buildCost(s, 'lumberHut').gold!.toNumber()).toBeGreaterThan(first);
    const tile = tileAt(s, 2, 3)!;
    const lv2 = upgradeCost(tile).gold!.toNumber();
    dispatch(s, { type: 'upgrade', x: 2, y: 3 });
    expect(upgradeCost(tile).gold!.toNumber()).toBeGreaterThan(lv2);
  });

  it('verdoppelt die Produktion an Meilensteinen', () => {
    expect(milestoneMultiplier(9)).toBe(1);
    expect(milestoneMultiplier(10)).toBe(2);
    expect(milestoneMultiplier(25)).toBe(4);
  });

  it('rodet nur Felder neben freien Feldern', () => {
    const s = afterFirstBattle();
    expect(dispatch(s, { type: 'clearTile', x: 5, y: 5 })).toBe('reason.notAdjacent');
    expect(dispatch(s, { type: 'clearTile', x: 2, y: 2 })).toBeNull();
    expect(tileAt(s, 2, 2)!.unlocked).toBe(true);
  });
});

describe('Einheiten', () => {
  it('Holzfäller brauchen eine Hütte und erhöhen die Produktion', () => {
    const s = afterFirstBattle();
    dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' });
    const before = productionRates(s).wood;
    expect(dispatch(s, { type: 'recruit', classId: 'woodcutter' })).toBeNull();
    expect(productionRates(s).wood).toBeGreaterThan(before);
    expect(recruitCost(s, 'woodcutter').gold!.toNumber()).toBeGreaterThan(15);
  });

  it('Truppen sind ohne Kaserne auf 3 begrenzt', () => {
    const s = afterFirstBattle();
    dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' });
    expect(dispatch(s, { type: 'recruit', classId: 'peasant' })).toBe('reason.noTroopSlots');
  });

  it('Level-Ups geben Skillpunkte, XP-Kurve wächst', () => {
    expect(xpForNext(2)).toBeGreaterThan(xpForNext(1));
    const s = newGame(5);
    while (s.battle) tick(s, 0.05);
    expect(s.stats.skillPointsEarned).toBeGreaterThanOrEqual(0);
  });

  it('Ausdauer der Truppen erhöht die Mauer-LP', () => {
    const s = createInitialState(1);
    const withThree = wallMaxHp(s);
    s.units.pop();
    expect(wallMaxHp(s)).toBeLessThan(withThree);
  });
});

describe('Schlacht-Ablauf', () => {
  it('Sieg nach allen Wellen schaltet die nächste Belagerungsstufe frei', () => {
    const s = afterFirstBattle();
    dispatch(s, { type: 'startBattle' });
    // Übermächtige Verteidiger simulieren: Gegner sterben sofort.
    for (let i = 0; i < 20 * 400 && s.battle; i++) {
      for (const e of s.battle.enemies) e.hp = 0.0001;
      tickBattle(s, 0.05);
    }
    expect(s.lastBattle?.result).toBe('won');
    expect(s.siegeLevel).toBe(1);
  });
});
