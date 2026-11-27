/**
 * Zauber wirken, abklingen lassen und aufwerten. Formeln in data/spells.ts.
 */
import { ELITE_SPELL_FACTOR, MILITIA_DURATION, SPELLS, type SpellId } from '../data/spells';
import { ENEMIES } from '../data/enemies';
import type { MessageKey } from '../i18n/de';
import { damageEnemy } from './battle';
import { attackInterval, troops, unitDamage } from './units';
import { hasResearch } from './research';
import { canAfford, exceedsCap, pay, scaledCost, type Cost } from './resources';
import { globalBonus } from './skills';
import type { Enemy, GameState } from './state';

/** Stufe eines Zaubers; erforschte Zauber beginnen auf Stufe 1. */
export function spellLevel(state: GameState, id: SpellId): number {
  if (!hasResearch(state, SPELLS[id].research)) return 0;
  return Math.max(1, state.spells[id] ?? 1);
}

/** Stärke = Grundwert × (1 + perLevel × (Stufe − 1)) × (1 + Zauberstärke) */
export function spellPower(state: GameState, id: SpellId): number {
  const def = SPELLS[id];
  const level = spellLevel(state, id);
  return def.power * (1 + def.perLevel * (level - 1)) * (1 + globalBonus(state, 'spellPower'));
}

/** Kampfkraft der Truppen: Summe aus Schaden ÷ Abklingzeit. Grundlage der Angriffszauber. */
export function troopDps(state: GameState): number {
  return troops(state).reduce((sum, u) => sum + unitDamage(state, u) / attackInterval(state, u), 0);
}

/** Schaden eines Angriffszaubers an einem Alien (Elitegegner nehmen weniger). */
export function spellDamage(state: GameState, id: SpellId, enemy?: Enemy): number {
  const elite = enemy && ENEMIES[enemy.type].elite ? ELITE_SPELL_FACTOR : 1;
  return spellPower(state, id) * troopDps(state) * elite;
}

export function castBlocker(state: GameState, id: SpellId): MessageKey | null {
  if (spellLevel(state, id) === 0) return 'reason.requiresResearch';
  const b = state.battle;
  if (!b) return 'reason.noBattle';
  if ((b.spellCooldowns[id] ?? 0) > 0) return 'reason.cooldown';
  return null;
}

export function castSpell(state: GameState, id: SpellId): MessageKey | null {
  const blocker = castBlocker(state, id);
  if (blocker) return blocker;
  const b = state.battle!;
  const power = spellPower(state, id);
  b.spellCooldowns[id] = SPELLS[id].cooldown;
  state.stats.spellsCast++;
  state.fx.push({ kind: 'spell', spell: id });
  if (id === 'stoneRain') {
    // Kopie der Liste, weil getroffene Aliens beim Sterben entfernt werden.
    for (const e of [...b.enemies]) damageEnemy(state, e, spellDamage(state, id, e), false);
  } else if (id === 'blessing') {
    b.wallHp = Math.min(b.wallMaxHp, b.wallHp + b.wallMaxHp * power);
  } else {
    b.militiaLeft = MILITIA_DURATION;
    b.militiaTimer = 0;
  }
  return null;
}

/** Einmal pro Schlacht-Tick: Abklingzeiten und Bauernmiliz. */
export function tickSpells(state: GameState, dt: number): void {
  const b = state.battle;
  if (!b) return;
  for (const id of Object.keys(b.spellCooldowns) as SpellId[]) {
    b.spellCooldowns[id] = Math.max(0, (b.spellCooldowns[id] ?? 0) - dt);
  }
  if (b.militiaLeft <= 0) return;
  b.militiaLeft -= dt;
  b.militiaTimer -= dt;
  if (b.militiaTimer > 0) return;
  b.militiaTimer = 1;
  const front = b.enemies.reduce<Enemy | undefined>((a, e) => (!a || e.x < a.x ? e : a), undefined);
  if (front) damageEnemy(state, front, spellDamage(state, 'militia', front), false);
}

/** Aufwerten: Kosten = Grundkosten × 1,8^(Stufe − 1) */
export function spellUpgradeCost(state: GameState, id: SpellId): Cost {
  const def = SPELLS[id];
  return scaledCost(def.upgradeCost, def.upgradeGrowth, spellLevel(state, id) - 1);
}

export function spellUpgradeBlocker(state: GameState, id: SpellId): MessageKey | null {
  const level = spellLevel(state, id);
  if (level === 0) return 'reason.requiresResearch';
  if (level >= SPELLS[id].maxLevel) return 'reason.maxRank';
  const cost = spellUpgradeCost(state, id);
  if (exceedsCap(state, cost)) return 'reason.exceedsCap';
  if (!canAfford(state, cost)) return 'reason.tooExpensive';
  return null;
}

export function upgradeSpell(state: GameState, id: SpellId): MessageKey | null {
  const blocker = spellUpgradeBlocker(state, id);
  if (blocker) return blocker;
  pay(state, spellUpgradeCost(state, id));
  state.spells[id] = spellLevel(state, id) + 1;
  return null;
}
