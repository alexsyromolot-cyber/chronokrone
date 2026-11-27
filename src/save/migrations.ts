/**
 * Speicherversionen und Migrationen.
 *
 * Regel: Ändert sich die Bedeutung oder Form eines gespeicherten Feldes, wird
 * SAVE_VERSION erhöht und hier eine Funktion „von Version n auf n+1“ ergänzt –
 * mit Test in migrations.test.ts. Neue Felder mit Standardwert brauchen KEINE
 * Migration, das erledigt das Zusammenführen in serialize.ts.
 *
 * Version 1: Vertical Slice (Meilenstein 2).
 */
import type { SaveEnvelope } from './serialize';

export const SAVE_VERSION = 1;

export type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

/** MIGRATIONS[n] hebt einen Spielstand von Version n auf n + 1. */
export const MIGRATIONS: Record<number, Migration> = {
  // Version 0 gab es nur als Platzhalter im Grundgerüst (kein echter Spielstand).
  0: (state) => state,
};

export function migrate(
  envelope: SaveEnvelope,
  migrations: Record<number, Migration> = MIGRATIONS,
  target = SAVE_VERSION,
): SaveEnvelope {
  let { version } = envelope;
  let state = envelope.state as Record<string, unknown>;
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new Error(`Keine Migration von Version ${version}`);
    state = step(structuredClone(state));
    version++;
  }
  return { ...envelope, version, state };
}
