/**
 * Forschung: prüfen, kaufen, Auswirkungen abfragen.
 */
import Decimal from 'break_eternity.js';
import { epochDef } from '../data/epochs';
import type { Bounds } from '../data/map';
import { RESEARCH_BY_ID, type ResearchId } from '../data/research';
import type { MessageKey } from '../i18n/de';
import { pay } from './resources';
import { addLog, type GameState } from './state';

export function hasResearch(state: GameState, id: ResearchId): boolean {
  return !!state.research[id];
}

export function researchBlocker(state: GameState, id: ResearchId): MessageKey | null {
  const def = RESEARCH_BY_ID[id];
  if (hasResearch(state, id)) return 'reason.done';
  if (!def.requires.every((r) => hasResearch(state, r))) return 'reason.requiresResearch';
  if (state.resources.knowledge.lt(def.cost)) return 'reason.tooExpensive';
  return null;
}

export function doResearch(state: GameState, id: ResearchId): MessageKey | null {
  const blocker = researchBlocker(state, id);
  if (blocker) return blocker;
  pay(state, { knowledge: new Decimal(RESEARCH_BY_ID[id].cost) });
  state.research[id] = true;
  // '@…' = Textschlüssel, der erst beim Anzeigen übersetzt wird (Sprachwechsel bleibt möglich).
  addLog(state, 'narrator.researchDone', { name: `@research.${id}` });
  return null;
}

/** Erreichbarer Kartenbereich: wächst mit jeder Landvermessung. */
export function surveyBounds(state: GameState): Bounds {
  const level = (hasResearch(state, 'survey1') ? 1 : 0) + (hasResearch(state, 'survey2') ? 1 : 0);
  const bounds = epochDef(state.epoch).map.surveyBounds;
  return bounds[level] ?? bounds[0]!;
}
