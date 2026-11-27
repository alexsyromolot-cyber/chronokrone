import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { EPOCH2_MAP } from '../data/epochs';
import { deserialize, serialize } from '../save/serialize';
import { dispatch } from './actions';
import { clickDamage } from './battle';
import { chronicleCost, chronicleRank } from './chronicle';
import { productionRates, tileAt } from './castle';
import { newGame, tick } from './game';
import { shardsForJump, tokensForJump } from './prestige';
import type { GameState } from './state';

/** Ein Stand kurz vor dem Sprung: Zeitmaschine fertig, etwas Fortschritt. */
function readyToJump(): GameState {
  const s = newGame(41);
  while (s.battle) tick(s, 0.05);
  Object.assign(s.unlocked, { timeMachine: true, research: true, recruit: true, skills: true });
  s.siegeLevel = 9;
  s.skills = { pitchforkTraining: 3, harvestHands: 2, thickSkulls: 3, sharpAxes: 2 };
  s.skillPoints.peasant = 2;
  s.research.mining = true;
  s.spells.stoneRain = 4;
  s.bestiary.saugling = 99;
  s.timeMachineAt = s.time;
  s.resources.gold = new Decimal(9999);
  return s;
}

describe('Entwicklungssprung', () => {
  it('Zeitsplitter: 10 × Epoche + 3 × Belagerungsstufe + 1 je 5 Skill-Stufen', () => {
    const s = readyToJump();
    expect(shardsForJump(s)).toBe(10 + 27 + 2);
    expect(tokensForJump(s)).toBe(10 + 2);
  });

  it('braucht die fertige Zeitmaschine und keine laufende Schlacht', () => {
    const s = readyToJump();
    s.timeMachineAt = null;
    expect(dispatch(s, { type: 'jump' })).toBe('reason.noTimeMachine');
    s.timeMachineAt = s.time;
    dispatch(s, { type: 'startBattle' });
    expect(dispatch(s, { type: 'jump' })).toBe('reason.battleRunning');
  });

  it('setzt die Epoche zurück und behält, was bleiben soll', () => {
    const s = readyToJump();
    expect(dispatch(s, { type: 'jump' })).toBeNull();
    expect(s.epoch).toBe(2);
    expect(s.shards).toBe(39);
    expect(s.respecTokens).toBe(12);
    // zurückgesetzt
    expect(s.skills).toEqual({});
    expect(s.siegeLevel).toBe(0);
    expect(s.units).toHaveLength(3);
    expect(s.resources.gold.eq(0)).toBe(true);
    expect(s.timeMachineAt).toBeNull();
    expect(s.tiles.find((t) => t.x === 0 && t.y === 0)!.terrain).toBe('rock'); // Karte von Epoche 2
    expect(s.tiles).toHaveLength(EPOCH2_MAP.width * EPOCH2_MAP.height);
    // bleibt
    expect(s.research.mining).toBe(true);
    expect(s.spells.stoneRain).toBe(4);
    expect(s.bestiary.saugling).toBe(99);
    expect(s.epochTimes).toHaveLength(1);
  });

  it('Umskill-Tokens werden zu Skillpunkten einer Klasse', () => {
    const s = readyToJump();
    dispatch(s, { type: 'jump' });
    expect(dispatch(s, { type: 'useToken', classId: 'peasant' })).toBeNull();
    expect(s.skillPoints.peasant).toBe(1);
    expect(s.respecTokens).toBe(11);
  });

  it('Gegner sind in Epoche 2 stärker', () => {
    const s = readyToJump();
    dispatch(s, { type: 'jump' });
    dispatch(s, { type: 'startBattle' });
    for (let i = 0; i < 60; i++) tick(s, 0.05);
    const e = s.battle!.enemies[0]!;
    expect(e.maxHp).toBeGreaterThanOrEqual(4 * 6);
  });
});

describe('Chronik', () => {
  it('kostet Splitter, wird teurer und wirkt dauerhaft', () => {
    const s = readyToJump();
    dispatch(s, { type: 'jump' });
    const base = productionRates(s).gold;
    const cost0 = chronicleCost(s, 'prodAll');
    expect(dispatch(s, { type: 'buyChronicle', id: 'prodAll' })).toBeNull();
    expect(s.shards).toBe(39 - cost0);
    expect(chronicleCost(s, 'prodAll')).toBeGreaterThan(cost0);
    expect(productionRates(s).gold).toBeCloseTo(base * 1.25);
  });

  it('Voraussetzungen und Start-Boni greifen beim nächsten Sprung', () => {
    const s = readyToJump();
    s.shards = 200;
    expect(dispatch(s, { type: 'buyChronicle', id: 'grandKeep' })).toBe('reason.requiresChronicle');
    dispatch(s, { type: 'buyChronicle', id: 'startSupplies' });
    dispatch(s, { type: 'buyChronicle', id: 'grandKeep' });
    dispatch(s, { type: 'buyChronicle', id: 'dmgAll' });
    dispatch(s, { type: 'buyChronicle', id: 'veterans' });
    dispatch(s, { type: 'buyChronicle', id: 'clickPower' });
    dispatch(s, { type: 'jump' });
    expect(s.resources.gold.toNumber()).toBe(100);
    expect(tileAt(s, 3, 3)!.level).toBe(2);
    expect(s.units[0]!.level).toBe(4);
    expect(chronicleRank(s, 'clickPower')).toBe(1);
    expect(clickDamage(s)).toBeCloseTo(2 * 2); // Bergfried 2 × (1 + 100 %)
  });

  it('Epoche, Chronik und Splitter überleben Speichern und Laden', () => {
    const s = readyToJump();
    dispatch(s, { type: 'jump' });
    dispatch(s, { type: 'buyChronicle', id: 'prodAll' });
    const { state } = deserialize(serialize(s));
    expect(state.epoch).toBe(2);
    expect(state.chronicle.prodAll).toBe(1);
    expect(state.shards).toBe(s.shards);
    expect(state.respecTokens).toBe(s.respecTokens);
  });
});
