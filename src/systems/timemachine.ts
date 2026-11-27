/**
 * Rechenorakel und Zeitmaschine bauen. Bedingungen in data/timemachine.ts.
 */
import Decimal from 'break_eternity.js';
import { ELITES } from '../data/enemies';
import { MIN_SKILL_RANKS, ORACLE_COST, TIME_MACHINE_COST } from '../data/timemachine';
import type { ResourceAmounts, ResourceId } from '../data/resources';
import type { MessageKey } from '../i18n/de';
import { hasResearch } from './research';
import { canAfford, exceedsCap, pay, type Cost } from './resources';
import { totalSkillRanks } from './skills';
import { addTimeline } from './achievements';
import { addLog, type GameState } from './state';

function toCost(a: ResourceAmounts): Cost {
  const cost: Cost = {};
  for (const [id, n] of Object.entries(a) as [ResourceId, number][]) cost[id] = new Decimal(n);
  return cost;
}

export const oracleCost = (): Cost => toCost(ORACLE_COST);
export const timeMachineCost = (): Cost => toCost(TIME_MACHINE_COST);

export function partsFound(state: GameState): number {
  return ELITES.filter((e) => state.timeParts[e.enemy]).length;
}

/** Checkliste für die Anzeige: jede Bedingung mit erfüllt/nicht erfüllt. */
export function timeMachineChecklist(state: GameState) {
  return {
    parts: { have: partsFound(state), need: ELITES.length },
    oracle: state.oracle,
    chronology: hasResearch(state, 'chronology'),
    skills: { have: totalSkillRanks(state), need: MIN_SKILL_RANKS },
  };
}

function costBlocker(state: GameState, cost: Cost): MessageKey | null {
  if (exceedsCap(state, cost)) return 'reason.exceedsCap';
  if (!canAfford(state, cost)) return 'reason.tooExpensive';
  return null;
}

export function oracleBlocker(state: GameState): MessageKey | null {
  if (state.oracle) return 'reason.done';
  if (!hasResearch(state, 'oracle')) return 'reason.requiresResearch';
  return costBlocker(state, oracleCost());
}

export function buildOracle(state: GameState): MessageKey | null {
  const blocker = oracleBlocker(state);
  if (blocker) return blocker;
  pay(state, oracleCost());
  state.oracle = true;
  addLog(state, 'narrator.oracleBuilt');
  return null;
}

export function timeMachineBlocker(state: GameState): MessageKey | null {
  const c = timeMachineChecklist(state);
  if (state.timeMachineAt !== null) return 'reason.done';
  if (c.parts.have < c.parts.need) return 'reason.missingParts';
  if (!c.oracle) return 'reason.needsOracle';
  if (!c.chronology) return 'reason.requiresResearch';
  if (c.skills.have < c.skills.need) return 'reason.needsSkills';
  return costBlocker(state, timeMachineCost());
}

export function buildTimeMachine(state: GameState): MessageKey | null {
  const blocker = timeMachineBlocker(state);
  if (blocker) return blocker;
  pay(state, timeMachineCost());
  state.timeMachineAt = state.time;
  state.stats.timeMachines++;
  addTimeline(state, `timeMachine.${state.epoch}`, { epoch: state.epoch });
  state.fx.push({ kind: 'milestone' });
  addLog(state, 'narrator.timeMachineBuilt');
  return null;
}
