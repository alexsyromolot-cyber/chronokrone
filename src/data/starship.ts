/**
 * Raumschiff-Raster und Sammlung „Komplettierung“ (Epoche 5 „Sternenorden“).
 *
 * Raumschiff-Raster (ab Epoche 5): Die Burg ist jetzt ein Schiff. Ein Modul (jedes Gebäude)
 * arbeitet nur, wenn es über eine lückenlose Kette bebauter Felder (oben/unten/links/rechts)
 * mit der Brücke (dem Bergfried) verbunden ist. Abgetrennte Module „treiben im All“ und
 * produzieren nichts. Hüllensegmente sind billige Verbindungsstücke.
 *
 * Neon-Rosetten (Kirchenfenster): Licht fällt durch die ganze Zeile und Spalte.
 *   Bonus eines Moduls = rosettePerLevel × Σ Level aller Rosetten in seiner Zeile oder Spalte
 * Die Rosette selbst und die Brücke bekommen nichts. Abgetrennte Rosetten leuchten nicht.
 */
export const STARSHIP = {
  fromEpoch: 5,
  rosettePerLevel: 0.06,
} as const;

/**
 * Komplettierung: Wie vollständig sind alle Sammlungen zusammen?
 *   Anteil = Durchschnitt der Anteile (Erfolge, Bestiarium, Begleiter, Karten, Relikte, Chronik)
 *   Bonus  = Anteil × maxBonus auf Produktion und Schaden
 * Wirkt ab Epoche 5 (und in jeder Zeitschleife) – vorher wäre sie zu früh zu stark.
 */
export const COMPLETION = {
  fromEpoch: 5,
  maxBonus: 0.5,
} as const;
