import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../data/achievements';
import { de } from '../i18n/de';
import { en } from '../i18n/en';
import { dispatch } from './actions';
import { achievementMultiplier, checkAchievements } from './achievements';
import { productionRates } from './castle';
import { newGame, tick } from './game';
import { tickBattle } from './battle';

describe('Achievements', () => {
  it('es gibt rund 120 und jede Kennzahl hat Name und Beschreibung in beiden Sprachen', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(120);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    for (const a of ACHIEVEMENTS) {
      expect(de).toHaveProperty(`achm.${a.metric}`);
      expect(de).toHaveProperty(`achd.${a.metric}`);
      expect(en).toHaveProperty(`achm.${a.metric}`);
    }
  });

  it('die erste Schlacht schaltet die ersten Erfolge frei, jeder gibt +1 %', () => {
    const s = newGame(71);
    while (s.battle) tick(s, 0.05);
    s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
    for (let i = 0; i < 40; i++) tick(s, 0.05);
    expect(s.achievements['secret.firstDefeat']).toBeDefined();
    expect(s.achievements['kills.1']).toBeDefined();
    const n = Object.keys(s.achievements).length;
    expect(achievementMultiplier(s)).toBeCloseTo(1 + 0.01 * n);
  });

  it('der Bonus wirkt auf die Produktion', () => {
    const s = newGame(72);
    while (s.battle) tick(s, 0.05);
    s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
    s.achievements = {};
    const base = productionRates(s).gold;
    s.achievements = { a: 1, b: 1, c: 1, d: 1, e: 1, f: 1, g: 1, h: 1, i: 1, j: 1 };
    expect(productionRates(s).gold).toBeCloseTo(base * 1.1);
  });

  it('geheim: Sieg ohne einen einzigen Klick', () => {
    const s = newGame(73);
    while (s.battle) tick(s, 0.05);
    s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
    dispatch(s, { type: 'startBattle' });
    // Über eine Funktion lesen: TypeScript hält s.battle nach der while-Schleife sonst für immer null.
    const battle = () => s.battle;
    for (let i = 0; i < 20 * 400; i++) {
      const b = battle();
      if (!b) break;
      for (const e of b.enemies) e.hp = 0.0001;
      tickBattle(s, 0.05);
    }
    expect(s.stats.noClickWins).toBe(1);
    checkAchievements(s);
    expect(s.achievements['secret.pacifist']).toBeDefined();
    expect(s.timeline.some((e) => e.key === 'firstWin')).toBe(true);
  });

  it('bleiben beim Zeitsprung erhalten, der Zeitstrahl wächst mit', () => {
    const s = newGame(74);
    while (s.battle) tick(s, 0.05);
    s.scene.result = null; // Ergebnisfenster schließen: zurück ins Dorf
    for (let i = 0; i < 40; i++) tick(s, 0.05);
    const before = Object.keys(s.achievements).length;
    Object.assign(s.unlocked, { timeMachine: true });
    s.timeMachineAt = s.time;
    s.resources.gold = new Decimal(0);
    dispatch(s, { type: 'jump' });
    expect(Object.keys(s.achievements).length).toBeGreaterThanOrEqual(before);
    expect(s.timeline.some((e) => e.key === 'jump.2')).toBe(true);
    expect(s.timeline.some((e) => e.key === 'unlock.castle')).toBe(true);
  });
});
