/**
 * Klassen-Skilltrees: Ränge lesen, Boni summieren, Punkte ausgeben.
 */
import { SKILLS, SKILLS_BY_ID, type SkillEffect } from '../data/skills';
import type { ClassId } from '../data/units';
import type { MessageKey } from '../i18n/de';
import type { GameState } from './state';

export function skillRank(state: GameState, id: string): number {
  return state.skills[id] ?? 0;
}

/**
 * Summe aller „perRank × Rang“ einer Effektart für eine Klasse.
 * Beispiel: Mistgabel-Training Rang 2 → damageMult = 2 × 0,5 = 1,0 (also +100 %).
 */
export function skillBonus(state: GameState, classId: ClassId, kind: SkillEffect['kind']): number {
  let sum = 0;
  for (const skill of SKILLS) {
    if (skill.classId === classId && skill.effect.kind === kind) {
      sum += skill.effect.perRank * skillRank(state, skill.id);
    }
  }
  return sum;
}

/** Warum ein Knoten (noch) nicht kaufbar ist – oder null, wenn er es ist. */
export function skillBlocker(state: GameState, id: string): MessageKey | null {
  const skill = SKILLS_BY_ID[id];
  if (!skill) return 'reason.unknown';
  if (skillRank(state, id) >= skill.maxRank) return 'reason.maxRank';
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
  return null;
}
