import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../save/storage';
import { SaveManager } from '../save/save-manager';
import { newGame, tick } from './game';
import { isRested, welcomeBack } from './recap';
import { xpMultiplier } from './units';

const MIN = 60_000;

describe('Rückblick und Ausgeruht-Bonus', () => {
  it('nach kurzer Pause gibt es nichts, nach langer Rückblick und doppelte XP', () => {
    const s = newGame(81);
    welcomeBack(s, 0);
    while (s.battle) tick(s, 0.05);
    const saves = new SaveManager(new MemoryStorage(), () => 10 * MIN);
    saves.save(s);
    expect(s.session.lastSummary?.kills).toBeGreaterThan(0);

    expect(welcomeBack(s, 12 * MIN)).toBeNull(); // nur 2 Minuten weg
    s.session.lastSeenAt = 10 * MIN;
    const back = welcomeBack(s, 10 * MIN + 3 * 60 * MIN)!; // 3 Stunden weg
    expect(back.restedMinutes).toBe(15);
    expect(back.summary.kills).toBeGreaterThan(0);
    expect(isRested(s)).toBe(true);
    const u = s.units[0]!;
    const rested = xpMultiplier(s, u);
    s.time += 16 * 60;
    expect(isRested(s)).toBe(false);
    expect(xpMultiplier(s, u)).toBeCloseTo(rested / 2);
  });

  it('Bonus: 5 Minuten je Stunde, mindestens 2', () => {
    const s = newGame(82);
    s.session.lastSeenAt = 1;
    s.session.lastSummary = {
      time: 60,
      kills: 1,
      wins: 0,
      buildingsBuilt: 0,
      goldEarned: 0,
      skillRanksBought: 0,
      research: 0,
      achievements: 0,
      epoch: 0,
    };
    expect(welcomeBack(s, 1 + 10 * MIN)!.restedMinutes).toBe(2);
    s.session.lastSeenAt = 1;
    expect(welcomeBack(s, 1 + 60 * MIN)!.restedMinutes).toBe(5);
  });

  it('es gibt keine Offline-Produktion', () => {
    const s = newGame(83);
    while (s.battle) tick(s, 0.05);
    const gold = s.resources.gold.toString();
    s.session.lastSeenAt = 1;
    s.session.lastSummary = {
      time: 1,
      kills: 0,
      wins: 0,
      buildingsBuilt: 0,
      goldEarned: 0,
      skillRanksBought: 0,
      research: 0,
      achievements: 0,
      epoch: 0,
    };
    welcomeBack(s, 1 + 10 * 60 * MIN);
    expect(s.resources.gold.toString()).toBe(gold);
  });
});
