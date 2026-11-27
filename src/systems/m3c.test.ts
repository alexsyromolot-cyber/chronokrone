import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { BATTLE, ELITES } from '../data/enemies';
import { RESOURCE_IDS } from '../data/resources';
import { dispatch } from './actions';
import { bestiaryBonus, damageEnemy, enrageFactor, tickBattle } from './battle';
import { newGame, tick } from './game';
import type { GameState } from './state';
import { timeMachineBlocker } from './timemachine';

function rich(): GameState {
  const s = newGame(31);
  while (s.battle) tick(s, 0.05);
  s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
  Object.assign(s.unlocked, { research: true, recruit: true, skills: true });
  for (const id of RESOURCE_IDS) s.resources[id] = new Decimal(5000);
  return s;
}

describe('Elitegegner', () => {
  it('erscheint als letzter Gegner der letzten Welle und lässt ein Zeitmaschinenteil fallen', () => {
    const s = rich();
    const first = ELITES[0]!;
    s.siegeLevel = first.siege;
    dispatch(s, { type: 'startBattle', siege: first.siege });
    const b = s.battle!;
    // Übermächtig verteidigen, bis der Elitegegner auftaucht.
    let seen = false;
    for (let i = 0; i < 20 * 600 && s.battle; i++) {
      for (const e of b.enemies) {
        if (e.type === first.enemy) seen = true;
        e.hp = Math.min(e.hp, 0.0001);
      }
      tickBattle(s, 0.05);
    }
    expect(seen).toBe(true);
    expect(s.timeParts[first.enemy]).toBe(true);
    expect(s.unlocked.timeMachine).toBeUndefined(); // wird im nächsten Tick geprüft
    tick(s, 0.05);
    expect(s.unlocked.timeMachine).toBe(true);
  });
});

describe('Kampfregeln', () => {
  it('Schildlinge nehmen weniger Nahkampfschaden', () => {
    const s = rich();
    dispatch(s, { type: 'startBattle' });
    const e = { id: 9, type: 'schildling' as const, x: 80, prevX: 80, lane: 0, hp: 100, maxHp: 100 };
    s.battle!.enemies.push(e);
    damageEnemy(s, e, 10, false, true);
    expect(e.hp).toBeCloseTo(96);
    damageEnemy(s, e, 10, false, false);
    expect(e.hp).toBeCloseTo(86);
  });

  it('Bestiarium gibt +5 % je Abschuss-Stufe', () => {
    const s = rich();
    s.bestiary.saugling = 9;
    expect(bestiaryBonus(s, 'saugling')).toBe(0);
    s.bestiary.saugling = 50;
    expect(bestiaryBonus(s, 'saugling')).toBeCloseTo(0.1);
    s.bestiary.muttersauger = 1;
    expect(bestiaryBonus(s, 'muttersauger')).toBeCloseTo(0.2);
  });

  it('Wut verdoppelt den Mauerschaden nach der Schonfrist', () => {
    expect(enrageFactor(BATTLE.enrageAfter)).toBe(1);
    expect(enrageFactor(BATTLE.enrageAfter + BATTLE.enrageDoubling)).toBeCloseTo(2);
    expect(enrageFactor(BATTLE.enrageAfter + 2 * BATTLE.enrageDoubling)).toBeCloseTo(4);
  });
});

describe('Zeitmaschine', () => {
  it('nennt der Reihe nach, was fehlt, und lässt sich am Ende bauen', () => {
    const s = rich();
    s.unlocked.timeMachine = true;
    // 2000 Gold passen erst mit größerem Bergfried ins Lager.
    s.tiles.find((t) => t.building === 'keep')!.level = 6;
    expect(timeMachineBlocker(s)).toBe('reason.missingParts');
    for (const e of ELITES) s.timeParts[e.enemy] = true;
    expect(timeMachineBlocker(s)).toBe('reason.needsOracle');
    expect(dispatch(s, { type: 'buildOracle' })).toBe('reason.requiresResearch');
    s.research.oracle = true;
    s.resources.chips = new Decimal(20);
    s.resources.scrolls = new Decimal(10);
    expect(dispatch(s, { type: 'buildOracle' })).toBeNull();
    expect(timeMachineBlocker(s)).toBe('reason.requiresResearch');
    s.research.chronology = true;
    expect(timeMachineBlocker(s)).toBe('reason.needsSkills');
    s.skills.pitchforkTraining = 40;
    s.resources.chips = new Decimal(15);
    s.resources.gold = new Decimal(2000);
    expect(dispatch(s, { type: 'buildTimeMachine' })).toBeNull();
    expect(s.timeMachineAt).toBe(s.time);
    expect(dispatch(s, { type: 'buildTimeMachine' })).toBe('reason.done');
  });
});
