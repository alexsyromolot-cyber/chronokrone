/**
 * Klassen-Skilltrees. Pro Klasse 12 Knoten im 4×4-Icon-Raster:
 *   Zeile 0–1: allgemeine Knoten (für alle)
 *   Zeile 2–3: zwei Spezialisierungen (Spalten 0–1 = Weg A, Spalten 2–3 = Weg B)
 * Die Spezialisierung ist ein Entweder-Oder: Wer den ersten Knoten eines Weges kauft,
 * legt die Klasse fest – änderbar erst beim Entwicklungssprung. Voraussetzung: Forschung
 * „Spezialisierung“ und eine Einheit der Klasse auf Level 10.
 *
 * Skillpunkte gehören der Klasse: Jedes Level-Up irgendeiner Einheit gibt 1 Punkt.
 * Jede Stufe eines Knotens kostet 1 Punkt. Beschreibungen werden aus dem Effekt erzeugt,
 * damit Zahl und Text nie auseinanderlaufen.
 */
import type { BuildingId } from './buildings';
import type { ClassId } from './units';

export type SkillKind =
  | 'damageMult'
  | 'attackSpeed'
  | 'critChance'
  | 'enemySlow'
  | 'wallHpMult'
  | 'wallRegen'
  | 'productionMult'
  | 'terrainBonusMult'
  | 'xpMult'
  | 'lootGold'
  | 'scrapChance'
  | 'recipeMult'
  | 'spellPower'
  | 'clickMult'
  | 'splashMult'
  | 'rangeAdd'
  | 'goldPerSecond';

export interface SkillEffect {
  kind: SkillKind;
  perRank: number;
  /** Nur bei recipeMult: welches Rezept-Gebäude schneller wird. */
  building?: BuildingId;
}

export type SpecPath = 'a' | 'b';

export interface SkillDef {
  id: string;
  classId: ClassId;
  maxRank: number;
  effect: SkillEffect;
  /** Knoten, der mindestens Stufe 1 haben muss. */
  requires?: string;
  /** Position im Icon-Raster (Spalte, Zeile). */
  pos: [number, number];
  /** Gehört zu Spezialisierung A oder B. */
  spec?: SpecPath;
}

/** Effekte, die nur für die eigene Klasse gelten; alle anderen wirken global. */
export const CLASS_SCOPED: SkillKind[] = [
  'damageMult',
  'attackSpeed',
  'critChance',
  'productionMult',
  'terrainBonusMult',
  'xpMult',
  'splashMult',
  'rangeAdd',
  'goldPerSecond',
];

/** Kurzschreibweise, damit 96 Knoten lesbar bleiben. */
function tree(
  classId: ClassId,
  nodes: [
    id: string,
    kind: SkillKind,
    perRank: number,
    maxRank: number,
    col: number,
    row: number,
    requires?: string | undefined,
    building?: BuildingId,
  ][],
): SkillDef[] {
  return nodes.map(([id, kind, perRank, maxRank, col, row, requires, building]) => {
    const def: SkillDef = {
      id,
      classId,
      maxRank,
      effect: building ? { kind, perRank, building } : { kind, perRank },
      pos: [col, row],
    };
    if (requires) def.requires = requires;
    if (row >= 2) def.spec = col <= 1 ? 'a' : 'b';
    return def;
  });
}

export const SKILLS: SkillDef[] = [
  ...tree('peasant', [
    ['pitchforkTraining', 'damageMult', 0.5, 3, 0, 0],
    ['loudCursing', 'enemySlow', 0.1, 2, 1, 0, 'pitchforkTraining'],
    ['thickSkulls', 'wallHpMult', 0.05, 3, 2, 0],
    ['harvestHands', 'xpMult', 0.2, 3, 0, 1, 'pitchforkTraining'],
    ['mobTactics', 'attackSpeed', 0.1, 3, 1, 1, 'loudCursing'],
    ['kingsFavor', 'clickMult', 0.2, 5, 2, 1, 'thickSkulls'],
    ['pitchforkMaster', 'damageMult', 1, 1, 0, 2, 'harvestHands'],
    ['sharpTines', 'critChance', 0.05, 3, 0, 3, 'pitchforkMaster'],
    ['frenzy', 'attackSpeed', 0.15, 2, 1, 3, 'pitchforkMaster'],
    ['villageWatch', 'wallHpMult', 0.25, 1, 2, 2, 'kingsFavor'],
    ['patrols', 'wallRegen', 0.005, 3, 2, 3, 'villageWatch'],
    ['bellRinger', 'enemySlow', 0.1, 2, 3, 3, 'villageWatch'],
  ]),
  ...tree('knight', [
    ['whetstone', 'damageMult', 0.4, 3, 0, 0],
    ['wallWarden', 'wallHpMult', 0.15, 2, 1, 0, 'whetstone'],
    ['drill', 'attackSpeed', 0.08, 3, 2, 0],
    ['heavyBlows', 'critChance', 0.05, 3, 0, 1, 'whetstone'],
    ['chivalry', 'lootGold', 0.05, 3, 1, 1, 'wallWarden'],
    ['squires', 'xpMult', 0.2, 3, 2, 1, 'drill'],
    ['bulwark', 'wallHpMult', 0.4, 1, 0, 2, 'heavyBlows'],
    ['shieldWall', 'wallRegen', 0.01, 3, 0, 3, 'bulwark'],
    ['stoneSkin', 'wallHpMult', 0.1, 3, 1, 3, 'bulwark'],
    ['berserk', 'damageMult', 1, 1, 2, 2, 'squires'],
    ['bloodlust', 'attackSpeed', 0.15, 3, 2, 3, 'berserk'],
    ['cleave', 'critChance', 0.08, 3, 3, 3, 'berserk'],
  ]),
  ...tree('archer', [
    ['fletching', 'damageMult', 0.3, 5, 0, 0],
    ['eagleEye', 'rangeAdd', 20, 2, 1, 0, 'fletching'],
    ['quickDraw', 'attackSpeed', 0.1, 3, 2, 0],
    ['aimedShot', 'critChance', 0.06, 3, 0, 1, 'fletching'],
    ['bounty', 'lootGold', 0.05, 3, 1, 1, 'eagleEye'],
    ['targetPractice', 'xpMult', 0.2, 3, 2, 1, 'quickDraw'],
    ['sniper', 'critChance', 0.2, 1, 0, 2, 'aimedShot'],
    ['headshot', 'damageMult', 0.5, 3, 0, 3, 'sniper'],
    ['longbow', 'rangeAdd', 30, 2, 1, 3, 'sniper'],
    ['volley', 'attackSpeed', 0.5, 1, 2, 2, 'targetPractice'],
    ['arrowStorm', 'attackSpeed', 0.1, 3, 2, 3, 'volley'],
    ['barbedArrows', 'enemySlow', 0.05, 3, 3, 3, 'volley'],
  ]),
  ...tree('warlock', [
    ['runes', 'damageMult', 0.3, 5, 0, 0],
    ['blastRadius', 'splashMult', 0.1, 3, 1, 0, 'runes'],
    ['attunement', 'spellPower', 0.1, 3, 2, 0],
    ['channeling', 'attackSpeed', 0.08, 3, 0, 1, 'runes'],
    ['forbiddenTomes', 'xpMult', 0.2, 3, 1, 1, 'blastRadius'],
    ['alienResonance', 'scrapChance', 0.02, 3, 2, 1, 'attunement'],
    ['pyromancy', 'damageMult', 1, 1, 0, 2, 'channeling'],
    ['inferno', 'splashMult', 0.2, 3, 0, 3, 'pyromancy'],
    ['combustion', 'critChance', 0.06, 3, 1, 3, 'pyromancy'],
    ['cryomancy', 'enemySlow', 0.2, 1, 2, 2, 'alienResonance'],
    ['frostbite', 'enemySlow', 0.05, 3, 2, 3, 'cryomancy'],
    ['glacier', 'spellPower', 0.15, 3, 3, 3, 'cryomancy'],
  ]),
  ...tree('woodcutter', [
    ['sharpAxes', 'productionMult', 0.3, 3, 0, 0],
    ['forestLore', 'terrainBonusMult', 1, 1, 1, 0, 'sharpAxes'],
    ['lumberjackSong', 'productionMult', 0.1, 5, 2, 0],
    ['sawdust', 'recipeMult', 0.15, 3, 0, 1, 'sharpAxes', 'sawmill'],
    ['strongBacks', 'xpMult', 0.2, 3, 1, 1, 'forestLore'],
    ['timberTrade', 'goldPerSecond', 0.05, 3, 2, 1, 'lumberjackSong'],
    ['clearcut', 'productionMult', 1, 1, 0, 2, 'sawdust'],
    ['stumpGrinder', 'productionMult', 0.15, 3, 0, 3, 'clearcut'],
    ['boarding', 'recipeMult', 0.25, 3, 1, 3, 'clearcut', 'sawmill'],
    ['forester', 'terrainBonusMult', 1, 1, 2, 2, 'timberTrade'],
    ['saplings', 'productionMult', 0.2, 3, 2, 3, 'forester'],
    ['deepRoots', 'xpMult', 0.3, 3, 3, 3, 'forester'],
  ]),
  ...tree('miner', [
    ['pickaxes', 'productionMult', 0.25, 5, 0, 0],
    ['lanterns', 'xpMult', 0.2, 3, 1, 0, 'pickaxes'],
    ['oreSense', 'terrainBonusMult', 0.5, 2, 2, 0],
    ['bellows', 'recipeMult', 0.15, 3, 0, 1, 'pickaxes', 'smelter'],
    ['forgeSong', 'recipeMult', 0.1, 3, 1, 1, 'lanterns', 'smithy'],
    ['nuggets', 'goldPerSecond', 0.05, 3, 2, 1, 'oreSense'],
    ['deepShafts', 'productionMult', 1, 1, 0, 2, 'bellows'],
    ['supportBeams', 'productionMult', 0.15, 3, 0, 3, 'deepShafts'],
    ['smeltMaster', 'recipeMult', 0.25, 3, 1, 3, 'deepShafts', 'smelter'],
    ['gemHunter', 'goldPerSecond', 0.3, 1, 2, 2, 'nuggets'],
    ['gemCutting', 'goldPerSecond', 0.1, 3, 2, 3, 'gemHunter'],
    ['luckyStrike', 'scrapChance', 0.02, 3, 3, 3, 'gemHunter'],
  ]),
  ...tree('herbalist', [
    ['greenThumb', 'productionMult', 0.25, 5, 0, 0],
    ['moonPicking', 'terrainBonusMult', 0.5, 2, 1, 0, 'greenThumb'],
    ['brewing', 'recipeMult', 0.15, 3, 2, 0, undefined, 'alchemy'],
    ['herbLore', 'xpMult', 0.2, 3, 0, 1, 'greenThumb'],
    ['poultice', 'wallRegen', 0.003, 3, 1, 1, 'moonPicking'],
    ['dryingRacks', 'productionMult', 0.1, 3, 2, 1, 'brewing'],
    ['alchemist', 'recipeMult', 1, 1, 0, 2, 'herbLore', 'alchemy'],
    ['distillation', 'recipeMult', 0.2, 3, 0, 3, 'alchemist', 'alchemy'],
    ['quicksilver', 'recipeMult', 0.15, 3, 1, 3, 'alchemist', 'scriptorium'],
    ['healer', 'wallRegen', 0.01, 1, 2, 2, 'dryingRacks'],
    ['salves', 'wallRegen', 0.004, 3, 2, 3, 'healer'],
    ['blessedHerbs', 'wallHpMult', 0.05, 3, 3, 3, 'healer'],
  ]),
  ...tree('monk', [
    ['meditation', 'productionMult', 0.25, 5, 0, 0],
    ['illumination', 'recipeMult', 0.15, 3, 1, 0, 'meditation', 'scriptorium'],
    ['vowOfSilence', 'xpMult', 0.2, 3, 2, 0],
    ['library', 'productionMult', 0.1, 3, 0, 1, 'meditation'],
    ['prayer', 'spellPower', 0.05, 3, 1, 1, 'illumination'],
    ['tithes', 'goldPerSecond', 0.05, 3, 2, 1, 'vowOfSilence'],
    ['scholar', 'productionMult', 1, 1, 0, 2, 'library'],
    ['debate', 'productionMult', 0.15, 3, 0, 3, 'scholar'],
    ['archives', 'xpMult', 0.3, 3, 1, 3, 'scholar'],
    ['scribe', 'recipeMult', 1, 1, 2, 2, 'tithes', 'scriptorium'],
    ['calligraphy', 'recipeMult', 0.2, 3, 2, 3, 'scribe', 'scriptorium'],
    ['copyists', 'spellPower', 0.1, 3, 3, 3, 'scribe'],
  ]),
  // --- Epoche 2 ---
  ...tree('stoker', [
    ['shovelWork', 'productionMult', 0.2, 5, 0, 0],
    ['stamina', 'xpMult', 0.2, 3, 1, 0],
    ['bellowsBlast', 'recipeMult', 0.15, 3, 2, 0, undefined, 'gearWorks'],
    ['coalDust', 'goldPerSecond', 0.1, 3, 0, 1, 'shovelWork'],
    ['hotFurnace', 'recipeMult', 0.25, 3, 1, 1, 'bellowsBlast', 'gearWorks'],
    ['overtime', 'productionMult', 0.1, 5, 2, 1, 'stamina'],
  ]),
  ...tree('steamKnight', [
    ['pistonArm', 'damageMult', 0.4, 5, 0, 0],
    ['boiler', 'attackSpeed', 0.08, 3, 1, 0],
    ['steamArmor', 'wallHpMult', 0.1, 3, 2, 0],
    ['valves', 'critChance', 0.06, 3, 0, 1, 'pistonArm'],
    ['pressureLance', 'rangeAdd', 20, 2, 1, 1, 'boiler'],
    ['overdrive', 'splashMult', 0.2, 3, 2, 1, 'valves'],
  ]),
  // --- Epoche 3 ---
  ...tree('lineman', [
    ['climbingIrons', 'productionMult', 0.2, 5, 0, 0],
    ['insulatedGloves', 'xpMult', 0.2, 3, 1, 0],
    ['wireDrawing', 'recipeMult', 0.15, 3, 2, 0, undefined, 'wireWorks'],
    ['copperNose', 'terrainBonusMult', 0.3, 3, 0, 1, 'climbingIrons'],
    ['highVoltage', 'recipeMult', 0.25, 3, 1, 1, 'wireDrawing', 'wireWorks'],
    ['nightShift', 'productionMult', 0.1, 5, 2, 1, 'insulatedGloves'],
  ]),
  ...tree('teslaLancer', [
    ['arcFocus', 'damageMult', 0.4, 5, 0, 0],
    ['capacitor', 'attackSpeed', 0.08, 3, 1, 0],
    ['groundingRod', 'wallHpMult', 0.1, 3, 2, 0],
    ['chainSpark', 'splashMult', 0.25, 3, 0, 1, 'arcFocus'],
    ['longArc', 'rangeAdd', 20, 2, 1, 1, 'capacitor'],
    ['overload', 'critChance', 0.06, 3, 2, 1, 'chainSpark'],
  ]),
  // --- Epoche 4 ---
  ...tree('prospector', [
    ['geigerSense', 'productionMult', 0.2, 5, 0, 0],
    ['leadLungs', 'xpMult', 0.2, 3, 1, 0],
    ['rodPress', 'recipeMult', 0.15, 3, 2, 0, undefined, 'rodFactory'],
    ['deepVein', 'terrainBonusMult', 0.3, 3, 0, 1, 'geigerSense'],
    ['enrichment', 'recipeMult', 0.25, 3, 1, 1, 'rodPress', 'rodFactory'],
    ['glowShift', 'productionMult', 0.1, 5, 2, 1, 'leadLungs'],
  ]),
  ...tree('rayPaladin', [
    ['halfLife', 'damageMult', 0.4, 5, 0, 0],
    ['fastFission', 'attackSpeed', 0.08, 3, 1, 0],
    ['leadPlating', 'wallHpMult', 0.1, 3, 2, 0],
    ['falloutArc', 'splashMult', 0.25, 3, 0, 1, 'halfLife'],
    ['longBeam', 'rangeAdd', 20, 2, 1, 1, 'fastFission'],
    ['chainReaction', 'critChance', 0.06, 3, 2, 1, 'falloutArc'],
  ]),
];

export const SKILLS_BY_ID: Record<string, SkillDef> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

/** Ab diesem Einheiten-Level kann sich eine Klasse spezialisieren. */
export const SPEC_LEVEL = 10;
