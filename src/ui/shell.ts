/**
 * Die Hülle um beide Szenen: zeigt Arena oder Dorf und spielt beim Wechsel den Tor-Übergang.
 *
 * Ablauf: Tor schließt sich (ca. 0,6 s), dahinter wird die Szene getauscht, Tor öffnet sich
 * wieder. Der Wechsel passiert also nie sichtbar. Mit „Bewegung reduzieren“: harter Schnitt.
 * Die Phase selbst bestimmt die Logik (systems/scene.ts) – die Hülle läuft ihr nur hinterher.
 */
import { t } from '../i18n';
import type { Phase } from '../systems/scene';

const CLOSE_MS = 650;
const OPEN_MS = 650;

export class Shell {
  private shown: Phase | null = null;
  private busy = false;

  constructor(
    private readonly app: HTMLElement,
    private readonly gate: HTMLElement,
  ) {}

  get phase(): Phase | null {
    return this.shown;
  }

  /** Einmal pro Frame aufrufen. `onSwap` rendert die neue Szene, solange das Tor zu ist. */
  sync(phase: Phase, reducedMotion: boolean, onSwap: () => void): void {
    if (this.busy || phase === this.shown) return;
    // Beim Laden ohne Übergang direkt in die richtige Szene.
    if (this.shown === null || reducedMotion) {
      this.swap(phase);
      onSwap();
      return;
    }
    this.busy = true;
    const text = this.gate.querySelector<HTMLElement>('.gate-text');
    if (text) text.textContent = t(phase === 'battle' ? 'gate.toWall' : 'gate.toVillage');
    this.gate.classList.remove('opening');
    this.gate.classList.add('closing');
    window.setTimeout(() => {
      this.swap(phase);
      onSwap();
      this.gate.classList.remove('closing');
      this.gate.classList.add('opening');
      window.setTimeout(() => {
        this.gate.classList.remove('opening');
        this.busy = false;
      }, OPEN_MS);
    }, CLOSE_MS);
  }

  private swap(phase: Phase): void {
    this.shown = phase;
    this.app.dataset.phase = phase;
    document.querySelector<HTMLElement>('#arena')!.hidden = phase !== 'battle';
    document.querySelector<HTMLElement>('#village')!.hidden = phase !== 'village';
  }
}
