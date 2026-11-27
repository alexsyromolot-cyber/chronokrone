/**
 * Das Layout wächst mit dem Spiel: Am Anfang gibt es nur die Schlacht, jeder neue
 * Bereich erscheint mit einem Kommentar des Erzählers. Hier steht, wann.
 */
import type { MessageKey } from '../i18n/de';

import type { BuildingId } from './buildings';

export type UnlockId = 'castle' | 'recruit' | 'skills' | 'wall' | 'bestiary' | 'siege' | 'research';

export type UnlockCondition =
  | { kind: 'battlesFought'; count: number }
  | { kind: 'buildings'; count: number }
  | { kind: 'skillPointsEarned'; count: number }
  | { kind: 'kills'; count: number }
  | { kind: 'wins'; count: number }
  | { kind: 'hasBuilding'; building: BuildingId };

export interface UnlockDef {
  id: UnlockId;
  condition: UnlockCondition;
  /** Erzähler-Zeile, wenn der Bereich erscheint. */
  narrator: MessageKey;
}

/** Reihenfolge = Reihenfolge der Prüfung und des Erscheinens. */
export const UNLOCKS: UnlockDef[] = [
  { id: 'castle', condition: { kind: 'battlesFought', count: 1 }, narrator: 'narrator.unlockCastle' },
  { id: 'bestiary', condition: { kind: 'kills', count: 1 }, narrator: 'narrator.unlockBestiary' },
  { id: 'recruit', condition: { kind: 'buildings', count: 1 }, narrator: 'narrator.unlockRecruit' },
  { id: 'skills', condition: { kind: 'skillPointsEarned', count: 1 }, narrator: 'narrator.unlockSkills' },
  { id: 'wall', condition: { kind: 'battlesFought', count: 3 }, narrator: 'narrator.unlockWall' },
  { id: 'siege', condition: { kind: 'wins', count: 1 }, narrator: 'narrator.unlockSiege' },
  {
    id: 'research',
    condition: { kind: 'hasBuilding', building: 'monastery' },
    narrator: 'narrator.unlockResearch',
  },
];

/** Wie viele Erzähler-Zeilen im Log aufbewahrt werden. */
export const LOG_LIMIT = 40;
