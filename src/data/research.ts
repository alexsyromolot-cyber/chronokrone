/**
 * Forschung (Währung: Wissen). Schaltet Gebäude, Rezepte, Klassen, Kartenbereiche,
 * Zauber und Mechaniken frei. Forschung bleibt beim Entwicklungssprung erhalten.
 *
 * Kosten stehen fest pro Knoten (kein Wachstum) – das Wachstum steckt in der Reihenfolge.
 */
import type { BuildingId } from './buildings';

export type ResearchId =
  | 'mining'
  | 'herbalism'
  | 'storage'
  | 'sawing'
  | 'survey1'
  | 'smelting'
  | 'alchemy'
  | 'tavern'
  | 'archery'
  | 'smithing'
  | 'writing'
  | 'scrapLore'
  | 'survey2'
  | 'arcana'
  | 'specialization'
  | 'spellStoneRain'
  | 'spellBlessing'
  | 'spellMilitia'
  | 'oracle'
  | 'chronology'
  // Epoche 2
  | 'steamPower'
  | 'gearCraft'
  | 'trade'
  | 'steamFoundry'
  // Epoche 3
  | 'electricity'
  | 'copperCraft'
  | 'wiring'
  | 'teslaCoil'
  // Epoche 4
  | 'prospecting'
  | 'fuelRods'
  | 'fission'
  | 'cooling'
  | 'atomicFaith'
  // Epoche 5
  | 'starNavigation'
  | 'stainedGlass'
  | 'neonRosette'
  | 'starOrder';

export interface ResearchDef {
  id: ResearchId;
  cost: number;
  requires: ResearchId[];
  /** Gebäude, die danach gebaut werden dürfen. */
  buildings?: BuildingId[];
  /** Position im Forschungsbaum (Spalte, Zeile) – nur für die Darstellung. */
  pos: [number, number];
  /** Erst ab dieser Epoche sichtbar und erforschbar. */
  epoch?: number;
}

export const RESEARCH: ResearchDef[] = [
  { id: 'mining', cost: 15, requires: [], buildings: ['mine'], pos: [0, 0] },
  { id: 'herbalism', cost: 15, requires: [], buildings: ['herbGarden'], pos: [1, 0] },
  { id: 'storage', cost: 20, requires: [], buildings: ['storehouse'], pos: [2, 0] },
  { id: 'sawing', cost: 25, requires: [], buildings: ['sawmill'], pos: [3, 0] },
  { id: 'spellStoneRain', cost: 20, requires: [], pos: [4, 0] },
  { id: 'survey1', cost: 30, requires: ['storage'], pos: [2, 1] },
  { id: 'smelting', cost: 40, requires: ['mining'], buildings: ['smelter'], pos: [0, 1] },
  { id: 'alchemy', cost: 40, requires: ['herbalism'], buildings: ['alchemy'], pos: [1, 1] },
  { id: 'tavern', cost: 35, requires: ['sawing'], buildings: ['tavern'], pos: [3, 1] },
  { id: 'spellBlessing', cost: 50, requires: ['spellStoneRain'], pos: [4, 1] },
  { id: 'smithing', cost: 70, requires: ['smelting'], buildings: ['smithy'], pos: [0, 2] },
  { id: 'writing', cost: 70, requires: ['alchemy'], buildings: ['scriptorium'], pos: [1, 2] },
  { id: 'archery', cost: 60, requires: ['sawing'], buildings: ['archeryRange'], pos: [3, 2] },
  { id: 'scrapLore', cost: 60, requires: ['survey1'], buildings: ['workshop'], pos: [2, 2] },
  { id: 'spellMilitia', cost: 90, requires: ['spellBlessing'], pos: [4, 2] },
  { id: 'specialization', cost: 80, requires: ['writing'], pos: [1, 3] },
  { id: 'survey2', cost: 120, requires: ['survey1', 'smithing'], pos: [2, 3] },
  { id: 'arcana', cost: 150, requires: ['writing', 'scrapLore'], buildings: ['mageTower'], pos: [3, 3] },
  { id: 'oracle', cost: 250, requires: ['arcana'], pos: [3, 4] },
  { id: 'chronology', cost: 400, requires: ['oracle', 'survey2'], pos: [2, 4] },
  // --- Epoche 2: Dampf & Zahnrad ---
  { id: 'steamPower', cost: 300, requires: [], buildings: ['coalMine'], pos: [0, 5], epoch: 2 },
  { id: 'trade', cost: 400, requires: ['steamPower'], buildings: ['market'], pos: [1, 5], epoch: 2 },
  { id: 'gearCraft', cost: 500, requires: ['steamPower'], buildings: ['gearWorks'], pos: [0, 6], epoch: 2 },
  {
    id: 'steamFoundry',
    cost: 900,
    requires: ['gearCraft'],
    buildings: ['steamFoundry'],
    pos: [1, 6],
    epoch: 2,
  },
  // --- Epoche 3: Elektro-Lehnswesen ---
  { id: 'copperCraft', cost: 1500, requires: [], buildings: ['copperMine'], pos: [0, 7], epoch: 3 },
  { id: 'wiring', cost: 2500, requires: ['copperCraft'], buildings: ['wireWorks'], pos: [1, 7], epoch: 3 },
  {
    id: 'electricity',
    cost: 3500,
    requires: ['wiring'],
    buildings: ['powerPlant', 'pylon'],
    pos: [0, 8],
    epoch: 3,
  },
  {
    id: 'teslaCoil',
    cost: 6000,
    requires: ['electricity'],
    buildings: ['teslaTower'],
    pos: [1, 8],
    epoch: 3,
  },
  // --- Epoche 4: Atomare Kreuzzüge ---
  { id: 'prospecting', cost: 8000, requires: [], buildings: ['uraniumMine'], pos: [0, 9], epoch: 4 },
  {
    id: 'fuelRods',
    cost: 12000,
    requires: ['prospecting'],
    buildings: ['rodFactory'],
    pos: [1, 9],
    epoch: 4,
  },
  { id: 'fission', cost: 16000, requires: ['fuelRods'], buildings: ['reactor'], pos: [0, 10], epoch: 4 },
  { id: 'cooling', cost: 16000, requires: ['fission'], buildings: ['coolingTower'], pos: [1, 10], epoch: 4 },
  { id: 'atomicFaith', cost: 25000, requires: ['fission'], buildings: ['bunker'], pos: [0, 11], epoch: 4 },
  // --- Epoche 5: Sternenorden ---
  {
    id: 'starNavigation',
    cost: 40000,
    requires: [],
    buildings: ['hullPlate', 'stardustScoop'],
    pos: [0, 12],
    epoch: 5,
  },
  {
    id: 'stainedGlass',
    cost: 60000,
    requires: ['starNavigation'],
    buildings: ['glassFurnace'],
    pos: [1, 12],
    epoch: 5,
  },
  {
    id: 'neonRosette',
    cost: 80000,
    requires: ['stainedGlass'],
    buildings: ['rosette'],
    pos: [0, 13],
    epoch: 5,
  },
  {
    id: 'starOrder',
    cost: 100000,
    requires: ['stainedGlass'],
    buildings: ['hangar'],
    pos: [1, 13],
    epoch: 5,
  },
];

export const RESEARCH_BY_ID = Object.fromEntries(RESEARCH.map((r) => [r.id, r])) as Record<
  ResearchId,
  ResearchDef
>;
