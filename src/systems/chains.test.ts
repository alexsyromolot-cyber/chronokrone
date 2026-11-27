import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { RESOURCE_IDS } from '../data/resources';
import { dispatch } from './actions';
import { achievementMultiplier } from './achievements';
import { tickBattle } from './battle';
import { flows, inBounds, recipeBottleneck, tileAt, tickCastle } from './castle';
import { newGame, tick } from './game';
import { resourceCap } from './resources';
import type { GameState } from './state';
import { troopCapacity, unitDamage } from './units';

/** Burg nach der ersten Schlacht, mit reichlich Mitteln und allen Bereichen offen. */
function rich(): GameState {
  const s = newGame(11);
  while (s.battle) tick(s, 0.05);
  s.unlocked.research = true;
  s.unlocked.recruit = true;
  for (const id of RESOURCE_IDS) s.resources[id] = new Decimal(1000);
  for (const t of s.tiles) t.unlocked = true;
  return s;
}

describe('Forschung', () => {
  it('sperrt Gebäude bis zur Forschung und zieht Wissen ab', () => {
    const s = rich();
    expect(dispatch(s, { type: 'build', x: 5, y: 2, building: 'mine' })).toBe('reason.requiresResearch');
    expect(dispatch(s, { type: 'research', id: 'mining' })).toBeNull();
    expect(s.resources.knowledge.toNumber()).toBe(1000 - 15);
    expect(dispatch(s, { type: 'build', x: 5, y: 2, building: 'mine' })).toBeNull();
  });

  it('verlangt die Voraussetzungen', () => {
    const s = rich();
    expect(dispatch(s, { type: 'research', id: 'smelting' })).toBe('reason.requiresResearch');
    dispatch(s, { type: 'research', id: 'mining' });
    expect(dispatch(s, { type: 'research', id: 'smelting' })).toBeNull();
    expect(dispatch(s, { type: 'research', id: 'smelting' })).toBe('reason.done');
  });

  it('Landvermessung vergrößert den erreichbaren Kartenbereich', () => {
    const s = newGame(1);
    const corner = tileAt(s, 0, 0)!;
    const ring1 = tileAt(s, 1, 1)!;
    expect(inBounds(s, ring1)).toBe(false);
    s.research.survey1 = true;
    expect(inBounds(s, ring1)).toBe(true);
    expect(inBounds(s, corner)).toBe(false);
    s.research.survey2 = true;
    expect(inBounds(s, corner)).toBe(true);
  });
});

describe('Produktionsketten', () => {
  it('Schmelze wandelt Erz in Eisen im Verhältnis 2:1', () => {
    const s = rich();
    s.research.mining = true;
    s.research.smelting = true;
    s.resources.ore = new Decimal(100);
    s.resources.iron = new Decimal(0);
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'smelter' });
    for (let i = 0; i < 20 * 10; i++) tickCastle(s, 0.05);
    const iron = s.resources.iron.toNumber();
    expect(iron).toBeGreaterThan(1);
    expect(100 - s.resources.ore.toNumber()).toBeCloseTo(iron * 2, 5);
  });

  it('läuft ohne Zutaten nicht und meldet den Engpass', () => {
    const s = rich();
    s.research.mining = true;
    s.research.smelting = true;
    s.resources.ore = new Decimal(0);
    s.resources.iron = new Decimal(0);
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'smelter' });
    tickCastle(s, 1);
    expect(s.resources.ore.toNumber()).toBe(0);
    expect(recipeBottleneck(s, tileAt(s, 3, 2)!)?.resource).toBe('ore');
  });

  it('verschwendet keine Zutaten, wenn das Ergebnislager voll ist', () => {
    const s = rich();
    s.research.sawing = true;
    s.resources.planks = resourceCap(s, 'planks');
    const wood = s.resources.wood.toNumber();
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'sawmill' });
    const woodAfterBuild = s.resources.wood.toNumber();
    tickCastle(s, 1);
    expect(s.resources.wood.toNumber()).toBeGreaterThanOrEqual(woodAfterBuild);
    expect(wood).toBeGreaterThan(woodAfterBuild);
    expect(recipeBottleneck(s, tileAt(s, 3, 2)!)?.resource).toBe('outputFull');
  });

  it('Flüsse zählen Verbrauch und Ertrag der Rezepte', () => {
    const s = rich();
    s.research.sawing = true;
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'sawmill' });
    const f = flows(s);
    expect(f.consumed.wood).toBeCloseTo(2 * f.produced.planks);
  });

  it('Lagerhaus erhöht alle Lagerlimits um 25 % je Level', () => {
    const s = rich();
    const before = resourceCap(s, 'stone').toNumber();
    s.research.storage = true;
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'storehouse' });
    expect(resourceCap(s, 'stone').toNumber()).toBe(Math.floor(before * 1.25));
  });
});

describe('Neue Klassen', () => {
  it('Bogenschützen treffen Aliens weit vor der Mauer, Bauern nicht', () => {
    const s = rich();
    s.research.sawing = true;
    s.research.archery = true;
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'archeryRange' });
    expect(troopCapacity(s)).toBe(5);
    expect(dispatch(s, { type: 'recruit', classId: 'archer' })).toBeNull();
    dispatch(s, { type: 'startBattle' });
    const b = s.battle!;
    b.waveTimer = 999;
    b.enemies.push({ id: 99, type: 'saugling', x: 200, prevX: 200, lane: 0, hp: 50, maxHp: 50 });
    tickBattle(s, 0.05);
    expect(b.enemies[0]!.hp).toBeLessThan(50);
    expect(s.fx.some((f) => f.kind === 'shot')).toBe(true);
  });

  it('Schaden nutzt das Hauptattribut der Klasse', () => {
    const s = rich();
    const archer = { id: 1, classId: 'archer' as const, level: 1, xp: 0 };
    // Bogenschütze: 2 × (1 + 0,1 × Geschick 6) = 3,2 (ohne Boni)
    expect(unitDamage(s, archer)).toBeCloseTo(3.2 * achievementMultiplier(s)); // + Erfolgs-Bonus
  });
});
