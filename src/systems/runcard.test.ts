import { describe, expect, it } from 'vitest';
import { MemoryStorage, DesktopFileStorage } from '../save/storage';
import { performJump } from './prestige';
import { cleanName, decodeRunCard, encodeRunCard, NAME_MAX, runCardOf } from './runcard';
import { createInitialState } from './state';

describe('Run-Karte', () => {
  it('Code hin und zurück, auch mit Umlauten', () => {
    const s = createInitialState(1);
    s.stats.goldEarned = 123456;
    s.loop.best = { '': 3600, 'frailWalls+lean': 5000 };
    const card = runCardOf(s, 'Königin Älex');
    const code = encodeRunCard(card);
    expect(code.startsWith('CK1.')).toBe(true);
    expect(decodeRunCard(code)).toEqual(card);
  });

  it('kaputte oder fremde Codes werden abgelehnt bzw. bereinigt', () => {
    expect(decodeRunCard('hallo')).toBeNull();
    expect(decodeRunCard('CK1.!!!')).toBeNull();
    const evil =
      'CK1.' + btoa(JSON.stringify({ name: 'x'.repeat(100), epoch: 'drei', challenges: { a: 'b', c: 5 } }));
    const card = decodeRunCard(evil)!;
    expect(card.name).toHaveLength(NAME_MAX);
    expect(card.epoch).toBe(0);
    expect(card.challenges).toEqual({ c: 5 });
    expect(cleanName('  a\u0000b  ')).toBe('ab');
  });

  it('merkt den schnellsten Sprung', () => {
    const s = createInitialState(2);
    s.time = 3000;
    s.timeMachineAt = 2900;
    performJump(s);
    s.time = 3000 + 2000;
    s.timeMachineAt = s.time;
    performJump(s);
    expect(s.stats.fastestJump).toBe(2000);
    expect(runCardOf(s, '').fastestJump).toBe(2000);
  });
});

describe('Desktop-Speicher', () => {
  it('reicht an die Brücke durch und meldet Schreibfehler', () => {
    const mem = new MemoryStorage();
    let fail = false;
    const store = new DesktopFileStorage({
      get: (k) => mem.get(k),
      set: (k, v) => (fail ? false : (mem.set(k, v), true)),
      remove: (k) => (mem.remove(k), true),
    });
    store.set('a', '1');
    expect(store.get('a')).toBe('1');
    fail = true;
    expect(() => store.set('a', '2')).toThrow();
    store.remove('a');
    expect(store.get('a')).toBeNull();
  });
});
