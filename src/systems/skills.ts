/**
 * Klassen-Skilltrees: Ränge lesen, Boni summieren, Punkte ausgeben, Spezialisierung festlegen.
 */
import type { BuildingId } from '../data/buildings';
import { SKILLS, SKILLS_BY_ID, SPEC_LEVEL, type SkillKind } from '../data/skills';
import type { ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { hasResearch } from './research';
import { addLog, type GameState } from './state';

export function skillRank(state: GameState, id: string): number {
  return state.skills[id] ?? 0;
}

/**
 * Summe aller „perRank × Rang“ einer Effektart für eine Klasse.
 * Beispiel: Mistgabel-Training Rang 2 → damageMult = 2 × 0,5 = 1,0 (also +100 %).
 */
export function skillBonus(state: GameState, classId: ClassId, kind: SkillKind): number {
  let sum = 0;
  for (const skill of SKILLS) {
    if (skill.classId === classId && skill.effect.kind === kind) {
      sum += skill.effect.perRank * skillRank(state, skill.id);
    }
  }
  return sum;
}

/**
 * Globale Effekte (Mauer, Beute, Zauber, Verlangsamung …) zählen über alle Klassen.
 * Bei recipeMult nur die Knoten, die dieses Rezept-Gebäude betreffen.
 */
export function globalBonus(state: GameState, kind: SkillKind, building?: BuildingId): number {
  let sum = 0;
  for (const skill of SKILLS) {
    if (skill.effect.kind !== kind) continue;
    if (building && skill.effect.building !== building) continue;
    sum += skill.effect.perRank * skillRank(state, skill.id);
  }
  return sum;
}

/** Hat irgendeine Einheit dieser Klasse das Spezialisierungs-Level erreicht? */
export function canSpecialize(state: GameState, classId: ClassId): boolean {
  return state.units.some((u) => u.classId === classId && u.level >= SPEC_LEVEL);
}

/** Warum ein Knoten (noch) nicht kaufbar ist – oder null, wenn er es ist. */
export function skillBlocker(state: GameState, id: string): MessageKey | null {
  const skill = SKILLS_BY_ID[id];
  if (!skill) return 'reason.unknown';
  if (skillRank(state, id) >= skill.maxRank) return 'reason.maxRank';
  if (skill.spec) {
    const chosen = state.specs[skill.classId];
    if (chosen && chosen !== skill.spec) return 'reason.otherSpec';
    if (!hasResearch(state, 'specialization')) return 'reason.requiresResearch';
    if (!chosen && !canSpecialize(state, skill.classId)) return 'reason.specLevel';
  }
  if (skill.requires && skillRank(state, skill.requires) < 1) return 'reason.requiresSkill';
  if (state.skillPoints[skill.classId] < 1) return 'reason.noSkillPoints';
  return null;
}

export function buySkill(state: GameState, id: string): MessageKey | null {
  const blocker = skillBlocker(state, id);
  if (blocker) return blocker;
  const skill = SKILLS_BY_ID[id]!;
  state.skillPoints[skill.classId] -= 1;
  state.skills[id] = skillRank(state, id) + 1;
  state.stats.skillRanksBought++;
  if (skill.spec && !state.specs[skill.classId]) {
    state.specs[skill.classId] = skill.spec;
    addLog(state, 'narrator.specChosen', {
      cls: `@class.${skill.classId}`,
      spec: `@spec.${skill.classId}.${skill.spec}`,
    });
  }
  return null;
}

/** Summe aller gekauften Skill-Stufen (Voraussetzung für die Zeitmaschine). */
export function totalSkillRanks(state: GameState): number {
  return Object.values(state.skills).reduce((sum, r) => sum + r, 0);
}
