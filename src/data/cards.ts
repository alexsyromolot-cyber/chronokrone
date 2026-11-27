/**
 * Sammlung „Karten“ (Epoche 3): Vor der Schlacht legst du bis zu drei Karten in die Slots.
 * Manche Karten sind reine Vorteile, andere tauschen Stärke gegen Schwäche („mit Biss“) –
 * die Kombination ist die eigentliche Entscheidung.
 *
 * Wirkungen (Anteile, addieren sich über die gelegten Karten):
 *   damage → Truppenschaden   wallHp → Mauer-LP   gold → Beute   click → Klickschaden   crit → Kritchance
 *
 * Fundchance: jeder Sieg ab Epoche 3 mit FIND_CHANCE, spätestens nach PITY Siegen garantiert.
 * Karten bleiben bei jedem Sprung; die vollständige Sammlung gibt +10 % Schaden und Beute.
 */
export type CardEffect = 'damage' | 'wallHp' | 'gold' | 'click' | 'crit';

export interface CardDef {
  id: string;
  effects: Partial<Record<CardEffect, number>>;
}

export const CARDS: CardDef[] = [
  { id: 'sharpSteel', effects: { damage: 0.25 } },
  { id: 'thickWalls', effects: { wallHp: 0.3 } },
  { id: 'tollCollector', effects: { gold: 0.3 } },
  { id: 'royalFinger', effects: { click: 1 } },
  { id: 'luckyCharm', effects: { crit: 0.08 } },
  { id: 'glassCannon', effects: { damage: 0.6, wallHp: -0.3 } },
  { id: 'miserKing', effects: { gold: 0.7, damage: -0.2 } },
  { id: 'fortress', effects: { wallHp: 0.8, gold: -0.25 } },
  { id: 'overcharge', effects: { damage: 0.35, click: 0.5 } },
  { id: 'jester', effects: { crit: 0.15, wallHp: -0.1 } },
];

export const CARD_RULES = {
  fromEpoch: 3,
  slots: 3,
  findChance: 0.3,
  pity: 4,
  setBonus: 0.1,
} as const;
