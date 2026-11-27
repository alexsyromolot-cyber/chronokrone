import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { BATTLE, ENEMIES, FINALE } from '../data/enemies';
import { COMPLETION, STARSHIP } from '../data/starship';
import { dispatch } from './actions';
import { tickBattle } from './battle';
import { tileAt, tileProduction } from './castle';
import { resolveEvent } from './events';
import { jumpBlocker } from './prestige';
import { completionBonus, completionShare, isConnected, rosetteBonus } from './starship';
import { createInitialState, type GameState, type Tile } from './state';

function place(s: GameState, x: number, y: number, building: Tile['building'], level = 1): Tile {
  const t = tileAt(s, x, y)!;
  t.unlocked = true;
  t.building = building;
  t.level = level;
  return t;
}

function epoch5(): GameState {
  const s = createInitialState(11);
  s.epoch = 5;
  s.unlocked.castle = true;
  return s;
}

describe('Raumschiff-Raster', () => {
  it('nur mit der Brücke verbundene Module produzieren', () => {
    const s = epoch5();
    // Bergfried steht auf (3,3).
    const near = place(s, 2, 3, 'lumberHut');
    const far = place(s, 0, 0, 'lumberHut');
    expect(isConnected(s, near)).toBe(true);
    expect(isConnected(s, far)).toBe(false);
    expect(tileProduction(s, far)!.total).toBe(0);
    expect(tileProduction(s, near)!.total).toBeGreaterThan(0);
    // Lücke schließen: (1,3) und (0,3)… bis (0,0) über Hüllensegmente.
    for (const [x, y] of [
      [1, 3],
      [0, 3],
      [0, 2],
      [0, 1],
    ] as const)
      place(s, x, y, 'hullPlate');
    expect(isConnected(s, far)).toBe(true);
    expect(tileProduction(s, far)!.total).toBeGreaterThan(0);
  });

  it('vor Epoche 5 gilt die Regel nicht', () => {
    const s = epoch5();
    s.epoch = 4;
    const far = place(s, 0, 0, 'lumberHut');
    expect(isConnected(s, far)).toBe(true);
  });

  it('Neon-Rosetten leuchten durch Zeile und Spalte', () => {
    const s = epoch5();
    const hut = place(s, 2, 3, 'lumberHut');
    const base = tileProduction(s, hut)!.total;
    place(s, 2, 4, 'rosette', 3); // gleiche Spalte, verbunden über die Hütte
    expect(rosetteBonus(s, hut)).toBeCloseTo(STARSHIP.rosettePerLevel * 3);
    expect(tileProduction(s, hut)!.total).toBeCloseTo(base * (1 + STARSHIP.rosettePerLevel * 3));
    const off = place(s, 4, 2, 'lumberHut'); // weder Zeile noch Spalte
    expect(rosetteBonus(s, off)).toBe(0);
  });
});

describe('Komplettierung', () => {
  it('Anteil aller Sammlungen, Bonus erst ab Epoche 5', () => {
    const s = epoch5();
    expect(completionShare(s)).toBe(0);
    s.relics = Object.fromEntries(
      [
        'leadApron',
        'crackedHourglass',
        'goldenScale',
        'luckyIsotope',
        'twinStrike',
        'mirrorShield',
        'burningChalice',
        'treasureMap',
      ].map((id) => [id, true]),
    );
    expect(completionShare(s)).toBeCloseTo(1 / 6);
    expect(completionBonus(s)).toBeCloseTo(COMPLETION.maxBonus / 6);
    s.epoch = 4;
    expect(completionBonus(s)).toBe(0);
  });
});

describe('Meteorschauer', () => {
  it('Schilde kosten Gold, Ernten füllt Sternenstaub und kostet ein Modul-Level', () => {
    const s = epoch5();
    s.resources.gold = new Decimal(1000);
    s.events.active = { id: 'meteorShower', expiresAt: 999, params: {} };
    expect(resolveEvent(s, 'shields')).toBeNull();
    expect(s.resources.gold.toNumber()).toBe(900);

    const hut = place(s, 2, 3, 'lumberHut', 5);
    s.events.active = { id: 'meteorShower', expiresAt: 999, params: {} };
    resolveEvent(s, 'harvest');
    expect(s.resources.stardust.toNumber()).toBeGreaterThan(0);
    expect(hut.level).toBe(4);
  });
});

describe('Finale', () => {
  it('kein Sprung in der letzten Epoche, stattdessen das Mutterschiff', () => {
    const s = epoch5();
    s.units = [{ id: 1, classId: 'archer', level: 50, xp: 0 }];
    expect(dispatch(s, { type: 'startFinale' })).toBe('reason.noTimeMachine');
    s.timeMachineAt = 10;
    expect(jumpBlocker(s)).toBe('reason.lastEpoch');
    expect(dispatch(s, { type: 'startFinale' })).toBeNull();
    expect(s.battle?.final).toBe(true);
  });

  it('das Mutterschiff ruft in Phasen Begleiter, sein Tod gewinnt das Finale', () => {
    const s = epoch5();
    s.units = [{ id: 1, classId: 'archer', level: 1, xp: 0 }];
    s.timeMachineAt = 10;
    dispatch(s, { type: 'startFinale' });
    const b = s.battle!;
    // Direkt in die letzte Welle springen: nur noch das Mutterschiff.
    b.wave = BATTLE.wavesPerBattle;
    b.clearedWaves = BATTLE.wavesPerBattle - 1;
    b.waveTimer = 999;
    b.enemies.push({ id: 99, type: 'mutterschiff', x: 200, prevX: 200, lane: 1, hp: 1000, maxHp: 1000 });
    expect(ENEMIES.mutterschiff.boss).toBe(true);

    const boss = b.enemies[0]!;
    dispatch(s, { type: 'clickEnemy', enemyId: boss.id }); // Klickschaden ist klein
    boss.hp = 600; // unter die erste Schwelle (66 %)
    dispatch(s, { type: 'clickEnemy', enemyId: boss.id });
    expect(b.enemies.filter((e) => e.type === FINALE.escort)).toHaveLength(FINALE.escortsPerPhase);
    expect(b.phase).toBe(1);

    // Alle Begleiter und das Mutterschiff fallen → Sieg → Finale (zweite Phase schon vorbei).
    b.phase = FINALE.phases.length;
    for (const e of b.enemies) e.hp = 0.001;
    for (const e of [...b.enemies]) dispatch(s, { type: 'clickEnemy', enemyId: e.id });
    tickBattle(s, 0.05);
    expect(s.battle).toBeNull();
    expect(s.finale.wonAt).not.toBeNull();
    expect(s.timeParts.mutterschiff).toBeUndefined();
    expect(s.fx.some((f) => f.kind === 'finale')).toBe(true);
  });
});
