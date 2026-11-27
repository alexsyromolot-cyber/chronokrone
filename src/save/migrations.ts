/**
 * Speicherversionen und Migrationen.
 *
 * Regel: Ändert sich die Bedeutung oder Form eines gespeicherten Feldes, wird
 * SAVE_VERSION erhöht und hier eine Funktion „von Version n auf n+1“ ergänzt –
 * mit Test in save.test.ts. Neue Felder mit Standardwert brauchen KEINE
 * Migration, das erledigt das Zusammenführen in serialize.ts.
 *
 * Migrationen enthalten ihre Daten selbst (z. B. die Karte von damals), statt aktuelle
 * Spieldaten zu importieren: Sonst würde eine spätere Kartenänderung alte Migrationen
 * still verändern.
 *
 * Version 1: Vertical Slice (Meilenstein 2), Karte 4×4.
 * Version 2: Meilenstein 3, Karte 8×8 – das alte 4×4 liegt jetzt in der Mitte (Versatz 2/2).
 */
import type { SaveEnvelope } from './serialize';

export const SAVE_VERSION = 2;

export type Migration = (state: Record<string, unknown>) => Record<string, unknown>;

interface TileV1 {
  x: number;
  y: number;
  terrain: string;
  unlocked: boolean;
  building: string | null;
  level: number;
}

/** Karte von Version 2 – bewusst als Kopie, siehe Kommentar oben. */
const MAP_V2 = [
  'ffffgrrr',
  'ffgggrrr',
  'fffggrrr',
  'fgfggrgr',
  'ggggsggg',
  'fgfgsrrg',
  'ggggssgf',
  'gfggsgff',
];
const TERRAIN_V2: Record<string, string> = { g: 'grass', f: 'forest', r: 'rock', s: 'stream' };

/** MIGRATIONS[n] hebt einen Spielstand von Version n auf n + 1. */
export const MIGRATIONS: Record<number, Migration> = {
  // Version 0 gab es nur als Platzhalter im Grundgerüst (kein echter Spielstand).
  0: (state) => state,

  1: (state) => {
    const old = Array.isArray(state.tiles) ? (state.tiles as TileV1[]) : [];
    const tiles: TileV1[] = [];
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const prev = old.find((t) => t.x === x - 2 && t.y === y - 2);
        tiles.push(
          prev
            ? { ...prev, x, y }
            : {
                x,
                y,
                terrain: TERRAIN_V2[MAP_V2[y]?.[x] ?? 'g'] ?? 'grass',
                unlocked: false,
                building: null,
                level: 0,
              },
        );
      }
    }
    return { ...state, tiles };
  },
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
