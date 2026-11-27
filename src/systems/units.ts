/**
 * Einheiten: Attribute, Kampfwerte, Erfahrung, Anwerben.
 * Formeln und Zahlen stehen in data/units.ts.
 */
import { BARRACKS, BUILDINGS, type BuildingId } from '../data/buildings';
import { CLASSES, TROOP_BUILDINGS, UNIT_FORMULAS as F, type Attributes, type ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { canAfford, exceedsCap, pay, scaledCost, type Cost } from './resources';
import { achievementMultiplier } from './achievements';
import { chronicleBonus } from './chronicle';
import { companionBonus, companionSetMultiplier } from './trade';
import { cardBonus } from './power';
import { relicSetBonus } from './relics';
import { isRested, RECAP } from './recap';
import { armorEndurance, talismanXp, weaponMultiplier } from './gear';
import { skillBonus } from './skills';
import { addLog, type GameState, type Unit } from './state';

/** Attribute aus Klasse und Level; mit übergebenem Spielzustand zusätzlich die Rüstung (+Ausdauer). */
export function attributesOf(unit: Unit, state?: GameState): Attributes {
  const def = CLASSES[unit.classId];
  const lv = unit.level - 1;
  return {
    str: def.baseAttributes.str + def.attrPerLevel.str * lv,
    dex: def.baseAttributes.dex + def.attrPerLevel.dex * lv,
    mag: def.baseAttributes.mag + def.attrPerLevel.mag * lv,
    end:
      def.baseAttributes.end + def.attrPerLevel.end * lv + (state ? armorEndurance(state, unit.classId) : 0),
  };
}

export function isTroop(unit: Unit): boolean {
  return CLASSES[unit.classId].role === 'troop';
}

export function troops(state: GameState): Unit[] {
  return state.units.filter(isTroop);
}

function levelOf(state: GameState, building: BuildingId): number {
  return state.tiles.find((t) => t.building === building)?.level ?? 0;
}

export function barracksLevel(state: GameState): number {
  return levelOf(state, 'barracks');
}

/** Level des Ausbildungsgebäudes einer Truppenklasse (Kaserne, Schießstand, Magierturm). */
export function trainingLevel(state: GameState, classId: ClassId): number {
  const building = CLASSES[classId].requires ?? 'barracks';
  return levelOf(state, building);
}

/** +Anteil Schaden aus Skills und Ausbildungsgebäude (die Waffe wirkt multiplikativ, siehe unitDamage). */
export function damageBonus(state: GameState, unit: Unit): number {
  return (
    skillBonus(state, unit.classId, 'damageMult') +
    BARRACKS.damageBonusPerLevel * trainingLevel(state, unit.classId) +
    companionBonus(state, unit.classId, 'damage') +
    cardBonus(state, 'damage') +
    relicSetBonus(state)
  );
}

/** Chance auf kritischen Treffer (doppelter Schaden). */
export function critChance(state: GameState, unit: Unit): number {
  return skillBonus(state, unit.classId, 'critChance') + cardBonus(state, 'crit');
}

/** Schaden = baseDamage × (1 + 0,10 × Hauptattribut) × (1 + Skill- und Gebäude-Bonus) × Waffe × Chronik */
export function unitDamage(state: GameState, unit: Unit): number {
  const def = CLASSES[unit.classId];
  const main = attributesOf(unit)[def.mainAttr];
  return (
    def.baseDamage *
    (1 + F.damagePerAttr * main) *
    (1 + damageBonus(state, unit)) *
    weaponMultiplier(state, unit.classId, 'troop') *
    (1 + chronicleBonus(state, 'damage')) *
    achievementMultiplier(state) *
    companionSetMultiplier(state)
  );
}

/** Sekunden zwischen zwei Schlägen = attackInterval / (1 + 0,03 × Geschick) / (1 + Tempo-Skills) */
export function attackInterval(state: GameState, unit: Unit): number {
  const dex = attributesOf(unit).dex;
  return (
    CLASSES[unit.classId].attackInterval /
    (1 + F.speedPerDex * dex) /
    (1 + skillBonus(state, unit.classId, 'attackSpeed'))
  );
}

/** XP-Multiplikator = 1 + Skills + Talisman */
export function xpMultiplier(state: GameState, unit: Unit): number {
  return (
    (1 +
      skillBonus(state, unit.classId, 'xpMult') +
      talismanXp(state, unit.classId) +
      chronicleBonus(state, 'xp')) *
    (isRested(state) ? RECAP.xpMultiplier : 1)
  );
}

/** Sammler-Arbeitsbonus = 0,5 + 0,05 × Hauptattribut der Klasse */
export function workPower(unit: Unit): number {
  return F.workBase + F.workPerAttr * attributesOf(unit)[CLASSES[unit.classId].mainAttr];
}

/** XP für den Schritt von `level` auf `level + 1`. */
export function xpForNext(level: number): number {
  return Math.ceil(F.xpBase * F.xpGrowth ** (level - 1));
}

/** XP gutschreiben; jedes Level-Up gibt der Klasse einen Skillpunkt. */
export function addXp(state: GameState, unit: Unit, xp: number): void {
  unit.xp += xp * xpMultiplier(state, unit);
  let need = xpForNext(unit.level);
  while (unit.xp >= need) {
    unit.xp -= need;
    unit.level++;
    state.stats.maxUnitLevel = Math.max(state.stats.maxUnitLevel, unit.level);
    state.skillPoints[unit.classId] += 1;
    state.stats.skillPointsEarned += 1;
    state.fx.push({ kind: 'levelUp', unitId: unit.id });
    if (state.stats.skillPointsEarned === 1) addLog(state, 'narrator.firstSkillPoint');
    need = xpForNext(unit.level);
  }
}

/** Truppenplätze = 3 + 2 × (Summe der Level von Kaserne, Schießstand und Magierturm) */
export function troopCapacity(state: GameState): number {
  const levels = TROOP_BUILDINGS.reduce((sum, b) => sum + levelOf(state, b), 0);
  return BARRACKS.troopSlotsBase + BARRACKS.troopSlotsPerLevel * levels;
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
  state.stats.recruits++;
  if (state.units.length === 4) addLog(state, 'narrator.firstRecruit');
  return null;
}
