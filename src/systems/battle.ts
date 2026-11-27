/**
 * Abwehrschlacht: Wellen, Bewegung, automatische Verteidiger, Klicks des Königs, Beute.
 * Reine Logik – wo etwas auf dem Bildschirm landet, entscheidet render/battle-scene.ts.
 */
import { chance, nextRandom, randomInt } from '../core/rng';
import { BATTLE as B, ENEMIES, type EnemyId } from '../data/enemies';
import { UNIT_FORMULAS } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { gain, keepLevel } from './resources';
import { skillBonus } from './skills';
import { addLog, type BattleState, type Enemy, type GameState } from './state';
import { addXp, attackInterval, attributesOf, troops, unitDamage } from './units';

/** Wie weit vor der Mauer Nahkämpfer zuschlagen können (Pixel). */
const MELEE_REACH = 26;

/** Mauer-LP = (Basis + 10 × Verstärkungen + 2 × Ausdauer aller Truppen) × (1 + Mauerwächter-Bonus) */
export function wallMaxHp(state: GameState): number {
  const endurance = troops(state).reduce((sum, u) => sum + attributesOf(u).end, 0);
  const base =
    B.wallBaseHp + B.wallHpPerUpgrade * state.wallUpgrades + UNIT_FORMULAS.wallHpPerEnd * endurance;
  return Math.round(base * (1 + skillBonus(state, 'knight', 'wallHpMult')));
}

export function waveSize(wave: number): number {
  return B.countBase + B.countPerWave * (wave - 1);
}

export function enemyHpMultiplier(wave: number, siege: number): number {
  return B.hpGrowthPerWave ** (wave - 1) * B.hpGrowthPerSiege ** siege;
}

export function goldMultiplier(wave: number, siege: number): number {
  return (1 + B.goldPerWaveStep * (wave - 1)) * B.goldGrowthPerSiege ** siege;
}

/** Klickschaden des Königs = Basis × Bergfried-Level. Ein größerer Bergfried, ein selbstbewussterer König. */
export function clickDamage(state: GameState): number {
  return B.clickDamage * keepLevel(state);
}

export function startBattleBlocker(state: GameState, siege: number): MessageKey | null {
  if (state.battle) return 'reason.battleRunning';
  if (siege < 0 || siege > state.siegeLevel) return 'reason.siegeLocked';
  if (troops(state).length === 0) return 'reason.noTroops';
  return null;
}

export function startBattle(state: GameState, siege = state.siegeLevel): MessageKey | null {
  const blocker = startBattleBlocker(state, siege);
  if (blocker) return blocker;
  const hp = wallMaxHp(state);
  state.battle = {
    siege,
    wave: 0,
    clearedWaves: 0,
    wallDamageAcc: 0,
    waveTimer: B.firstWaveDelay,
    toSpawn: 0,
    spawnTimer: 0,
    enemies: [],
    nextEnemyId: 1,
    wallHp: hp,
    wallMaxHp: hp,
    elapsed: 0,
    kills: 0,
    goldEarned: 0,
    cooldowns: {},
  };
  return null;
}

function pickEnemyType(state: GameState, wave: number): EnemyId {
  const allowed = Object.values(ENEMIES).filter((e) => e.fromWave <= wave);
  const total = allowed.reduce((s, e) => s + e.weight, 0);
  let roll = nextRandom(state.rng) * total;
  for (const e of allowed) {
    roll -= e.weight;
    if (roll < 0) return e.id;
  }
  return 'saugling';
}

function spawn(state: GameState, b: BattleState): void {
  const type = pickEnemyType(state, b.wave);
  const hp = ENEMIES[type].hp * enemyHpMultiplier(b.wave, b.siege);
  b.enemies.push({
    id: b.nextEnemyId++,
    type,
    x: B.spawnX,
    prevX: B.spawnX,
    lane: randomInt(state.rng, 0, 2),
    hp,
    maxHp: hp,
  });
}

/** Schaden zufügen; bei Tod Beute, XP und Bestiarium. */
export function damageEnemy(state: GameState, enemy: Enemy, amount: number, byClick: boolean): void {
  const b = state.battle;
  if (!b || enemy.hp <= 0) return;
  enemy.hp -= amount;
  state.fx.push({ kind: 'hit', x: enemy.x, lane: enemy.lane, amount, byClick });
  if (enemy.hp > 0) return;

  const def = ENEMIES[enemy.type];
  const gold = Math.round(def.gold * goldMultiplier(b.wave, b.siege) * 10) / 10;
  gain(state, 'gold', gold);
  b.goldEarned += gold;
  b.kills++;
  state.stats.kills++;
  b.enemies = b.enemies.filter((e) => e !== enemy);

  // Alien-Schrott mit Pity-Grenze: spätestens nach scrapPity Fehlversuchen fällt er garantiert.
  state.scrapPity++;
  const scrap = chance(state.rng, B.scrapChance) || state.scrapPity >= B.scrapPity;
  if (scrap) {
    state.scrapPity = 0;
    const first = state.resources.scrap.eq(0) && !state.log.some((l) => l.key === 'narrator.firstScrap');
    gain(state, 'scrap', 1);
    if (first) addLog(state, 'narrator.firstScrap');
  }
  state.fx.push({ kind: 'kill', x: enemy.x, lane: enemy.lane, enemy: enemy.type, gold, scrap });

  const seen = state.bestiary[enemy.type] ?? 0;
  state.bestiary[enemy.type] = seen + 1;
  if (seen === 0) addLog(state, `narrator.enemy.${enemy.type}` as MessageKey);

  // XP wird gleichmäßig auf alle Truppen verteilt – auch Klick-Abschüsse zählen.
  const team = troops(state);
  for (const unit of team) addXp(state, unit, def.xp / team.length);
}

export function clickEnemy(state: GameState, enemyId: number): boolean {
  const enemy = state.battle?.enemies.find((e) => e.id === enemyId);
  if (!enemy) return false;
  state.stats.clicks++;
  damageEnemy(state, enemy, clickDamage(state), true);
  return true;
}

export function endBattle(state: GameState, result: 'won' | 'lost'): void {
  const b = state.battle;
  if (!b) return;
  state.battle = null;
  state.stats.battles++;
  state.stats.highestWave = Math.max(state.stats.highestWave, b.wave);
  state.lastBattle = {
    result,
    siege: b.siege,
    wave: b.wave,
    kills: b.kills,
    goldEarned: b.goldEarned,
    seconds: b.elapsed,
  };
  state.fx.push({ kind: 'battleEnd', result });

  if (result === 'won') {
    state.stats.wins++;
    if (b.siege === state.siegeLevel) {
      state.siegeLevel++;
      addLog(state, 'narrator.siegeUp', { siege: state.siegeLevel + 1 });
    }
  } else if (state.stats.battles === 1) {
    addLog(state, 'narrator.firstDefeat');
  } else {
    addLog(state, 'narrator.defeat', { wave: b.wave });
  }
}

export function tickBattle(state: GameState, dt: number): void {
  const b = state.battle;
  if (!b) return;
  b.elapsed += dt;

  // Wellen: nach Zeit – oder früher, wenn die vorige Welle schon besiegt ist.
  const waveDone = b.toSpawn === 0 && b.enemies.length === 0;
  if (waveDone && b.wave > b.clearedWaves) {
    b.clearedWaves = b.wave;
    const bonus = B.waveClearGold * b.wave * B.goldGrowthPerSiege ** b.siege;
    gain(state, 'gold', bonus);
    b.goldEarned += bonus;
    if (b.wave >= B.wavesPerBattle) {
      endBattle(state, 'won');
      return;
    }
    b.waveTimer = Math.min(b.waveTimer, 1.5);
  }
  b.waveTimer -= dt;
  if (b.waveTimer <= 0 && b.wave < B.wavesPerBattle) {
    b.wave++;
    b.toSpawn += waveSize(b.wave);
    b.waveTimer = B.waveInterval;
  }

  if (b.toSpawn > 0) {
    b.spawnTimer -= dt;
    if (b.spawnTimer <= 0) {
      spawn(state, b);
      b.toSpawn--;
      b.spawnTimer = B.spawnInterval;
    }
  }

  // Bewegung. Lautes Fluchen der Bauern verlangsamt die Aliens.
  const slow = 1 / (1 + skillBonus(state, 'peasant', 'enemySlow'));
  for (const e of b.enemies) {
    e.prevX = e.x;
    if (e.x > B.wallX) {
      e.x = Math.max(B.wallX, e.x - ENEMIES[e.type].speed * slow * dt);
    } else {
      const dmg = ENEMIES[e.type].wallDps * dt;
      b.wallHp -= dmg;
      b.wallDamageAcc += dmg;
    }
  }
  if (b.wallDamageAcc >= 2) {
    b.wallDamageAcc = 0;
    state.fx.push({ kind: 'wallHit' });
  }

  // Verteidiger schlagen automatisch den vordersten Alien in Reichweite.
  for (const unit of troops(state)) {
    const cd = (b.cooldowns[unit.id] ?? 0) - dt;
    if (cd > 0) {
      b.cooldowns[unit.id] = cd;
      continue;
    }
    let target: Enemy | undefined;
    for (const e of b.enemies) {
      if (e.x <= B.wallX + MELEE_REACH && (!target || e.x < target.x)) target = e;
    }
    if (target) {
      damageEnemy(state, target, unitDamage(state, unit), false);
      b.cooldowns[unit.id] = attackInterval(unit);
    } else {
      b.cooldowns[unit.id] = 0;
    }
    if (!state.battle) return;
  }

  if (b.wallHp <= 0) {
    b.wallHp = 0;
    endBattle(state, 'lost');
  }
}
