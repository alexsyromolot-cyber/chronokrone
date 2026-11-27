/**
 * Chronik: der dauerhafte Baum, in den Zeitsplitter fließen. Bleibt bei jedem Sprung erhalten.
 *
 * Kosten Rang r → r+1 = Grundkosten × costGrowth^r
 * Manche Knoten sind unbegrenzt (maxRank = Infinity) und werden einfach immer teurer –
 * das ist die „unendlich skalierende“ Schicht aus dem Konzept.
 */

export type ChronicleId =
  | 'prodAll'
  | 'dmgAll'
  | 'clickPower'
  | 'startSupplies'
  | 'quickStudy'
  | 'scholarship'
  | 'veterans'
  | 'grandKeep'
  | 'surveyors'
  | 'tokenGift';

export type ChronicleEffect =
  | 'production'
  | 'damage'
  | 'click'
  | 'startResources'
  | 'xp'
  | 'knowledge'
  | 'startLevel'
  | 'startKeep'
  | 'startTiles'
  | 'bonusTokens';

export interface ChronicleDef {
  id: ChronicleId;
  effect: ChronicleEffect;
  /** Wirkung je Rang (Anteil, Anzahl oder Level – je nach Effekt). */
  perRank: number;
  maxRank: number;
  baseCost: number;
  costGrowth: number;
  requires?: ChronicleId;
  /** Position im Raster (Spalte, Zeile). */
  pos: [number, number];
}

export const CHRONICLE: ChronicleDef[] = [
  {
    id: 'prodAll',
    effect: 'production',
    perRank: 0.25,
    maxRank: Infinity,
    baseCost: 5,
    costGrowth: 1.5,
    pos: [0, 0],
  },
  {
    id: 'dmgAll',
    effect: 'damage',
    perRank: 0.25,
    maxRank: Infinity,
    baseCost: 5,
    costGrowth: 1.5,
    pos: [1, 0],
  },
  { id: 'clickPower', effect: 'click', perRank: 1, maxRank: 5, baseCost: 3, costGrowth: 1.5, pos: [2, 0] },
  {
    id: 'startSupplies',
    effect: 'startResources',
    perRank: 100,
    maxRank: 5,
    baseCost: 4,
    costGrowth: 1.6,
    pos: [3, 0],
  },
  {
    id: 'quickStudy',
    effect: 'xp',
    perRank: 0.3,
    maxRank: 5,
    baseCost: 6,
    costGrowth: 1.6,
    requires: 'prodAll',
    pos: [0, 1],
  },
  {
    id: 'scholarship',
    effect: 'knowledge',
    perRank: 0.3,
    maxRank: 5,
    baseCost: 6,
    costGrowth: 1.6,
    requires: 'prodAll',
    pos: [1, 1],
  },
  {
    id: 'veterans',
    effect: 'startLevel',
    perRank: 3,
    maxRank: 3,
    baseCost: 8,
    costGrowth: 2,
    requires: 'dmgAll',
    pos: [2, 1],
  },
  {
    id: 'grandKeep',
    effect: 'startKeep',
    perRank: 1,
    maxRank: 3,
    baseCost: 10,
    costGrowth: 2,
    requires: 'startSupplies',
    pos: [3, 1],
  },
  {
    id: 'surveyors',
    effect: 'startTiles',
    perRank: 3,
    maxRank: 2,
    baseCost: 10,
    costGrowth: 2,
    requires: 'grandKeep',
    pos: [3, 2],
  },
  {
    id: 'tokenGift',
    effect: 'bonusTokens',
    perRank: 3,
    maxRank: 5,
    baseCost: 8,
    costGrowth: 1.7,
    requires: 'quickStudy',
    pos: [0, 2],
  },
];

export const CHRONICLE_BY_ID = Object.fromEntries(CHRONICLE.map((c) => [c.id, c])) as Record<
  ChronicleId,
  ChronicleDef
>;
