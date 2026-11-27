/**
 * Ressourcen von Epoche 1.
 *
 * Grundrohstoffe werden produziert (Holz, Stein, Erz, Kräuter, Wissen), Zwischenprodukte
 * in Rezept-Gebäuden umgewandelt (Bretter, Eisen, Stahl, Zaubertinte, Schriftrollen, Chips).
 *
 * Lagerlimit-Formel:  Limit = baseCap × capGrowth^(Bergfried-Level − 1) × (1 + 0,25 × Lagerhaus-Level)
 * Warum Limits? Sie erzeugen Entscheidungen („ausgeben oder Lager ausbauen?“)
 * und verhindern, dass man stundenlang wartet und dann alles auf einmal kauft.
 */

export const RESOURCE_IDS = [
  'gold',
  'wood',
  'stone',
  'scrap',
  'knowledge',
  'ore',
  'herbs',
  'planks',
  'iron',
  'steel',
  'ink',
  'scrolls',
  'chips',
  // Epoche 2: Dampf & Zahnrad
  'coal',
  'gears',
] as const;
export type ResourceId = (typeof RESOURCE_IDS)[number];

export interface ResourceDef {
  /** Lagerlimit bei Bergfried-Level 1. */
  baseCap: number;
  /** Faktor pro weiterem Bergfried-Level. */
  capGrowth: number;
  /** Farbe für Zahlen und Balken (Palette Epoche 1). */
  color: string;
}

export const RESOURCES: Record<ResourceId, ResourceDef> = {
  gold: { baseCap: 250, capGrowth: 1.8, color: '#f2b33d' },
  wood: { baseCap: 150, capGrowth: 1.8, color: '#c08a50' },
  stone: { baseCap: 150, capGrowth: 1.8, color: '#b8bccb' },
  // Schrott ist selten und wertvoll – kleines Lager, damit er nicht gehortet wird.
  scrap: { baseCap: 40, capGrowth: 1.5, color: '#6ee0c8' },
  knowledge: { baseCap: 100, capGrowth: 1.9, color: '#9fb7ff' },
  ore: { baseCap: 120, capGrowth: 1.8, color: '#a0766a' },
  herbs: { baseCap: 120, capGrowth: 1.8, color: '#7ed37e' },
  planks: { baseCap: 80, capGrowth: 1.8, color: '#e0b070' },
  iron: { baseCap: 60, capGrowth: 1.8, color: '#9aa3b5' },
  steel: { baseCap: 40, capGrowth: 1.8, color: '#d8e0ef' },
  ink: { baseCap: 40, capGrowth: 1.8, color: '#b07ae0' },
  scrolls: { baseCap: 25, capGrowth: 1.7, color: '#f0e0b0' },
  chips: { baseCap: 25, capGrowth: 1.7, color: '#5fe0a0' },
  coal: { baseCap: 200, capGrowth: 1.8, color: '#6a6a72' },
  gears: { baseCap: 40, capGrowth: 1.8, color: '#d9a15a' },
};

/** Kosten-/Ertragsangabe: welche Ressource wie viel. */
export type ResourceAmounts = Partial<Record<ResourceId, number>>;

/** Lagerhaus: +Anteil auf alle Lagerlimits je Level. */
export const STOREHOUSE_CAP_BONUS = 0.25;
