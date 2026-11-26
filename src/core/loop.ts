/**
 * Fester Logik-Takt, entkoppelt vom Rendern.
 *
 * Warum so? Bildschirme laufen mit 60, 144 oder schwankenden FPS. Würde die
 * Spiellogik pro Frame rechnen, liefe das Spiel auf schnellen Monitoren schneller
 * und Ergebnisse wären nicht reproduzierbar. Stattdessen sammeln wir die echte
 * vergangene Zeit in einem "Akkumulator" und arbeiten sie in exakt gleich großen
 * Ticks ab (Standard 20/s = 50 ms). Gleiche Eingaben → gleiche Ticks → gleiches Ergebnis.
 *
 * Diese Klasse kennt weder DOM noch requestAnimationFrame – der Aufrufer füttert
 * sie mit Millisekunden. Dadurch können Tests und `npm run simulate` sie direkt nutzen.
 */

export interface LoopOptions {
  /** Logik-Ticks pro Sekunde. */
  ticksPerSecond?: number;
  /**
   * Obergrenze an Ticks pro `advance`-Aufruf. Verhindert die "Todesspirale":
   * War der Tab lange eingefroren, würde sonst ein einziger Frame tausende Ticks
   * nachholen, dabei wieder zu lange brauchen, und so weiter.
   */
  maxTicksPerAdvance?: number;
}

export type TickHandler = (dtSeconds: number, tick: number) => void;

export class FixedStepLoop {
  readonly ticksPerSecond: number;
  readonly tickSeconds: number;
  private readonly tickMs: number;
  private readonly maxTicksPerAdvance: number;
  private accumulatorMs = 0;
  private tickCount = 0;
  /** Zeitbeschleuniger für das Debug-Panel (1× bis 100×). */
  speed = 1;

  constructor(
    private readonly onTick: TickHandler,
    options: LoopOptions = {},
  ) {
    this.ticksPerSecond = options.ticksPerSecond ?? 20;
    this.tickSeconds = 1 / this.ticksPerSecond;
    this.tickMs = 1000 / this.ticksPerSecond;
    // Bei 100× Speed und 60 FPS fallen pro Frame ~33 Ticks an; 250 lässt Luft.
    this.maxTicksPerAdvance = options.maxTicksPerAdvance ?? 250;
  }

  /** Anzahl bisher ausgeführter Logik-Ticks. */
  get ticks(): number {
    return this.tickCount;
  }

  /**
   * Anteil (0–1), wie weit wir zwischen zwei Ticks stehen. Der Renderer nutzt das,
   * um Positionen zu interpolieren, damit Bewegung trotz 20 Ticks/s flüssig wirkt.
   */
  get alpha(): number {
    return this.accumulatorMs / this.tickMs;
  }

  /**
   * Echte vergangene Zeit einspeisen und fällige Ticks ausführen.
   * @returns Anzahl der in diesem Aufruf ausgeführten Ticks.
   */
  advance(realDeltaMs: number): number {
    if (realDeltaMs <= 0) return 0;
    this.accumulatorMs += realDeltaMs * this.speed;

    let ran = 0;
    while (this.accumulatorMs >= this.tickMs && ran < this.maxTicksPerAdvance) {
      this.tickCount++;
      this.onTick(this.tickSeconds, this.tickCount);
      this.accumulatorMs -= this.tickMs;
      ran++;
    }

    // Nicht nachholbare Rückstände verwerfen statt ewig mitzuschleppen.
    // Kein Fortschrittsverlust im Sinne des Designs: Offline-Produktion gibt es ohnehin nicht.
    if (ran === this.maxTicksPerAdvance) this.accumulatorMs = 0;
    return ran;
  }

  /**
   * Exakt `seconds` Spielzeit vorspulen, ohne Tick-Obergrenze.
   * Für "1 Stunde vorspulen" im Debug-Panel und für die Simulation.
   */
  fastForward(seconds: number): number {
    const ticks = Math.floor(seconds * this.ticksPerSecond);
    for (let i = 0; i < ticks; i++) {
      this.tickCount++;
      this.onTick(this.tickSeconds, this.tickCount);
    }
    return ticks;
  }
}
