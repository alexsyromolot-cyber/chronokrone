/**
 * Gebäude von Epoche 1.
 *
 * Kosten Bau:      Grundkosten × buildCountGrowth^(Anzahl vorhandener Gebäude dieses Typs)
 * Kosten Ausbau:   Ausbau-Grundkosten × costGrowth^(Level − 1)
 * Sanfte Kurven (~1,15) für Grundgebäude, steile (1,3+) für Spezialgebäude.
 *
 * Produktion pro Sekunde (Erzeuger):
 *   Basis × Level × Meilenstein × Gelände × (1 + Nachbarn + Arbeiter + Skills + Taverne)
 *
 * Rezepte (Umwandler): pro Sekunde laufen  cyclesPerLevel × Level × Meilenstein × (1 + Boni)
 * Durchgänge; jeder Durchgang verbraucht `inputs` und liefert `outputs`. Fehlt eine Zutat,
 * läuft nur so viel, wie vorhanden ist – die knappste Zutat ist der „Engpass“.
 */
import type { ResearchId } from './research';
import type { ResourceAmounts, ResourceId } from './resources';
import type { TerrainId } from './map';

export type BuildingId =
  | 'keep'
  | 'lumberHut'
  | 'quarry'
  | 'barracks'
  | 'monastery'
  | 'mine'
  | 'herbGarden'
  | 'storehouse'
  | 'sawmill'
  | 'smelter'
  | 'alchemy'
  | 'tavern'
  | 'smithy'
  | 'scriptorium'
  | 'archeryRange'
  | 'workshop'
  | 'mageTower'
  // Epoche 2
  | 'coalMine'
  | 'gearWorks'
  | 'market'
  | 'steamFoundry'
  // Epoche 3
  | 'copperMine'
  | 'wireWorks'
  | 'powerPlant'
  | 'pylon'
  | 'teslaTower';

export interface Recipe {
  inputs: ResourceAmounts;
  outputs: ResourceAmounts;
  /** Durchgänge pro Sekunde je Level. */
  cyclesPerLevel: number;
}

export interface BuildingDef {
  id: BuildingId;
  /** Darf der Spieler es auf ein freies Feld setzen? (Bergfried steht von Anfang an.) */
  buildable: boolean;
  /** Forschung, die den Bau erlaubt. */
  research?: ResearchId;
  /** Höchstanzahl auf dem Raster (undefined = beliebig viele). */
  maxCount?: number;
  /** Höchstes Level; z. B. Strommasten, deren Level nichts bewirken würde. */
  maxLevel?: number;
  /** Kosten für den Bau (Level 0 → 1). */
  baseCost: ResourceAmounts;
  /** Grundkosten für Ausbauten (Level 1 → 2 usw.); fehlt es, gilt baseCost. */
  upgradeCost?: ResourceAmounts;
  costGrowth: number;
  produces?: { resource: ResourceId; perLevel: number };
  recipe?: Recipe;
  /** Multiplikator, wenn das Gebäude auf diesem Gelände steht. */
  terrainBonus?: Partial<Record<TerrainId, number>>;
  /** +Anteil je angrenzendem Gebäude dieses Typs (oben/unten/links/rechts). */
  neighborBonus?: { building: BuildingId; bonus: number };
  /** Plätze für Sammler der zugehörigen Klasse, je Gebäude. */
  workerSlots?: number;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  keep: {
    id: 'keep',
    buildable: false,
    maxCount: 1,
    baseCost: { gold: 40, wood: 20, stone: 30 },
    costGrowth: 1.6,
    // „Steuern“: Der König presst den Bauern ein paar Münzen ab.
    produces: { resource: 'gold', perLevel: 0.25 },
  },
  lumberHut: {
    id: 'lumberHut',
    buildable: true,
    baseCost: { gold: 12 },
    // Ausbauten kosten Stein statt Holz: Würde Holz die eigenen Holz-Upgrades bezahlen,
    // wüchse die Produktion in einer selbstverstärkenden Schleife davon.
    upgradeCost: { gold: 8, stone: 5 },
    costGrowth: 1.2,
    produces: { resource: 'wood', perLevel: 0.15 },
    terrainBonus: { forest: 1.5, stream: 1.1 },
    // Holzfäller-Viertel: Sie leihen sich gegenseitig Äxte.
    neighborBonus: { building: 'lumberHut', bonus: 0.15 },
    workerSlots: 2,
  },
  quarry: {
    id: 'quarry',
    buildable: true,
    baseCost: { gold: 25, wood: 20 },
    upgradeCost: { gold: 10, wood: 15 },
    costGrowth: 1.2,
    produces: { resource: 'stone', perLevel: 0.3 },
    terrainBonus: { rock: 1.5, stream: 1.1 },
    // Gelangweilte Soldaten schleppen Steine.
    neighborBonus: { building: 'barracks', bonus: 0.25 },
  },
  barracks: {
    id: 'barracks',
    buildable: true,
    maxCount: 1,
    baseCost: { gold: 30, wood: 30, stone: 15 },
    upgradeCost: { gold: 25, wood: 20, stone: 20 },
    costGrowth: 1.35,
  },
  monastery: {
    id: 'monastery',
    buildable: true,
    baseCost: { gold: 40, wood: 25, stone: 25 },
    upgradeCost: { gold: 20, stone: 20 },
    costGrowth: 1.25,
    produces: { resource: 'knowledge', perLevel: 0.12 },
    // Stille am Bach fördert das Denken. Behauptet zumindest der Abt.
    terrainBonus: { stream: 1.3 },
    workerSlots: 2,
  },
  mine: {
    id: 'mine',
    buildable: true,
    research: 'mining',
    baseCost: { gold: 35, wood: 30 },
    upgradeCost: { gold: 15, wood: 20, stone: 10 },
    costGrowth: 1.2,
    produces: { resource: 'ore', perLevel: 0.25 },
    terrainBonus: { rock: 1.6 },
    workerSlots: 2,
  },
  herbGarden: {
    id: 'herbGarden',
    buildable: true,
    research: 'herbalism',
    baseCost: { gold: 30, wood: 20 },
    upgradeCost: { gold: 12, wood: 15 },
    costGrowth: 1.2,
    produces: { resource: 'herbs', perLevel: 0.25 },
    terrainBonus: { stream: 1.5, grass: 1.2 },
    workerSlots: 2,
  },
  storehouse: {
    id: 'storehouse',
    buildable: true,
    research: 'storage',
    maxCount: 1,
    baseCost: { gold: 40, wood: 40, stone: 30 },
    upgradeCost: { gold: 30, wood: 30, stone: 30 },
    costGrowth: 1.45,
  },
  sawmill: {
    id: 'sawmill',
    buildable: true,
    research: 'sawing',
    baseCost: { gold: 40, wood: 30, stone: 20 },
    upgradeCost: { gold: 20, stone: 20 },
    costGrowth: 1.22,
    recipe: { inputs: { wood: 2 }, outputs: { planks: 1 }, cyclesPerLevel: 0.25 },
    // Laut Konzept: Sägewerk neben Holzfäller +15 %.
    neighborBonus: { building: 'lumberHut', bonus: 0.15 },
  },
  smelter: {
    id: 'smelter',
    buildable: true,
    research: 'smelting',
    baseCost: { gold: 50, stone: 40, planks: 10 },
    upgradeCost: { gold: 25, stone: 25, planks: 5 },
    costGrowth: 1.22,
    recipe: { inputs: { ore: 2 }, outputs: { iron: 1 }, cyclesPerLevel: 0.15 },
    neighborBonus: { building: 'mine', bonus: 0.15 },
  },
  alchemy: {
    id: 'alchemy',
    buildable: true,
    research: 'alchemy',
    baseCost: { gold: 50, wood: 30, planks: 10 },
    upgradeCost: { gold: 25, planks: 8 },
    costGrowth: 1.22,
    recipe: { inputs: { herbs: 3 }, outputs: { ink: 1 }, cyclesPerLevel: 0.1 },
    neighborBonus: { building: 'herbGarden', bonus: 0.15 },
  },
  tavern: {
    id: 'tavern',
    buildable: true,
    research: 'tavern',
    baseCost: { gold: 60, planks: 20, stone: 20 },
    upgradeCost: { gold: 40, planks: 15 },
    costGrowth: 1.35,
  },
  smithy: {
    id: 'smithy',
    buildable: true,
    research: 'smithing',
    baseCost: { gold: 80, stone: 40, iron: 10 },
    upgradeCost: { gold: 40, iron: 10 },
    costGrowth: 1.25,
    recipe: { inputs: { iron: 2, wood: 1 }, outputs: { steel: 1 }, cyclesPerLevel: 0.08 },
    // Laut Konzept: Schmiede neben Mine +20 %.
    neighborBonus: { building: 'mine', bonus: 0.2 },
  },
  scriptorium: {
    id: 'scriptorium',
    buildable: true,
    research: 'writing',
    baseCost: { gold: 80, planks: 25, ink: 5 },
    upgradeCost: { gold: 40, planks: 15, ink: 3 },
    costGrowth: 1.25,
    recipe: { inputs: { ink: 2, knowledge: 1 }, outputs: { scrolls: 1 }, cyclesPerLevel: 0.05 },
    neighborBonus: { building: 'monastery', bonus: 0.2 },
  },
  archeryRange: {
    id: 'archeryRange',
    buildable: true,
    research: 'archery',
    maxCount: 1,
    baseCost: { gold: 70, planks: 30, stone: 20 },
    upgradeCost: { gold: 40, planks: 20 },
    costGrowth: 1.35,
  },
  workshop: {
    id: 'workshop',
    buildable: true,
    research: 'scrapLore',
    baseCost: { gold: 100, planks: 30, iron: 15 },
    upgradeCost: { gold: 50, iron: 10 },
    costGrowth: 1.3,
    // Alien-Schrott sortieren: Aus drei Teilen wird ein Chip, der zumindest nicht mehr brennt.
    recipe: { inputs: { scrap: 3 }, outputs: { chips: 1 }, cyclesPerLevel: 0.05 },
  },
  mageTower: {
    id: 'mageTower',
    buildable: true,
    research: 'arcana',
    maxCount: 1,
    baseCost: { gold: 150, stone: 80, scrolls: 5 },
    upgradeCost: { gold: 80, scrolls: 3 },
    costGrowth: 1.4,
  },
  // --- Epoche 2: Dampf & Zahnrad ---
  coalMine: {
    id: 'coalMine',
    buildable: true,
    research: 'steamPower',
    baseCost: { gold: 400, wood: 300, iron: 40 },
    upgradeCost: { gold: 120, wood: 80, iron: 10 },
    costGrowth: 1.2,
    produces: { resource: 'coal', perLevel: 0.6 },
    terrainBonus: { rock: 1.5 },
    workerSlots: 2,
  },
  gearWorks: {
    id: 'gearWorks',
    buildable: true,
    research: 'gearCraft',
    baseCost: { gold: 700, stone: 300, iron: 60 },
    upgradeCost: { gold: 200, iron: 20, coal: 30 },
    costGrowth: 1.25,
    // Zahnräder: Eisen in Form gießen, mit Kohle befeuert.
    recipe: { inputs: { iron: 1, coal: 2 }, outputs: { gears: 1 }, cyclesPerLevel: 0.1 },
    neighborBonus: { building: 'coalMine', bonus: 0.2 },
  },
  market: {
    id: 'market',
    buildable: true,
    research: 'trade',
    maxCount: 1,
    baseCost: { gold: 600, planks: 150, stone: 150 },
    upgradeCost: { gold: 300, planks: 60 },
    costGrowth: 1.4,
  },
  steamFoundry: {
    id: 'steamFoundry',
    buildable: true,
    research: 'steamFoundry',
    maxCount: 1,
    baseCost: { gold: 1500, steel: 80, gears: 20 },
    upgradeCost: { gold: 500, gears: 10 },
    costGrowth: 1.4,
  },
  // --- Epoche 3: Elektro-Lehnswesen ---
  copperMine: {
    id: 'copperMine',
    buildable: true,
    research: 'copperCraft',
    baseCost: { gold: 3000, wood: 2000, gears: 20 },
    upgradeCost: { gold: 800, gears: 4 },
    costGrowth: 1.2,
    produces: { resource: 'copper', perLevel: 0.8 },
    terrainBonus: { rock: 1.5 },
    workerSlots: 2,
  },
  wireWorks: {
    id: 'wireWorks',
    buildable: true,
    research: 'wiring',
    baseCost: { gold: 5000, stone: 2000, copper: 200 },
    upgradeCost: { gold: 1200, copper: 60 },
    costGrowth: 1.25,
    // Draht ziehen: 2 Kupfer werden zu 1 Draht.
    recipe: { inputs: { copper: 2 }, outputs: { wire: 1 }, cyclesPerLevel: 0.15 },
    neighborBonus: { building: 'copperMine', bonus: 0.2 },
  },
  powerPlant: {
    id: 'powerPlant',
    buildable: true,
    research: 'electricity',
    baseCost: { gold: 4000, steel: 200, gears: 40 },
    upgradeCost: { gold: 1000, gears: 8, coal: 100 },
    costGrowth: 1.3,
  },
  pylon: {
    id: 'pylon',
    buildable: true,
    research: 'electricity',
    // Billig, damit das Verlegen von Leitungen eine Raster-Frage ist und keine Geldfrage.
    baseCost: { gold: 500, wire: 5 },
    upgradeCost: { gold: 100 },
    maxLevel: 1,
    costGrowth: 1.15,
  },
  teslaTower: {
    id: 'teslaTower',
    buildable: true,
    research: 'teslaCoil',
    maxCount: 1,
    baseCost: { gold: 12000, wire: 80, gears: 60 },
    upgradeCost: { gold: 3000, wire: 20 },
    costGrowth: 1.4,
  },
};

/**
 * Jedes weitere Gebäude desselben Typs kostet beim Bau mehr:
 *   Baukosten = Grundkosten × buildCountGrowth^(Anzahl vorhandener Gebäude dieses Typs)
 * Sonst wäre „zehn Hütten auf Level 1“ immer besser als eine auf Level 10.
 */
export const BUILD_COUNT_GROWTH = 1.6;

/** Ab diesen Gebäude-Leveln verdoppelt sich die Produktion (mit Bildschirm-Shake). */
export const BUILDING_MILESTONES = [10, 25, 50, 100] as const;

/** Truppen-Gebäude: Plätze und Schadensbonus pro Level. */
export const BARRACKS = {
  troopSlotsBase: 3,
  /** Kaserne, Schießstand und Magierturm geben je Level diese Plätze. */
  troopSlotsPerLevel: 2,
  damageBonusPerLevel: 0.05,
} as const;

/** Markt: jedes Level verringert die Handelsspanne um diesen Anteil (siehe data/market.ts). */
export const MARKET_SPREAD_PER_LEVEL = 0.01;

/** Taverne: angrenzende Sammler-Gebäude +Anteil je Tavernen-Level (Arbeitsmoral). */
export const TAVERN_BONUS_PER_LEVEL = 0.1;
