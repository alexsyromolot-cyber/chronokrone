/**
 * Abstrakte Ablage für Spielstände. Im Browser localStorage, in Tests ein Map-Objekt,
 * später in der Desktop-App echte Dateien – der Rest des Spiels merkt davon nichts.
 */
export interface StorageBackend {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class MemoryStorage implements StorageBackend {
  readonly data = new Map<string, string>();
  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.data.set(key, value);
  }
  remove(key: string): void {
    this.data.delete(key);
  }
}

/**
 * localStorage kann im privaten Modus oder bei vollem Speicher Fehler werfen.
 * Dann fallen wir auf den Arbeitsspeicher zurück, statt das Spiel abstürzen zu lassen.
 */
export class LocalStorageBackend implements StorageBackend {
  private readonly fallback = new MemoryStorage();

  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return this.fallback.get(key);
    }
  }
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      this.fallback.set(key, value);
    }
  }
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      this.fallback.remove(key);
    }
  }
}
