/**
 * Spielstand ⇄ Text.
 *
 * Format: { version, savedAt, state }. Decimal-Zahlen werden als {"$d": "1e500"} abgelegt,
 * weil JSON nur normale Zahlen kennt (und die enden bei 1e308).
 *
 * Beim Laden wird der Stand auf einen frischen Standard-Zustand gelegt. So bekommen
 * alte Spielstände automatisch neue Felder mit Standardwerten, ohne extra Migration.
 */
import Decimal from 'break_eternity.js';
import { createInitialState, type GameState } from '../systems/state';
import { migrate, SAVE_VERSION } from './migrations';

export interface SaveEnvelope {
  version: number;
  savedAt: number;
  state: unknown;
}

/** Felder, die nie gespeichert werden (kurzlebig oder bei jedem Laden neu aufgebaut). */
const TRANSIENT_KEYS = new Set(['fx', 'battle']);

export function serialize(state: GameState, now = Date.now()): string {
  const envelope: SaveEnvelope = { version: SAVE_VERSION, savedAt: now, state };
  return JSON.stringify(envelope, function (this: Record<string, unknown>, key, value: unknown) {
    if (this === (state as unknown) && TRANSIENT_KEYS.has(key)) return undefined;
    // Achtung: JSON.stringify ruft Decimal.toJSON() auf, BEVOR der Replacer den Wert sieht.
    // Deshalb den Originalwert am Elternobjekt prüfen, nicht `value` (das ist schon ein String).
    const original = this[key];
    if (original instanceof Decimal) return { $d: original.toString() };
    return value;
  });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Gespeicherte Werte auf die Standardwerte legen.
 * - Objekte: rekursiv zusammenführen, unbekannte Schlüssel aus dem Save bleiben erhalten
 * - Decimal-Standardwerte: aus {"$d": …} wiederherstellen
 * - alles andere (Zahlen, Arrays, Strings): Save-Wert gewinnt, wenn der Typ passt
 */
function mergeInto(defaults: unknown, saved: unknown): unknown {
  if (saved === undefined || saved === null) return defaults;
  if (defaults instanceof Decimal) {
    if (isPlainObject(saved) && typeof saved.$d === 'string') return new Decimal(saved.$d);
    // Robust gegenüber Ständen, in denen die Zahl als schlichter Text oder Zahl liegt.
    if (typeof saved === 'string' || typeof saved === 'number') {
      const d = new Decimal(saved);
      return d.isNan() ? defaults : d;
    }
    return defaults;
  }
  if (isPlainObject(defaults)) {
    if (!isPlainObject(saved)) return defaults;
    const out: Record<string, unknown> = { ...saved };
    for (const [k, v] of Object.entries(defaults)) out[k] = mergeInto(v, saved[k]);
    return out;
  }
  if (Array.isArray(defaults)) return Array.isArray(saved) ? saved : defaults;
  if (defaults === null) return saved;
  return typeof saved === typeof defaults ? saved : defaults;
}

export class SaveFormatError extends Error {}

export function deserialize(text: string): { state: GameState; migratedFrom: number | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SaveFormatError('kein JSON');
  }
  if (!isPlainObject(parsed) || typeof parsed.version !== 'number' || !isPlainObject(parsed.state)) {
    throw new SaveFormatError('kein Spielstand');
  }
  if (parsed.version > SAVE_VERSION) throw new SaveFormatError('Spielstand aus neuerer Version');

  const envelope = parsed as unknown as SaveEnvelope;
  const migratedFrom = envelope.version < SAVE_VERSION ? envelope.version : null;
  const migrated = migrate(envelope);
  const state = mergeInto(createInitialState(), migrated.state) as GameState;
  state.fx = [];
  state.battle = null;
  return { state, migratedFrom };
}

/** Export als kompakter Text (Base64), damit man ihn gefahrlos kopieren kann. */
export function toExportString(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function fromExportString(text: string): GameState {
  let json: string;
  try {
    const binary = atob(text.trim());
    json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    throw new SaveFormatError('kein Base64');
  }
  return deserialize(json).state;
}
