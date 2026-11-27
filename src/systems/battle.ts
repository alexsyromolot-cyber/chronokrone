/**
 * Abwehrschlacht: Wellen, Bewegung, automatische Verteidiger, Klicks des Königs, Beute.
 * Reine Logik – wo etwas auf dem Bildschirm landet, entscheidet render/battle-scene.ts.
 */
import { chance, nextRandom, randomInt } from '../core/rng';
import {
  BATTLE as B,
  BESTIARY_BONUS_PER_TIER,
  BESTIARY_TIERS,
  ELITES,
  ENEMIES,
  type EnemyId,
} from '../data/enemies';
import { CLASSES, UNIT_FORMULAS } from '../data/units';
import type { MessageKey } from '../i18n/de';
import { epochDef } from '../data/epochs';
import { chronicleBonus } from './chronicle';
import { gain, keepLevel } from './resources';
import { globalBonus, skillBonus } from './skills';
import { addTimeline } from './achievements';
import { rollCompanion } from './trade';
import { cardBonus, rollCard } from './power';
import { hasRelic, rollRelic } from './relics';
import { RELIC_NUMBERS } from '../data/reactor';
import { bossPhase, winFinale } from './finale';
import { FINALE } from '../data/enemies';
import { addLog, type BattleState, type Enemy, type GameState } from './state';
import { addXp, attackInterval, attributesOf, critChance, troops, unitDamage } from './units';

/** Wie weit vor der Mauer Nahkämpfer zuschlagen können (Pixel). */
const MELEE_REACH = 26;
/** Anteil des Schadens, den Aliens im Flächenradius abbekommen. */
const SPLASH_FACTOR = 0.6;

/** Mauer-LP = (Basis + 10 × Verstärkungen + 2 × Ausdauer aller Truppen) × (1 + Mauer-Skills) */
export function wallMaxHp(state: GameState): number {
  const endurance = troops(state).reduce((sum, u) => sum + attributesOf(u, state).end, 0);
  const base =
    B.wallBaseHp + B.wallHpPerUpgrade * state.wallUpgrades + UNIT_FORMULAS.wallHpPerEnd * endurance;
  // Karten können die Mauer auch schwächen – nie unter 10 %.
  return Math.round(
    base * (1 + globalBonus(state, 'wallHpMult')) * Math.max(0.1, 1 + cardBonus(state, 'wallHp')),
  );
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

/** Klickschaden = Basis × Bergfried-Level × (1 + Klick-Skills). Ein größerer Bergfried, ein selbstbewussterer König. */
export function clickDamage(state: GameState): number {
  return (
    B.clickDamage *
    keepLevel(state) *
    (1 + globalBonus(state, 'clickMult')) *
    (1 + chronicleBonus(state, 'click')) *
    (1 + cardBonus(state, 'click'))
  );
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
    clicks: 0,
    spellCooldowns: {},
    militiaLeft: 0,
    militiaTimer: 0,
    pendingElite: null,
  };
  return null;
}

/** Bestiarium-Bonus: +5 % Schaden je erreichter Abschuss-Stufe (Elite: sofort voll). */
export function bestiaryBonus(state: GameState, type: EnemyId): number {
  const kills = state.bestiary[type] ?? 0;
  if (ENEMIES[type].elite) return kills > 0 ? BESTIARY_TIERS.length * BESTIARY_BONUS_PER_TIER : 0;
  return BESTIARY_TIERS.filter((tier) => kills >= tier).length * BESTIARY_BONUS_PER_TIER;
}

/** Wut-Faktor auf den Mauerschaden: verdoppelt sich alle enrageDoubling s nach enrageAfter s. */
export function enrageFactor(elapsed: number): number {
  return elapsed <= B.enrageAfter ? 1 : 2 ** ((elapsed - B.enrageAfter) / B.enrageDoubling);
}

/** Elitegegner dieser Belagerungsstufe, falls es einen gibt. */
export function eliteForSiege(siege: number): EnemyId | null {
  return ELITES.find((e) => e.siege === siege)?.enemy ?? null;
}

function pickEnemyType(state: GameState, wave: number): EnemyId {
  const allowed = Object.values(ENEMIES).filter((e) => e.fromWave <= wave && e.weight > 0);
  const total = allowed.reduce((s, e) => s + e.weight, 0);
  let roll = nextRandom(state.rng) * total;
  for (const e of allowed) {
    roll -= e.weight;
    if (roll < 0) return e.id;
  }
  return 'saugling';
}

function spawn(state: GameState, b: BattleState): void {
  // Der Elitegegner kommt als allerletzter Gegner der letzten Welle.
  const elite = b.pendingElite && b.toSpawn === 1 ? b.pendingElite : null;
  if (elite) {
    b.pendingElite = null;
    if (ENEMIES[elite].boss) addLog(state, 'narrator.bossArrives');
    else if (!state.bestiary[elite]) addLog(state, 'narrator.eliteArrives', { name: `@enemy.${elite}` });
  }
  const type = elite ?? pickEnemyType(state, b.wave);
  const hp = ENEMIES[type].hp * enemyHpMultiplier(b.wave, b.siege) * epochDef(state.epoch).enemyHp;
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

/** Begleiter des Mutterschiffs: stark wie Gegner der letzten Welle, aus verschiedenen Bahnen. */
function spawnEscort(state: GameState, b: BattleState): void {
  const hp =
    ENEMIES[FINALE.escort].hp * enemyHpMultiplier(B.wavesPerBattle, b.siege) * epochDef(state.epoch).enemyHp;
  const x = B.spawnX - randomInt(state.rng, 0, 40);
  b.enemies.push({
    id: b.nextEnemyId++,
    type: FINALE.escort,
    x,
    prevX: x,
    lane: randomInt(state.rng, 0, 2),
    hp,
    maxHp: hp,
  });
}

/** Schaden zufügen; bei Tod Beute, XP und Bestiarium. */
export function damageEnemy(
  state: GameState,
  enemy: Enemy,
  raw: number,
  byClick: boolean,
  melee = false,
): void {
  const b = state.battle;
  if (!b || enemy.hp <= 0) return;
  const def0 = ENEMIES[enemy.type];
  // Panzerung gilt nur gegen Nahkampf; das Bestiarium hilft gegen bekannte Typen.
  const armor = melee ? (def0.meleeArmor ?? 0) : 0;
  const amount = raw * (1 - armor) * (1 + bestiaryBonus(state, enemy.type));
  enemy.hp -= amount;
  state.fx.push({ kind: 'hit', x: enemy.x, lane: enemy.lane, amount, byClick });
  // Endgegner unter einer Phasen-Schwelle? Dann kommen Begleiter.
  const escorts = def0.boss ? bossPhase(state, enemy) : 0;
  for (let i = 0; i < escorts; i++) spawnEscort(state, b);
  if (enemy.hp > 0) return;

  const def = ENEMIES[enemy.type];
  const lootMult =
    (1 + globalBonus(state, 'lootGold')) *
    epochDef(state.epoch).gold *
    Math.max(0.1, 1 + cardBonus(state, 'gold'));
  const gold = Math.round(def.gold * goldMultiplier(b.wave, b.siege) * lootMult * 10) / 10;
  gain(state, 'gold', gold);
  b.goldEarned += gold;
  state.stats.goldEarned += gold;
  b.kills++;
  state.stats.kills++;
  b.enemies = b.enemies.filter((e) => e !== enemy);

  // Alien-Schrott mit Pity-Grenze: spätestens nach scrapPity Fehlversuchen fällt er garantiert.
  state.scrapPity++;
  const scrap =
    chance(state.rng, B.scrapChance + globalBonus(state, 'scrapChance')) || state.scrapPity >= B.scrapPity;
  if (scrap) {
    state.scrapPity = 0;
    const first = state.resources.scrap.eq(0) && !state.log.some((l) => l.key === 'narrator.firstScrap');
    gain(state, 'scrap', 1);
    state.stats.scrapCollected++;
    if (first) addLog(state, 'narrator.firstScrap');
  }
  state.fx.push({ kind: 'kill', x: enemy.x, lane: enemy.lane, enemy: enemy.type, gold, scrap });

  if (def.elite && !def.boss && !state.timeParts[enemy.type]) {
    state.timeParts[enemy.type] = true;
    addTimeline(state, `elite.${enemy.type}.${state.epoch}`, {
      name: `@enemy.${enemy.type}`,
      epoch: state.epoch,
    });
    state.fx.push({ kind: 'milestone' });
    addLog(state, 'narrator.partFound', {
      name: `@enemy.${enemy.type}`,
      n: Object.keys(state.timeParts).length,
      total: ELITES.length,
    });
  }

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
  state.battle!.clicks++;
  // Zwillingsschlag: der Klick springt auf den nächsten Gegner über.
  const twin = hasRelic(state, 'twinStrike')
    ? state.battle!.enemies.find((e) => e.id !== enemyId && e.hp > 0)
    : undefined;
  damageEnemy(state, enemy, clickDamage(state), true);
  if (twin) damageEnemy(state, twin, clickDamage(state) * RELIC_NUMBERS.twinStrikeShare, true);
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
  if (result === 'won' && b.final) winFinale(state);

  if (result === 'won') {
    state.stats.wins++;
    state.stats.highestSiege = Math.max(state.stats.highestSiege, b.siege + 1);
    if (b.clicks === 0) state.stats.noClickWins++;
    if (state.stats.wins === 1) addTimeline(state, 'firstWin');
    rollCompanion(state);
    rollCard(state);
    rollRelic(state);
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
    const bonus = B.waveClearGold * b.wave * B.goldGrowthPerSiege ** b.siege * epochDef(state.epoch).gold;
    gain(state, 'gold', bonus);
    b.goldEarned += bonus;
    state.stats.goldEarned += bonus;
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
    if (b.wave === B.wavesPerBattle) {
      b.pendingElite = b.final ? 'mutterschiff' : eliteForSiege(b.siege);
      if (b.pendingElite) b.toSpawn += 1;
    }
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
  const slow = 1 / (1 + globalBonus(state, 'enemySlow'));
  // Gesprungene Sanduhr: die Wut kommt später.
  const enrage = enrageFactor(
    b.elapsed - (hasRelic(state, 'crackedHourglass') ? RELIC_NUMBERS.hourglassDelay : 0),
  );
  // Spiegelschild: pro Sekunde ein Anteil eines durchschnittlichen Truppen-Treffers.
  const squad = hasRelic(state, 'mirrorShield') ? troops(state) : [];
  const mirrorDps = squad.length
    ? (squad.reduce((sum, u) => sum + unitDamage(state, u), 0) / squad.length) * RELIC_NUMBERS.mirrorShare
    : 0;
  const reflected: [Enemy, number][] = [];
  for (const e of b.enemies) {
    e.prevX = e.x;
    if (e.x > B.wallX) {
      e.x = Math.max(B.wallX, e.x - ENEMIES[e.type].speed * slow * dt);
    } else {
      const dmg = ENEMIES[e.type].wallDps * enrage * dt;
      b.wallHp -= dmg;
      b.wallDamageAcc += dmg;
      if (mirrorDps > 0) reflected.push([e, mirrorDps * dt]);
    }
  }
  // Spiegelschild erst nach der Schleife anwenden: besiegte Gegner verlassen die Liste.
  for (const [e, dmg] of reflected) damageEnemy(state, e, dmg, false);
  // Heilerinnen & Co.: die Mauer regeneriert einen Anteil ihrer LP pro Sekunde.
  b.wallHp = Math.min(b.wallMaxHp, b.wallHp + b.wallMaxHp * globalBonus(state, 'wallRegen') * dt);
  if (b.wallDamageAcc >= 2) {
    b.wallDamageAcc = 0;
    state.fx.push({ kind: 'wallHit' });
  }

  // Verteidiger schlagen automatisch den vordersten Alien in ihrer Reichweite.
  const team = troops(state);
  for (let slot = 0; slot < team.length; slot++) {
    const unit = team[slot]!;
    const cd = (b.cooldowns[unit.id] ?? 0) - dt;
    if (cd > 0) {
      b.cooldowns[unit.id] = cd;
      continue;
    }
    const def = CLASSES[unit.classId];
    const range = def.range + skillBonus(state, unit.classId, 'rangeAdd');
    let target: Enemy | undefined;
    for (const e of b.enemies) {
      if (e.x <= B.wallX + range && (!target || e.x < target.x)) target = e;
    }
    if (target) {
      // Kritischer Treffer: doppelter Schaden.
      const crit = chance(state.rng, critChance(state, unit));
      const dmg = unitDamage(state, unit) * (crit ? 2 : 1);
      if (crit) state.fx.push({ kind: 'crit', x: target.x, lane: target.lane });
      if (def.range > MELEE_REACH) {
        state.fx.push({ kind: 'shot', toX: target.x, lane: target.lane, color: def.color, slot });
      }
      // Flächenschaden: Nachbarn des Ziels bekommen einen Teil ab (vor dem Haupttreffer
      // ausgewählt, damit ein sterbendes Ziel die Liste nicht verändert).
      const splashed =
        def.splash > 0 ? b.enemies.filter((e) => e !== target && Math.abs(e.x - target.x) <= def.splash) : [];
      const melee = range <= MELEE_REACH;
      damageEnemy(state, target, dmg, false, melee);
      const splashShare = SPLASH_FACTOR * (1 + skillBonus(state, unit.classId, 'splashMult'));
      for (const e of splashed) damageEnemy(state, e, dmg * splashShare, false, melee);
      b.cooldowns[unit.id] = attackInterval(state, unit);
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
