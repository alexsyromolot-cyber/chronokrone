/**
 * Abstrakte Ablage für Spielstände. Im Browser localStorage, in Tests ein Map-Objekt,
 * später in der Desktop-App echte Dateien – der Rest des Spiels merkt davon nichts.
 */
export interface StorageBackend {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** Brücke aus electron/preload.cjs – nur in der Desktop-App vorhanden. */
interface DesktopBridge {
  get(key: string): string | null;
  set(key: string, value: string): boolean;
  remove(key: string): boolean;
}

/** Desktop-App: Spielstände als Dateien im Benutzerordner (siehe electron/main.cjs). */
export class DesktopFileStorage implements StorageBackend {
  constructor(private readonly bridge: DesktopBridge) {}
  get(key: string): string | null {
    return this.bridge.get(key);
  }
  set(key: string, value: string): void {
    if (!this.bridge.set(key, value)) throw new Error('Speichern fehlgeschlagen');
  }
  remove(key: string): void {
    this.bridge.remove(key);
  }
}

/** Passendes Backend: Dateien in der Desktop-App, sonst localStorage. */
export function defaultStorage(): StorageBackend {
  const bridge = (globalThis as { chronokroneDesktop?: DesktopBridge }).chronokroneDesktop;
  return bridge ? new DesktopFileStorage(bridge) : new LocalStorageBackend();
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
