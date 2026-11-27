import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { CARD_RULES, CARDS } from '../data/cards';
import { POWER } from '../data/power';
import { dispatch } from './actions';
import { wallMaxHp } from './battle';
import { recipeRate, tileAt, tileProduction } from './castle';
import { cardBonus, powerBonus, powerNetwork, powerSatisfaction, rollCard, tickPower } from './power';
import { resetForEpoch } from './prestige';
import { createInitialState, type GameState, type Tile } from './state';

/** Ein Gebäude direkt auf ein Feld setzen (Raster-Tests brauchen genaue Positionen). */
function place(s: GameState, x: number, y: number, building: Tile['building'], level = 1): Tile {
  const t = tileAt(s, x, y)!;
  t.unlocked = true;
  t.building = building;
  t.level = level;
  return t;
}

function epoch3(): GameState {
  const s = createInitialState(5);
  s.epoch = 3;
  s.unlocked.castle = true;
  s.resources.coal = new Decimal(1000);
  return s;
}

describe('Stromnetz', () => {
  it('schließt Nachbarn von Kraftwerk und verbundenen Masten an, aber nicht weiter', () => {
    const s = epoch3();
    place(s, 0, 0, 'powerPlant', 5);
    place(s, 1, 0, 'pylon');
    place(s, 2, 0, 'pylon');
    const near = place(s, 0, 1, 'lumberHut'); // grenzt ans Kraftwerk
    const viaPylon = place(s, 2, 1, 'quarry'); // grenzt an den zweiten Mast
    const far = place(s, 5, 5, 'lumberHut');
    const net = powerNetwork(s);
    expect(net.connected.has(near)).toBe(true);
    expect(net.connected.has(viaPylon)).toBe(true);
    expect(net.connected.has(far)).toBe(false);
    // Ein Mast ohne Verbindung zum Kraftwerk leitet nichts.
    place(s, 6, 6, 'pylon');
    const lonely = place(s, 6, 7, 'quarry');
    expect(powerNetwork(s).connected.has(lonely)).toBe(false);
  });

  it('Bonus = maxBonus × Versorgung, wirkt auf Produktion und Rezepte', () => {
    const s = epoch3();
    place(s, 0, 0, 'powerPlant', 1); // 3 Strom
    const hut = place(s, 0, 1, 'lumberHut', 1);
    const mill = place(s, 1, 0, 'sawmill', 1);
    expect(powerSatisfaction(s)).toBe(1);
    expect(powerBonus(s, hut)).toBeCloseTo(POWER.maxBonus);
    expect(tileProduction(s, hut)!.power).toBeCloseTo(1 + POWER.maxBonus);
    const before = recipeRate(s, mill);
    hut.level = 5; // Bedarf 5 + 1 = 6 > Angebot 3
    expect(powerSatisfaction(s)).toBeCloseTo(0.5);
    expect(recipeRate(s, mill)).toBeLessThan(before);
  });

  it('ohne Kohle kein Strom; Kraftwerke verbrennen Kohle', () => {
    const s = epoch3();
    place(s, 0, 0, 'powerPlant', 2);
    const hut = place(s, 0, 1, 'lumberHut', 1);
    tickPower(s, 1);
    expect(s.resources.coal.toNumber()).toBeCloseTo(1000 - POWER.coalPerLevel * 2);
    s.resources.coal = new Decimal(0);
    tickPower(s, 1);
    expect(s.power.fuel).toBe(0);
    expect(powerBonus(s, hut)).toBe(0);
  });
});

describe('Karten', () => {
  it('erst ab Epoche 3, mit Glücksschutz, füllt leere Slots selbst', () => {
    const s = createInitialState(9);
    s.epoch = 2;
    for (let i = 0; i < 20; i++) rollCard(s);
    expect(Object.keys(s.cards)).toHaveLength(0);
    s.epoch = 3;
    let streak = 0;
    while (Object.keys(s.cards).length === 0) {
      rollCard(s);
      streak++;
    }
    expect(streak).toBeLessThanOrEqual(CARD_RULES.pity);
    expect(s.cardSlots).toHaveLength(1);
  });

  it('Slots: höchstens drei, nicht während der Schlacht, Nachteile wirken', () => {
    const s = epoch3();
    for (const c of CARDS) s.cards[c.id] = true;
    s.cardSlots = [];
    const wall = wallMaxHp(s);
    expect(dispatch(s, { type: 'equipCard', cardId: 'glassCannon' })).toBeNull();
    expect(cardBonus(s, 'damage')).toBeCloseTo(0.6 + CARD_RULES.setBonus);
    expect(wallMaxHp(s)).toBeLessThan(wall);
    dispatch(s, { type: 'equipCard', cardId: 'sharpSteel' });
    dispatch(s, { type: 'equipCard', cardId: 'thickWalls' });
    expect(dispatch(s, { type: 'equipCard', cardId: 'jester' })).toBe('reason.slotsFull');
    s.battle = {} as GameState['battle'];
    expect(dispatch(s, { type: 'unequipCard', cardId: 'sharpSteel' })).toBe('reason.battleRunning');
    s.battle = null;
    expect(dispatch(s, { type: 'unequipCard', cardId: 'sharpSteel' })).toBeNull();
    expect(s.cardSlots).toEqual(['glassCannon', 'thickWalls']);
  });

  it('Karten und Slots überleben den Sprung, der Brennstoff wird zurückgesetzt', () => {
    const s = epoch3();
    s.cards.sharpSteel = true;
    s.cardSlots = ['sharpSteel'];
    s.power.fuel = 0.2;
    resetForEpoch(s);
    expect(s.cards.sharpSteel).toBe(true);
    expect(s.cardSlots).toEqual(['sharpSteel']);
    expect(s.power.fuel).toBe(1);
  });
});
