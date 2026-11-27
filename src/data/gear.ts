/**
 * Ausrüstung: drei Slots je Klasse (Waffe, Rüstung, Talisman). Eine Stufe gilt für alle
 * Einheiten der Klasse – so bleibt es übersichtlich, auch mit 30 Einheiten.
 *
 * Wirkung je Stufe:
 *   Waffe     Truppen Schaden ×1,2     · Sammler Produktion ×1,15 (bessere Werkzeuge)
 *             multiplikativ: Nur so hält die Kampfkraft mit den exponentiell wachsenden
 *             Gegnern Schritt – sonst läuft die Wirtschaft über, während die Truppen stagnieren.
 *   Rüstung   +3 Ausdauer (Truppen: mehr Mauer-LP · Sammler: wird für spätere Systeme genutzt)
 *   Talisman  +15 % Erfahrung
 * Kosten Stufe s (ab 0):  Grundkosten × 1,7^s, höchstens 30 Stufen
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
  weapon: {
    slot: 'weapon',
    baseCost: { steel: 4, iron: 6 },
    costGrowth: 1.7,
    requires: 'smithy',
    maxTier: 30,
  },
  armor: {
    slot: 'armor',
    baseCost: { steel: 6, planks: 6 },
    costGrowth: 1.7,
    requires: 'smithy',
    maxTier: 30,
  },
  talisman: {
    slot: 'talisman',
    baseCost: { scrolls: 2, ink: 3 },
    costGrowth: 1.7,
    requires: 'scriptorium',
    maxTier: 30,
  },
};

export const GEAR_EFFECTS = {
  weaponDamage: 1.2,
  weaponProduction: 1.15,
  armorEndurance: 3,
  talismanXp: 0.15,
} as const;
