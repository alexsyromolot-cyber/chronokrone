/**
 * Zauber: die aktive Seite der Abwehrschlacht. Jeder Zauber hat eine Abklingzeit und
 * wird mit Schriftrollen aufgewertet.
 *
 * Angriffszauber richten sich nach der Kampfkraft der eigenen Truppen („Truppen-DPS“ =
 * Summe aus Schaden ÷ Abklingzeit aller Truppen). So wachsen sie mit dir mit – würden sie
 * sich nach den Gegner-LP richten, machten sie jede Belagerungsstufe gleich leicht.
 *   Stärke = Grundwert × (1 + perLevel × (Stufe − 1)) × (1 + Zauberstärke aus Skills)
 *
 *   Steinregen        trifft JEDEN Alien mit Stärke × Truppen-DPS
 *   Segen der Mauer   heilt die Mauer um Stärke × ihre maximalen LP (Anteil)
 *   Rufen der Bauern  eine Miliz trifft 12 s lang jede Sekunde den vordersten Alien mit Stärke × Truppen-DPS
 *
 * Aufwerten: Kosten = Grundkosten × 1,8^(Stufe − 1)
 */
import type { ResearchId } from './research';
import type { ResourceAmounts } from './resources';

export type SpellId = 'stoneRain' | 'blessing' | 'militia';
export const SPELL_IDS: SpellId[] = ['stoneRain', 'blessing', 'militia'];

export interface SpellDef {
  id: SpellId;
  research: ResearchId;
  cooldown: number;
  /** Grundstärke in Anteilen (0,35 = 35 %). */
  power: number;
  perLevel: number;
  maxLevel: number;
  upgradeCost: ResourceAmounts;
  upgradeGrowth: number;
  /** Tastenkürzel in der Schlacht. */
  key: string;
  color: string;
}

export const SPELLS: Record<SpellId, SpellDef> = {
  stoneRain: {
    id: 'stoneRain',
    research: 'spellStoneRain',
    cooldown: 20,
    power: 3,
    perLevel: 0.1,
    maxLevel: 10,
    upgradeCost: { scrolls: 2, stone: 40 },
    upgradeGrowth: 1.8,
    key: '1',
    color: '#b8bccb',
  },
  blessing: {
    id: 'blessing',
    research: 'spellBlessing',
    cooldown: 45,
    power: 0.3,
    perLevel: 0.1,
    maxLevel: 10,
    upgradeCost: { scrolls: 3, herbs: 30 },
    upgradeGrowth: 1.8,
    key: '2',
    color: '#7ed37e',
  },
  militia: {
    id: 'militia',
    research: 'spellMilitia',
    cooldown: 60,
    power: 0.6,
    perLevel: 0.1,
    maxLevel: 10,
    upgradeCost: { scrolls: 4, gold: 100 },
    upgradeGrowth: 1.8,
    key: '3',
    color: '#c9a66b',
  },
};

/** Dauer der Bauernmiliz in Sekunden. */
export const MILITIA_DURATION = 12;
/** Elitegegner nehmen von Angriffszaubern nur diesen Anteil. */
export const ELITE_SPELL_FACTOR = 0.5;
