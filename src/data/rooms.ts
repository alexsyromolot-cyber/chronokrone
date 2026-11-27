/**
 * Die Räume des Dorfs (UI-Umbau). Ein Reiter ist ein Raum; es ist immer nur ein Raum groß zu sehen.
 * Wann ein Raum erscheint, entscheidet systems/rooms.ts; welche Ressourcen die Leiste oben
 * in diesem Raum zeigt, steht hier (die Kostenlisten werden aus den Inhaltsdaten abgeleitet).
 *
 * DLC-fähig: Eine spätere Epoche kann Räume umbenennen oder neu einkleiden, ohne die Logik
 * anzufassen (Texte über `room.<id>`, Icons in render/icons.ts).
 */
import { GEAR } from './gear';
import { CLASSES } from './units';
import { SPELLS } from './spells';
import { ORACLE_COST, TIME_MACHINE_COST } from './timemachine';
import { BASE_PRICES } from './market';
import type { ResourceAmounts, ResourceId } from './resources';

export type RoomId =
  | 'bau'
  | 'kaserne'
  | 'uebung'
  | 'bibliothek'
  | 'werkstatt'
  | 'thronsaal'
  | 'markt'
  | 'schatzkammer'
  | 'chronik'
  | 'archiv';

/** Reihenfolge in der Reiterleiste. */
export const ROOM_IDS: RoomId[] = [
  'bau',
  'kaserne',
  'uebung',
  'bibliothek',
  'werkstatt',
  'thronsaal',
  'markt',
  'schatzkammer',
  'chronik',
  'archiv',
];

const keysOf = (...lists: ResourceAmounts[]): ResourceId[] => [
  ...new Set(lists.flatMap((l) => Object.keys(l) as ResourceId[])),
];

/**
 * Ressourcen, die die Leiste oben je Raum zeigt. 'all' = alles, was schon eine Rolle spielt
 * (Bauplatz: dort entsteht ja alles). Gold ist überall dabei, weil fast alles Gold kostet.
 */
export const ROOM_RESOURCES: Record<RoomId, ResourceId[] | 'all'> = {
  bau: 'all',
  kaserne: [
    'gold',
    ...keysOf(
      ...Object.values(CLASSES).map((c) => c.baseCost),
      ...Object.values(GEAR).map((g) => g.baseCost),
    ),
  ],
  uebung: ['gold'],
  bibliothek: ['gold', 'knowledge'],
  werkstatt: ['gold', 'scrap', ...keysOf(ORACLE_COST, TIME_MACHINE_COST)],
  thronsaal: ['gold', ...keysOf(...Object.values(SPELLS).map((s) => s.upgradeCost))],
  markt: ['gold', ...(Object.keys(BASE_PRICES) as ResourceId[])],
  schatzkammer: ['gold', 'scrap'],
  chronik: ['gold'],
  archiv: ['gold'],
};

/** In der Kampfphase zählen nur Gold und Alien-Schrott (dazu die Beute der laufenden Schlacht). */
export const BATTLE_RESOURCES: ResourceId[] = ['gold', 'scrap'];
