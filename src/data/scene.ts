/**
 * Szenen: Kampfphase und Dorfphase (UI-Umbau, Etappe 1).
 *
 * Kampfphase = eine Schlacht läuft ODER ihr Ergebnisfenster ist noch offen.
 * Dorfphase  = sonst. Im Dorf läuft nie eine Schlacht; die Produktion läuft immer.
 *
 * Hofbefehle mit der Aktion „Schlacht starten“ starten keinen Kampf im Hintergrund,
 * sondern einen sichtbaren Countdown im Dorf. Danach öffnet sich das Tor.
 */
export const SCENE = {
  /** Sekunden zwischen Hofbefehl „Schlacht starten“ und dem Aufbruch zur Mauer. */
  orderCountdown: 10,
} as const;
