/**
 * Ausrüstung: drei Slots je Klasse (Waffe, Rüstung, Talisman). Eine Stufe gilt für alle
 * Einheiten der Klasse – so bleibt es übersichtlich, auch mit 30 Einheiten.
 *
 * Wirkung je Stufe:
 *   Waffe     Truppen +25 % Schaden    · Sammler +20 % Produktion (bessere Werkzeuge)
 *   Rüstung   +3 Ausdauer (Truppen: mehr Mauer-LP · Sammler: wird für spätere Systeme genutzt)
 *   Talisman  +15 % Erfahrung
 * Kosten Stufe s (ab 0):  Grundkosten × 2^s
 */
import type { BuildingId } from './buildings';
import type { ResourceAmounts } from './resources';

export type GearSlot = 'weapon' | 'armor' | 'talisman';
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'talisman'];

export interface GearDef {
  slot: GearSlot;
  baseCost: ResourceAmounts;
  costGrowth: number;
  /** Gebäude, das die Herstellung erlaubt. */
  requires: BuildingId;
  maxTier: number;
}

export const GEAR: Record<GearSlot, GearDef> = {
  weapon: { slot: 'weapon', baseCost: { steel: 4, iron: 6 }, costGrowth: 2, requires: 'smithy', maxTier: 5 },
  armor: { slot: 'armor', baseCost: { steel: 6, planks: 6 }, costGrowth: 2, requires: 'smithy', maxTier: 5 },
  talisman: {
    slot: 'talisman',
    baseCost: { scrolls: 2, ink: 3 },
    costGrowth: 2,
    requires: 'scriptorium',
    maxTier: 5,
  },
};

export const GEAR_EFFECTS = {
  weaponDamage: 0.25,
  weaponProduction: 0.2,
  armorEndurance: 3,
  talismanXp: 0.15,
} as const;
