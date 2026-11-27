/**
 * Hofbefehle: programmierbare Automatisierung als klickbarer Wenn-dann-Baukasten.
 * Ein Schreiber-Mönch arbeitet die Regeln einmal pro Sekunde von oben nach unten ab;
 * die Reihenfolge ist die Priorität. Jede ausgelöste Regel führt eine normale Aktion aus –
 * es gibt keinen „Schummelweg“ an den Spielregeln vorbei.
 *
 * Stufen (wachsen mit der Epoche):
 *   1  Ende Epoche 1   2 Regeln, eine Bedingung
 *   2  Epoche 2        6 Regeln, bis zu 2 Bedingungen mit UND/ODER, Reihenfolge änderbar
 *   3  Epoche 3        12 Regeln, 3 Bedingungen (Variablen/Kauf-Strategien folgen mit M7)
 *   4  ab Epoche 4     unbegrenzt
 */
import type { BuildingId } from './buildings';
import type { ResourceId } from './resources';
import type { SpellId } from './spells';
import type { ClassId } from './units';

export type OrderCondition =
  | { kind: 'resourceAtLeast'; resource: ResourceId; value: number }
  | { kind: 'resourceFull'; resource: ResourceId; percent: number }
  | { kind: 'noBattle' }
  | { kind: 'inBattle' }
  | { kind: 'wallBelow'; percent: number }
  | { kind: 'enemiesAtLeast'; count: number }
  | { kind: 'skillPoints' };

export type OrderAction =
  | { kind: 'startBattle' }
  | { kind: 'castSpell'; spell: SpellId }
  | { kind: 'upgradeCheapest'; building: BuildingId }
  | { kind: 'recruit'; classId: ClassId }
  | { kind: 'upgradeWall' }
  | { kind: 'notify' };

export interface OrderRule {
  id: number;
  enabled: boolean;
  join: 'and' | 'or';
  conditions: OrderCondition[];
  action: OrderAction;
}

export interface OrderStage {
  maxRules: number;
  maxConditions: number;
  /** Darf die Reihenfolge (Priorität) geändert werden? */
  reorder: boolean;
}

export const ORDER_STAGES: Record<number, OrderStage> = {
  1: { maxRules: 2, maxConditions: 1, reorder: false },
  2: { maxRules: 6, maxConditions: 2, reorder: true },
  3: { maxRules: 12, maxConditions: 3, reorder: true },
  4: { maxRules: Infinity, maxConditions: 4, reorder: true },
};

export const CONDITION_KINDS: OrderCondition['kind'][] = [
  'noBattle',
  'inBattle',
  'resourceAtLeast',
  'resourceFull',
  'wallBelow',
  'enemiesAtLeast',
  'skillPoints',
];

export const ACTION_KINDS: OrderAction['kind'][] = [
  'startBattle',
  'castSpell',
  'upgradeCheapest',
  'recruit',
  'upgradeWall',
  'notify',
];

/** Standardwerte, wenn man im Baukasten eine Art auswählt. */
export function defaultCondition(kind: OrderCondition['kind']): OrderCondition {
  switch (kind) {
    case 'resourceAtLeast':
      return { kind, resource: 'gold', value: 100 };
    case 'resourceFull':
      return { kind, resource: 'wood', percent: 90 };
    case 'wallBelow':
      return { kind, percent: 50 };
    case 'enemiesAtLeast':
      return { kind, count: 3 };
    default:
      return { kind } as OrderCondition;
  }
}

export function defaultAction(kind: OrderAction['kind']): OrderAction {
  switch (kind) {
    case 'castSpell':
      return { kind, spell: 'stoneRain' };
    case 'upgradeCheapest':
      return { kind, building: 'lumberHut' };
    case 'recruit':
      return { kind, classId: 'woodcutter' };
    default:
      return { kind } as OrderAction;
  }
}

/** Wie oft der Mönch die Liste abarbeitet (Sekunden Spielzeit). */
export const ORDER_INTERVAL = 1;
export const ORDER_LOG_LIMIT = 30;
