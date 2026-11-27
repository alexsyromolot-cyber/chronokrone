/**
 * Einheiten: Attribute, Kampfwerte, Erfahrung, Anwerben.
 * Formeln und Zahlen stehen in data/units.ts.
 */
import { BARRACKS, BUILDINGS } from '../data/buildings';
import { CLASSES, UNIT_FORMULAS as F, type Attributes, type ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { canAfford, exceedsCap, pay, scaledCost, type Cost } from './resources';
import { skillBonus } from './skills';
import { addLog, type GameState, type Unit } from './state';

export function attributesOf(unit: Unit): Attributes {
  const def = CLASSES[unit.classId];
  const lv = unit.level - 1;
  return {
    str: def.baseAttributes.str + def.attrPerLevel.str * lv,
    dex: def.baseAttributes.dex + def.attrPerLevel.dex * lv,
    mag: def.baseAttributes.mag + def.attrPerLevel.mag * lv,
    end: def.baseAttributes.end + def.attrPerLevel.end * lv,
  };
}

export function isTroop(unit: Unit): boolean {
  return CLASSES[unit.classId].role === 'troop';
}

export function troops(state: GameState): Unit[] {
  return state.units.filter(isTroop);
}

export function barracksLevel(state: GameState): number {
  return state.tiles.find((t) => t.building === 'barracks')?.level ?? 0;
}

/** Schaden = baseDamage × (1 + 0,10 × Stärke) × (1 + Skill-Bonus + Kasernen-Bonus) */
export function unitDamage(state: GameState, unit: Unit): number {
  const def = CLASSES[unit.classId];
  const str = attributesOf(unit).str;
  const bonus =
    skillBonus(state, unit.classId, 'damageMult') + BARRACKS.damageBonusPerLevel * barracksLevel(state);
  return def.baseDamage * (1 + F.damagePerStr * str) * (1 + bonus);
}

/** Sekunden zwischen zwei Schlägen = attackInterval / (1 + 0,03 × Geschick) */
export function attackInterval(unit: Unit): number {
  return CLASSES[unit.classId].attackInterval / (1 + F.speedPerDex * attributesOf(unit).dex);
}

/** Sammler-Arbeitsbonus = 0,5 + 0,05 × Stärke */
export function workPower(unit: Unit): number {
  return F.workBase + F.workPerStr * attributesOf(unit).str;
}

/** XP für den Schritt von `level` auf `level + 1`. */
export function xpForNext(level: number): number {
  return Math.ceil(F.xpBase * F.xpGrowth ** (level - 1));
}

/** XP gutschreiben; jedes Level-Up gibt der Klasse einen Skillpunkt. */
export function addXp(state: GameState, unit: Unit, xp: number): void {
  unit.xp += xp;
  let need = xpForNext(unit.level);
  while (unit.xp >= need) {
    unit.xp -= need;
    unit.level++;
    state.skillPoints[unit.classId] += 1;
    state.stats.skillPointsEarned += 1;
    state.fx.push({ kind: 'levelUp', unitId: unit.id });
    if (state.stats.skillPointsEarned === 1) addLog(state, 'narrator.firstSkillPoint');
    need = xpForNext(unit.level);
  }
}

export function troopCapacity(state: GameState): number {
  return BARRACKS.troopSlotsBase + BARRACKS.troopSlotsPerLevel * barracksLevel(state);
}

/** Sammler brauchen Arbeitsplätze in ihrem Gebäude. */
export function gathererCapacity(state: GameState, classId: ClassId): number {
  const building = CLASSES[classId].requires;
  if (!building) return 0;
  const slots = BUILDINGS[building].workerSlots ?? 0;
  return state.tiles.filter((t) => t.building === building).length * slots;
}

export function countClass(state: GameState, classId: ClassId): number {
  return state.units.filter((u) => u.classId === classId).length;
}

/**
 * Anwerbekosten = Grundkosten × costGrowth^(Anzahl dieser Klasse)
 * Die drei Start-Bauern zählen mit – sie waren schließlich auch nicht umsonst.
 */
export function recruitCost(state: GameState, classId: ClassId): Cost {
  const def = CLASSES[classId];
  return scaledCost(def.baseCost, def.costGrowth, countClass(state, classId));
}

export function recruitBlocker(state: GameState, classId: ClassId): MessageKey | null {
  const def = CLASSES[classId];
  if (def.requires && !state.tiles.some((t) => t.building === def.requires)) return 'reason.requiresBuilding';
  if (def.role === 'troop' && troops(state).length >= troopCapacity(state)) return 'reason.noTroopSlots';
  if (def.role === 'gatherer' && countClass(state, classId) >= gathererCapacity(state, classId)) {
    return 'reason.noWorkerSlots';
  }
  const cost = recruitCost(state, classId);
  if (exceedsCap(state, cost)) return 'reason.exceedsCap';
  if (!canAfford(state, cost)) return 'reason.tooExpensive';
  return null;
}

export function recruit(state: GameState, classId: ClassId): MessageKey | null {
  const blocker = recruitBlocker(state, classId);
  if (blocker) return blocker;
  pay(state, recruitCost(state, classId));
  state.units.push({ id: state.nextUnitId++, classId, level: 1, xp: 0 });
  if (state.units.length === 4) addLog(state, 'narrator.firstRecruit');
  return null;
}
