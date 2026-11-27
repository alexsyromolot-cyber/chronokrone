/**
 * Gebäude von Epoche 1 (Vertical Slice: Bergfried + drei baubare Gebäude).
 *
 * Kosten für den Schritt von Level L auf L+1:
 *   Kosten = Grundkosten × costGrowth^L          (L = 0 heißt: neu bauen)
 * Sanfte Kurven (~1,1) für Grundgebäude, steile (1,3+) für Spezialgebäude.
 *
 * Produktion pro Sekunde:
 *   Basis × Level × Meilenstein-Faktor × Gelände × (1 + Nachbarschaft + Arbeiter + Skills)
 */
import type { ResourceAmounts, ResourceId } from './resources';
import type { TerrainId } from './map';

export type BuildingId = 'keep' | 'lumberHut' | 'quarry' | 'barracks';

export interface BuildingDef {
  id: BuildingId;
  /** Darf der Spieler es auf ein freies Feld setzen? (Bergfried steht von Anfang an.) */
  buildable: boolean;
  /** Höchstanzahl auf dem Raster (undefined = beliebig viele). */
  maxCount?: number;
  /** Kosten für den Bau (Level 0 → 1). */
  baseCost: ResourceAmounts;
  /** Grundkosten für Ausbauten (Level 1 → 2 usw.); fehlt es, gilt baseCost. */
  upgradeCost?: ResourceAmounts;
  costGrowth: number;
  produces?: { resource: ResourceId; perLevel: number };
  /** Multiplikator, wenn das Gebäude auf diesem Gelände steht. */
  terrainBonus?: Partial<Record<TerrainId, number>>;
  /** +Anteil je angrenzendem Gebäude dieses Typs (oben/unten/links/rechts). */
  neighborBonus?: { building: BuildingId; bonus: number };
  /** Plätze für Sammler einer Klasse, je Gebäude. */
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
};

/**
 * Jedes weitere Gebäude desselben Typs kostet beim Bau mehr:
 *   Baukosten = Grundkosten × buildCountGrowth^(Anzahl vorhandener Gebäude dieses Typs)
 * Sonst wäre „zehn Hütten auf Level 1“ immer besser als eine auf Level 10.
 */
export const BUILD_COUNT_GROWTH = 1.6;

/** Ab diesen Gebäude-Leveln verdoppelt sich die Produktion (mit Bildschirm-Shake). */
export const BUILDING_MILESTONES = [10, 25, 50, 100] as const;

/** Kaserne: Truppenplätze und Schadensbonus pro Level. */
export const BARRACKS = {
  troopSlotsBase: 3,
  troopSlotsPerLevel: 2,
  damageBonusPerLevel: 0.05,
} as const;
