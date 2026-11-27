import Decimal from 'break_eternity.js';
import { describe, expect, it } from 'vitest';
import { RESOURCE_IDS } from '../data/resources';
import { SKILLS } from '../data/skills';
import { dispatch } from './actions';
import { bestiaryBonus, wallMaxHp } from './battle';
import { flows, tileAt, tileProduction } from './castle';
import { newGame, tick } from './game';
import { spellPower, troopDps } from './spells';
import type { GameState } from './state';
import { attackInterval, unitDamage } from './units';

function rich(): GameState {
  const s = newGame(21);
  while (s.battle) tick(s, 0.05);
  Object.assign(s.unlocked, { research: true, recruit: true, skills: true });
  for (const id of RESOURCE_IDS) s.resources[id] = new Decimal(1000);
  for (const t of s.tiles) t.unlocked = true;
  return s;
}

describe('Skilltrees', () => {
  it('jede Klasse hat 12 Knoten, Spezialisierungen auf beiden Wegen', () => {
    // Epoche-1-Klassen haben volle Bäume mit Spezialisierung; spätere Klassen starten kleiner.
    const classes = new Set(
      SKILLS.map((s) => s.classId).filter(
        (c) =>
          ![
            'stoker',
            'steamKnight',
            'lineman',
            'teslaLancer',
            'prospector',
            'rayPaladin',
            'starPilgrim',
            'voidTemplar',
          ].includes(c),
      ),
    );
    for (const c of classes) {
      const nodes = SKILLS.filter((s) => s.classId === c);
      expect(nodes).toHaveLength(12);
      expect(nodes.filter((s) => s.spec === 'a')).toHaveLength(3);
      expect(nodes.filter((s) => s.spec === 'b')).toHaveLength(3);
    }
  });

  it('Spezialisierung braucht Forschung und Level 10, danach ist der andere Weg zu', () => {
    const s = rich();
    s.skillPoints.peasant = 20;
    dispatch(s, { type: 'buySkill', skillId: 'pitchforkTraining' });
    dispatch(s, { type: 'buySkill', skillId: 'harvestHands' });
    expect(dispatch(s, { type: 'buySkill', skillId: 'pitchforkMaster' })).toBe('reason.requiresResearch');
    s.research.specialization = true;
    expect(dispatch(s, { type: 'buySkill', skillId: 'pitchforkMaster' })).toBe('reason.specLevel');
    s.units[0]!.level = 10;
    expect(dispatch(s, { type: 'buySkill', skillId: 'pitchforkMaster' })).toBeNull();
    expect(s.specs.peasant).toBe('a');
    dispatch(s, { type: 'buySkill', skillId: 'thickSkulls' });
    dispatch(s, { type: 'buySkill', skillId: 'kingsFavor' });
    expect(dispatch(s, { type: 'buySkill', skillId: 'villageWatch' })).toBe('reason.otherSpec');
  });

  it('globale Skills wirken klassenübergreifend (Mauer-LP)', () => {
    const s = rich();
    const before = wallMaxHp(s);
    s.skills.thickSkulls = 3; // Bauern-Skill, +15 % Mauer-LP für alle
    expect(wallMaxHp(s)).toBe(Math.round((before / 1) * 1.15));
  });

  it('Angriffstempo-Skills verkürzen die Abklingzeit', () => {
    const s = rich();
    const u = s.units[0]!;
    const before = attackInterval(s, u);
    s.skills.mobTactics = 2;
    expect(attackInterval(s, u)).toBeCloseTo(before / 1.2);
  });
});

describe('Ausrüstung', () => {
  it('braucht die Schmiede, wird je Stufe 1,7× teurer und multipliziert den Schaden', () => {
    const s = rich();
    expect(dispatch(s, { type: 'craftGear', classId: 'peasant', slot: 'weapon' })).toBe(
      'reason.requiresBuilding',
    );
    s.research.mining = true;
    s.research.smelting = true;
    s.research.smithing = true;
    dispatch(s, { type: 'build', x: 4, y: 2, building: 'smithy' });
    const u = s.units[0]!;
    const before = unitDamage(s, u);
    const steelBefore = s.resources.steel.toNumber();
    expect(dispatch(s, { type: 'craftGear', classId: 'peasant', slot: 'weapon' })).toBeNull();
    expect(steelBefore - s.resources.steel.toNumber()).toBe(4);
    dispatch(s, { type: 'craftGear', classId: 'peasant', slot: 'weapon' });
    expect(steelBefore - s.resources.steel.toNumber()).toBe(4 + 7); // 4 × 1,7 = 6,8 → 7
    expect(unitDamage(s, u)).toBeCloseTo(before * 1.2 * 1.2, 5);
  });

  it('Werkzeuge erhöhen die Produktion der Sammler', () => {
    const s = rich();
    s.research.mining = true;
    s.research.smelting = true;
    s.research.smithing = true;
    dispatch(s, { type: 'build', x: 2, y: 3, building: 'lumberHut' });
    dispatch(s, { type: 'build', x: 4, y: 2, building: 'smithy' });
    dispatch(s, { type: 'recruit', classId: 'woodcutter' });
    const before = tileProduction(s, tileAt(s, 2, 3)!)!;
    dispatch(s, { type: 'craftGear', classId: 'woodcutter', slot: 'weapon' });
    const after = tileProduction(s, tileAt(s, 2, 3)!)!;
    expect(after.gear).toBeCloseTo(1.15);
    expect(after.total).toBeGreaterThan(before.total);
  });
});

describe('Zauber', () => {
  it('Steinregen trifft jeden Alien mit einem Vielfachen der Truppen-DPS und lädt danach auf', () => {
    const s = rich();
    s.research.spellStoneRain = true;
    expect(dispatch(s, { type: 'castSpell', spell: 'stoneRain' })).toBe('reason.noBattle');
    dispatch(s, { type: 'startBattle' });
    const b = s.battle!;
    b.waveTimer = 999;
    b.enemies.push({ id: 1, type: 'saugling', x: 300, prevX: 300, lane: 0, hp: 100, maxHp: 100 });
    b.enemies.push({ id: 2, type: 'saugling', x: 310, prevX: 310, lane: 1, hp: 1000, maxHp: 1000 });
    expect(dispatch(s, { type: 'castSpell', spell: 'stoneRain' })).toBeNull();
    // Bestiarium-Bonus gegen Sauglinge (nach der ersten Schlacht schon ≥ 10 Abschüsse) zählt mit.
    const hit = 3 * troopDps(s) * (1 + bestiaryBonus(s, 'saugling'));
    expect(b.enemies.find((e) => e.id === 1)!.hp).toBeCloseTo(100 - hit);
    expect(b.enemies.find((e) => e.id === 2)!.hp).toBeCloseTo(1000 - hit);
    expect(dispatch(s, { type: 'castSpell', spell: 'stoneRain' })).toBe('reason.cooldown');
    for (let i = 0; i < 20 * 21; i++) tick(s, 0.05);
    expect(s.battle?.spellCooldowns.stoneRain ?? 0).toBe(0);
  });

  it('Segen der Mauer heilt, Aufwerten verstärkt', () => {
    const s = rich();
    s.research.spellBlessing = true;
    s.research.spellStoneRain = true;
    const p1 = spellPower(s, 'blessing');
    expect(dispatch(s, { type: 'upgradeSpell', spell: 'blessing' })).toBeNull();
    expect(spellPower(s, 'blessing')).toBeCloseTo((p1 * 1.1) / 1, 5);
    dispatch(s, { type: 'startBattle' });
    const b = s.battle!;
    b.wallHp = 1;
    dispatch(s, { type: 'castSpell', spell: 'blessing' });
    expect(b.wallHp).toBeCloseTo(1 + b.wallMaxHp * spellPower(s, 'blessing'));
  });
});

describe('Rezept- und Gold-Skills', () => {
  it('Sägemehl beschleunigt das Sägewerk, Goldnuggets geben Gold je Bergmann', () => {
    const s = rich();
    s.research.sawing = true;
    s.research.mining = true;
    dispatch(s, { type: 'build', x: 3, y: 2, building: 'sawmill' });
    const planks = flows(s).produced.planks;
    s.skills.sawdust = 2;
    expect(flows(s).produced.planks).toBeCloseTo(planks * 1.3);

    dispatch(s, { type: 'build', x: 5, y: 2, building: 'mine' });
    dispatch(s, { type: 'recruit', classId: 'miner' });
    dispatch(s, { type: 'recruit', classId: 'miner' });
    const gold = flows(s).produced.gold;
    s.skills.nuggets = 1;
    expect(flows(s).produced.gold - gold).toBeCloseTo(0.05 * 2);
  });
});
