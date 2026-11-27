/**
 * Ressourcen von Epoche 1 (Vertical Slice). Weitere (Wissen, Eisen …) kommen in Meilenstein 3.
 *
 * Lagerlimit-Formel:  Limit = baseCap × capGrowth^(Bergfried-Level − 1)
 * Warum Limits? Sie erzeugen Entscheidungen („ausgeben oder Lager ausbauen?“)
 * und verhindern, dass man stundenlang wartet und dann alles auf einmal kauft.
 */

export const RESOURCE_IDS = ['gold', 'wood', 'stone', 'scrap'] as const;
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
  wood: { baseCap: 150, capGrowth: 1.8, color: '#b07a45' },
  stone: { baseCap: 150, capGrowth: 1.8, color: '#a3a7b8' },
  // Schrott ist selten und wertvoll – kleines Lager, damit er nicht gehortet wird.
  scrap: { baseCap: 40, capGrowth: 1.5, color: '#6ee0c8' },
};

/** Kosten-/Ertragsangabe: welche Ressource wie viel. */
export type ResourceAmounts = Partial<Record<ResourceId, number>>;
