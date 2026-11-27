import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { newGame, tick } from '../systems/game';
import { createInitialState } from '../systems/state';
import { migrate, SAVE_VERSION, type Migration } from './migrations';
import { BACKUP_KEYS, MAIN_KEY, SaveManager } from './save-manager';
import { deserialize, fromExportString, serialize, toExportString } from './serialize';
import { MemoryStorage } from './storage';

describe('Serialisierung', () => {
  it('überlebt Hin und Zurück inklusive riesiger Zahlen', () => {
    const s = newGame(9);
    for (let i = 0; i < 200; i++) tick(s, 0.05);
    s.resources.gold = new Decimal('1e5000');
    const { state } = deserialize(serialize(s));
    expect(state.resources.gold.eq(new Decimal('1e5000'))).toBe(true);
    expect(state.units).toEqual(s.units);
    expect(state.tiles).toEqual(s.tiles);
    expect(state.time).toBe(s.time);
  });

  it('speichert keine kurzlebigen Daten (laufende Schlacht, Effekte)', () => {
    const s = newGame(1);
    s.fx.push({ kind: 'milestone' });
    const raw = JSON.parse(serialize(s)) as { state: Record<string, unknown> };
    expect(raw.state.fx).toBeUndefined();
    expect(raw.state.battle).toBeUndefined();
  });

  it('ergänzt fehlende Felder alter Stände mit Standardwerten', () => {
    const s = createInitialState(1);
    const raw = JSON.parse(serialize(s)) as { state: Record<string, unknown> };
    delete raw.state.settings;
    delete raw.state.wallUpgrades;
    const { state } = deserialize(JSON.stringify(raw));
    expect(state.settings.autosaveSeconds).toBe(30);
    expect(state.wallUpgrades).toBe(0);
  });

  it('lehnt Müll und Stände aus der Zukunft ab', () => {
    expect(() => deserialize('kein json')).toThrow();
    expect(() => deserialize('{"version":1}')).toThrow();
    expect(() => deserialize(`{"version":${SAVE_VERSION + 1},"savedAt":0,"state":{}}`)).toThrow();
  });

  it('Export/Import als Text funktioniert, auch mit Umlauten', () => {
    const s = createInitialState(1);
    s.log.push({ key: 'narrator.boot', params: { name: 'Bärbel' }, time: 0 });
    const back = fromExportString(toExportString(s));
    expect(back.log[0]?.params?.name).toBe('Bärbel');
  });
});

describe('Migrationen', () => {
  it('wendet Schritte der Reihe nach an', () => {
    const steps: Record<number, Migration> = {
      0: (st) => ({ ...st, a: 1 }),
      1: (st) => ({ ...st, b: (st.a as number) + 1 }),
    };
    const out = migrate({ version: 0, savedAt: 0, state: {} }, steps, 2);
    expect(out.version).toBe(2);
    expect(out.state).toEqual({ a: 1, b: 2 });
  });

  it('v1 → v2: das alte 4×4-Raster landet in der Mitte der 8×8-Karte', () => {
    const tilesV1 = [];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        tilesV1.push({ x, y, terrain: 'grass', unlocked: x < 2, building: null as string | null, level: 0 });
      }
    }
    tilesV1[5]!.building = 'keep'; // (1,1)
    tilesV1[5]!.level = 3;
    const text = JSON.stringify({ version: 1, savedAt: 0, state: { tiles: tilesV1, time: 42 } });
    const { state, migratedFrom } = deserialize(text);
    expect(migratedFrom).toBe(1);
    expect(state.tiles).toHaveLength(64);
    const keep = state.tiles.find((t) => t.building === 'keep')!;
    expect([keep.x, keep.y, keep.level]).toEqual([3, 3, 3]);
    expect(state.tiles.find((t) => t.x === 0 && t.y === 0)!.unlocked).toBe(false);
    expect(state.time).toBe(42);
  });

  it('bricht ab, wenn ein Schritt fehlt', () => {
    expect(() => migrate({ version: 0, savedAt: 0, state: {} }, {}, 1)).toThrow();
  });
});

describe('SaveManager', () => {
  it('speichert, lädt und rotiert höchstens 5 Backups', () => {
    const storage = new MemoryStorage();
    let now = 0;
    const saves = new SaveManager(storage, () => now);
    const s = createInitialState(1);
    for (let i = 0; i < 8; i++) {
      s.time = i;
      saves.save(s);
      now += 5 * 60 * 1000;
    }
    expect(saves.load().state?.time).toBe(7);
    expect(BACKUP_KEYS.every((k) => storage.get(k) !== null)).toBe(true);
    expect(storage.data.size).toBeLessThanOrEqual(1 + 5 + 1);
  });

  it('springt bei kaputtem Hauptstand auf das neueste Backup', () => {
    const storage = new MemoryStorage();
    const saves = new SaveManager(storage, () => 0);
    const s = createInitialState(1);
    s.time = 123;
    saves.save(s);
    storage.set(MAIN_KEY, '{kaputt');
    const result = saves.load();
    expect(result.recovered).toBe(true);
    expect(result.state?.time).toBe(123);
  });

  it('legt vor einer Migration ein Backup des Originals an', () => {
    const storage = new MemoryStorage();
    const old = JSON.stringify({ version: 0, savedAt: 0, state: { time: 5 } });
    storage.set(MAIN_KEY, old);
    const result = new SaveManager(storage).load();
    expect(result.state?.time).toBe(5);
    expect(storage.get('chronokrone.premigration.v0')).toBe(old);
  });
});
