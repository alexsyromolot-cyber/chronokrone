/**
 * Stromnetz (Epoche 3 „Elektro-Lehnswesen“).
 *
 * Kraftwerke verbrennen Kohle und liefern Strom. Kraftwerke und Strommasten leiten ihn über das
 * Raster weiter: Masten, die (über andere Masten) an ein Kraftwerk grenzen, gehören zum Netz.
 * Jedes Gebäude, das an einen Teil des Netzes grenzt, ist angeschlossen.
 *
 *   Angebot   = Σ Kraftwerk: supplyPerLevel × Level × Meilenstein × Brennstoff-Anteil
 *   Nachfrage = Σ angeschlossene Gebäude: demandPerLevel × Level
 *   Versorgung = min(1, Angebot / Nachfrage)
 *   Bonus eines angeschlossenen Gebäudes = maxBonus × Versorgung   (wirkt multiplikativ)
 *
 * Warum so? Es gibt eine echte Raster-Entscheidung (wo stehen Masten, was hängt am Netz) und eine
 * einfache Abwägung (mehr Gebäude anschließen senkt die Versorgung, bis das Kraftwerk wächst).
 */
import type { BuildingId } from './buildings';

export const POWER = {
  /** Kohle pro Sekunde und Kraftwerks-Level. Ohne Kohle kein Strom. */
  coalPerLevel: 0.5,
  supplyPerLevel: 3,
  demandPerLevel: 1,
  /** Voll versorgt: Produktion ×2. */
  maxBonus: 1,
  /** Diese Gebäude leiten Strom weiter (und verbrauchen selbst keinen). */
  conductors: ['powerPlant', 'pylon'] as BuildingId[],
} as const;
