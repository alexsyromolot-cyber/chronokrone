/**
 * Die Zeitmaschine – das Ziel von Epoche 1.
 *
 * Voraussetzungen:
 *   - alle vier Teile von den Elitegegnern (siehe ELITES in enemies.ts)
 *   - das Rechenorakel (Forschung „Rechenorakel“, dann einmalig bauen)
 *   - Forschung „Chronologie“
 *   - genug Skill-Fortschritt: Summe aller gelernten Skill-Stufen ≥ minSkillRanks
 *     („Erst wenn der Skilltree weit genug ist, können deine Leute die Teile zusammenbauen.“)
 * Danach wird sie einmalig gebaut. Der eigentliche Sprung folgt in Meilenstein 4.
 */
import type { ResourceAmounts } from './resources';

export const ORACLE_COST: ResourceAmounts = { chips: 20, steel: 15, scrolls: 10 };
export const TIME_MACHINE_COST: ResourceAmounts = { gold: 2000, planks: 150, steel: 40, chips: 15 };
export const MIN_SKILL_RANKS = 40;
