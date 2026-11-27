/**
 * Speichern, Laden, Backups.
 *
 * - Hauptstand unter MAIN_KEY, bei jedem (Auto-)Save überschrieben.
 * - Rollierende Backups: höchstens alle BACKUP_EVERY_MS ein neues, die letzten 5 bleiben.
 * - Vor jeder Migration wird der alte Text unverändert als eigenes Backup abgelegt.
 * - Ist der Hauptstand kaputt, wird das neueste lesbare Backup geladen.
 */
import type { GameState } from '../systems/state';
import { SAVE_VERSION } from './migrations';
import { deserialize, serialize } from './serialize';
import type { StorageBackend } from './storage';

export const MAIN_KEY = 'chronokrone.save';
export const BACKUP_KEYS = [0, 1, 2, 3, 4].map((i) => `chronokrone.backup.${i}`);
const BACKUP_TIME_KEY = 'chronokrone.backup.lastAt';
const BACKUP_EVERY_MS = 5 * 60 * 1000;

export interface LoadResult {
  state: GameState | null;
  /** true, wenn der Hauptstand kaputt war und ein Backup einspringen musste. */
  recovered: boolean;
}

export class SaveManager {
  constructor(
    private readonly storage: StorageBackend,
    private readonly now: () => number = Date.now,
  ) {}

  save(state: GameState): void {
    const text = serialize(state, this.now());
    this.storage.set(MAIN_KEY, text);

    const last = this.storage.get(BACKUP_TIME_KEY);
    if (last === null || this.now() - Number(last) >= BACKUP_EVERY_MS) {
      this.rotateBackups(text);
      this.storage.set(BACKUP_TIME_KEY, String(this.now()));
    }
  }

  /** Neuestes Backup vorne einschieben, ältestes fällt hinten raus. */
  private rotateBackups(text: string): void {
    for (let i = BACKUP_KEYS.length - 1; i > 0; i--) {
      const older = this.storage.get(BACKUP_KEYS[i - 1]!);
      if (older !== null) this.storage.set(BACKUP_KEYS[i]!, older);
    }
    this.storage.set(BACKUP_KEYS[0]!, text);
  }

  load(): LoadResult {
    const main = this.storage.get(MAIN_KEY);
    if (main === null) return { state: null, recovered: false };
    const state = this.tryLoad(main);
    if (state) return { state, recovered: false };

    for (const key of BACKUP_KEYS) {
      const text = this.storage.get(key);
      const backup = text === null ? null : this.tryLoad(text);
      if (backup) return { state: backup, recovered: true };
    }
    return { state: null, recovered: true };
  }

  private tryLoad(text: string): GameState | null {
    try {
      const peek = JSON.parse(text) as { version?: unknown };
      if (typeof peek.version === 'number' && peek.version < SAVE_VERSION) {
        // Original VOR der Migration aufheben – falls die Migration einen Fehler hat.
        this.storage.set(`chronokrone.premigration.v${peek.version}`, text);
      }
      return deserialize(text).state;
    } catch {
      // Kaputter oder fremder Text: kein Absturz, der Aufrufer versucht das nächste Backup.
      return null;
    }
  }

  /** Löscht nur den Hauptstand; Backups bleiben als Rettungsanker. */
  reset(): void {
    this.storage.remove(MAIN_KEY);
  }
}
