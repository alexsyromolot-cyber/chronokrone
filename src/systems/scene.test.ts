import { describe, expect, it } from 'vitest';
import { ROOM_IDS, ROOM_RESOURCES } from '../data/rooms';
import { SCENE } from '../data/scene';
import { dispatch } from './actions';
import { newGame, tick } from './game';
import { roomUnlocked, visibleRooms } from './rooms';
import { isPaused, phase } from './scene';
import { createInitialState, type GameState } from './state';
import { deserialize, serialize } from '../save/serialize';

function afterFirstBattle(): GameState {
  const s = newGame(3);
  while (s.battle) tick(s, 0.05);
  return s;
}

describe('Kampf- und Dorfphase', () => {
  it('Spielstart ist Kampf; nach der Schlacht bleibt das Ergebnisfenster, bis es geschlossen wird', () => {
    const s = newGame(3);
    expect(phase(s)).toBe('battle');
    while (s.battle) tick(s, 0.05);
    expect(phase(s)).toBe('battle');
    expect(s.scene.result?.result).toBe('lost');
    expect(s.scene.result?.kills).toBe(s.lastBattle?.kills);
    // Solange das Ergebnis offen ist, geht es nicht zurück an die Mauer.
    expect(dispatch(s, { type: 'startBattle' })).toBe('reason.resultOpen');
    expect(dispatch(s, { type: 'dismissResult' })).toBeNull();
    expect(phase(s)).toBe('village');
    expect(dispatch(s, { type: 'startBattle' })).toBeNull();
    expect(phase(s)).toBe('battle');
  });

  it('das Ergebnis nennt neue Bestiarium-Einträge und markiert den Rückzug', () => {
    const s = newGame(4);
    for (let i = 0; i < 20 * 30 && s.stats.kills === 0; i++) {
      const e = s.battle!.enemies[0];
      if (e) dispatch(s, { type: 'clickEnemy', enemyId: e.id });
      tick(s, 0.05);
    }
    dispatch(s, { type: 'retreat' });
    expect(s.scene.result?.retreat).toBe(true);
    expect(s.scene.result?.newEnemies.length).toBeGreaterThan(0);
    expect(s.scene.result?.xp).toBeGreaterThan(0);
  });

  it('die Dorf-Produktion läuft im Kampf und im Dorf weiter', () => {
    const s = afterFirstBattle();
    dispatch(s, { type: 'dismissResult' });
    const gold = s.resources.gold.toNumber();
    for (let i = 0; i < 20 * 10; i++) tick(s, 0.05);
    expect(s.resources.gold.toNumber()).toBeGreaterThan(gold);
  });
});

describe('Ereignis-Pause', () => {
  it('Entscheidungen halten die Zeit an, Ereignisse ohne Wahl wirken sofort', () => {
    const s = afterFirstBattle();
    s.events.active = { id: 'merchant', expiresAt: s.time, params: {} };
    expect(isPaused(s)).toBe(true);
    const t0 = s.time;
    tick(s, 1);
    expect(s.time).toBe(t0);
    s.events.active = null;
    // Ein Regen-Ereignis startet und ist sofort erledigt (keine Pause).
    s.unlocked.castle = true;
    s.events.timer = 0;
    let sawRain = false;
    for (let i = 0; i < 200 && !sawRain; i++) {
      s.events.timer = 0;
      tick(s, 0.05);
      if (s.log.some((l) => l.key.startsWith('event.rain'))) sawRain = true;
      if (s.events.active) s.events.active = null; // Entscheidungen hier überspringen
    }
    expect(sawRain).toBe(true);
  });
});

describe('Hofbefehl-Countdown', () => {
  it('lässt sich abbrechen; eine eigene Schlacht macht ihn hinfällig', () => {
    const s = afterFirstBattle();
    dispatch(s, { type: 'dismissResult' });
    s.unlocked.castle = true;
    expect(dispatch(s, { type: 'requestBattle' })).toBeNull();
    expect(s.scene.countdown).toBe(SCENE.orderCountdown);
    expect(dispatch(s, { type: 'requestBattle' })).toBe('reason.countdownRunning');
    expect(dispatch(s, { type: 'cancelCountdown' })).toBeNull();
    expect(s.scene.countdown).toBeNull();
    dispatch(s, { type: 'requestBattle' });
    dispatch(s, { type: 'startBattle' });
    expect(s.scene.countdown).toBeNull();
  });
});

describe('Räume', () => {
  it('erscheinen mit den bisherigen Freischaltungen, gesperrte sind angekündigt', () => {
    const s = createInitialState(1);
    expect(visibleRooms(s)).toEqual([]);
    s.unlocked.castle = true;
    expect(roomUnlocked(s, 'bau')).toBe(true);
    expect(roomUnlocked(s, 'bibliothek')).toBe(false);
    const rooms = visibleRooms(s);
    expect(rooms.find((r) => r.id === 'bibliothek')?.locked).toBe(true);
    // Der Markt kündigt sich erst kurz vor Epoche 2 an.
    expect(rooms.some((r) => r.id === 'markt')).toBe(false);
    s.unlocked.research = true;
    expect(roomUnlocked(s, 'bibliothek')).toBe(true);
  });

  it('jeder Raum hat Texte und eine Ressourcenliste', async () => {
    const { de } = await import('../i18n/de');
    const { en } = await import('../i18n/en');
    for (const id of ROOM_IDS) {
      expect(de).toHaveProperty(`room.${id}`);
      expect(en).toHaveProperty(`room.${id}`);
      expect(de).toHaveProperty(`room.locked.${id}`);
      expect(ROOM_RESOURCES[id]).toBeTruthy();
    }
  });
});

describe('Alte Spielstände', () => {
  it('laden ohne Szenen-Feld und landen im Dorf', () => {
    const s = afterFirstBattle();
    const raw = JSON.parse(serialize(s));
    delete raw.state.scene;
    const loaded = deserialize(JSON.stringify(raw)).state;
    expect(loaded.scene).toEqual({ result: null, countdown: null });
    expect(phase(loaded)).toBe('village');
  });
});

describe('Römische Level-Zahlen im Kampf-Overlay', () => {
  it('rechnet richtig', async () => {
    const { roman } = await import('../ui/arena');
    expect([1, 4, 9, 14, 40, 99, 2026].map(roman)).toEqual(['I', 'IV', 'IX', 'XIV', 'XL', 'XCIX', 'MMXXVI']);
  });
});

describe('Bau-Vorschau', () => {
  it('zeigt Gelände- und Nachbarschaftsbonus eines Gebäudes auf einem Feld', async () => {
    const { placementPreview, tileAt } = await import('./castle');
    const s = createInitialState(9);
    const forest = s.tiles.find((t) => t.terrain === 'forest' && !t.building)!;
    const p = placementPreview(s, forest, 'lumberHut');
    expect(p.terrain).toBeGreaterThan(1);
    // Eine Hütte daneben: +15 % Nachbarschaft für die nächste Hütte.
    const nb = [tileAt(s, forest.x + 1, forest.y), tileAt(s, forest.x - 1, forest.y)].find(
      (t) => t && !t.building,
    )!;
    nb.building = 'lumberHut';
    nb.level = 1;
    expect(placementPreview(s, forest, 'lumberHut').neighbor).toBeCloseTo(0.15);
    // Gebäude ohne passenden Bonus: score 0.
    const grass = s.tiles.find((t) => t.terrain === 'grass' && !t.building)!;
    expect(placementPreview(s, grass, 'barracks').score).toBe(0);
  });
});
