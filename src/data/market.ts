/**
 * Markt (Epoche 2): Rohstoffe gegen Gold handeln, Preise schwanken.
 *
 * Preisbewegung alle PRICE_STEP Sekunden:
 *   neuer Preis = Preis × e^(Zufall ±VOLATILITY) und zieht um REVERSION zurück zum Grundpreis
 * So gibt es Hochs und Tiefs, aber kein Davonlaufen. Kaufen kostet etwas mehr, Verkaufen
 * bringt etwas weniger (Spanne), damit Hin-und-her-Handel kein Gelddrucken ist.
 * Gehandelt wird immer 10 % (Verkauf: des Vorrats, Kauf: des Lagerplatzes).
 */
import type { ResourceId } from './resources';

/** Grundpreis in Gold je Einheit. Gold selbst wird nicht gehandelt. */
export const BASE_PRICES: Partial<Record<ResourceId, number>> = {
  wood: 1,
  stone: 1.2,
  ore: 2,
  herbs: 1.5,
  planks: 3,
  iron: 6,
  coal: 2.5,
  steel: 15,
  ink: 8,
  gears: 25,
};

export const MARKET = {
  priceStep: 10,
  volatility: 0.12,
  reversion: 0.1,
  /** Spanne: Kauf zum Preis × (1 + spread), Verkauf zum Preis × (1 − spread). */
  spread: 0.1,
  /** Anteil, der pro Handel bewegt wird. */
  tradeShare: 0.1,
  /** So viele Preise je Rohstoff merkt sich der Markt für die Mini-Kurve. */
  history: 30,
} as const;
