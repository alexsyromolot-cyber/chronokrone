/**
 * Ausrüstung herstellen und ihre Wirkung abfragen. Formeln in data/gear.ts.
 */
import { GEAR, GEAR_EFFECTS, type GearSlot } from '../data/gear';
import type { ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { canAfford, exceedsCap, pay, scaledCost, type Cost } from './resources';
import type { GameState } from './state';

export function gearTier(state: GameState, classId: ClassId, slot: GearSlot): number {
  return state.gear[classId]?.[slot] ?? 0;
}

/** Kosten der nächsten Stufe = Grundkosten × 2^(aktuelle Stufe) */
export function gearCost(state: GameState, classId: ClassId, slot: GearSlot): Cost {
  const def = GEAR[slot];
  return scaledCost(def.baseCost, def.costGrowth, gearTier(state, classId, slot));
}

export function gearBlocker(state: GameState, classId: ClassId, slot: GearSlot): MessageKey | null {
  const def = GEAR[slot];
  if (gearTier(state, classId, slot) >= def.maxTier) return 'reason.maxRank';
  if (!state.tiles.some((t) => t.building === def.requires)) return 'reason.requiresBuilding';
  if (!state.units.some((u) => u.classId === classId)) return 'reason.noUnits';
  const cost = gearCost(state, classId, slot);
  if (exceedsCap(state, cost)) return 'reason.exceedsCap';
  if (!canAfford(state, cost)) return 'reason.tooExpensive';
  return null;
}

export function craftGear(state: GameState, classId: ClassId, slot: GearSlot): MessageKey | null {
  const blocker = gearBlocker(state, classId, slot);
  if (blocker) return blocker;
  pay(state, gearCost(state, classId, slot));
  const current = state.gear[classId] ?? {};
  current[slot] = (current[slot] ?? 0) + 1;
  state.gear[classId] = current;
  return null;
}

/** Multiplikator auf Schaden (Truppen: 1,2^Stufe) bzw. Produktion (Sammler: 1,15^Stufe) aus der Waffe. */
export function weaponMultiplier(state: GameState, classId: ClassId, role: 'troop' | 'gatherer'): number {
  const per = role === 'troop' ? GEAR_EFFECTS.weaponDamage : GEAR_EFFECTS.weaponProduction;
  return per ** gearTier(state, classId, 'weapon');
}

export function armorEndurance(state: GameState, classId: ClassId): number {
  return GEAR_EFFECTS.armorEndurance * gearTier(state, classId, 'armor');
}

export function talismanXp(state: GameState, classId: ClassId): number {
  return GEAR_EFFECTS.talismanXp * gearTier(state, classId, 'talisman');
}
