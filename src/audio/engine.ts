/**
 * Audio-Engine auf Web Audio. Alle Klänge entstehen im Code – keine Fremd-Audiodateien,
 * keine Lizenzfragen.
 *
 * Aufbau:  Klangquellen → Effekte-Bus ┐
 *                       → Musik-Bus   ┴→ Master → Lautsprecher
 * Browser erlauben Audio erst nach einer Nutzeraktion; deshalb entsteht der AudioContext
 * beim ersten Klick bzw. Tastendruck. Im Hintergrund-Tab wird alles stumm geschaltet.
 */

export interface Tone {
  /** Wellenform des Oszillators oder Rauschen. */
  wave: OscillatorType | 'noise';
  freq: number;
  /** Zielfrequenz am Ende (Glissando), optional. */
  slideTo?: number;
  attack: number;
  decay: number;
  volume: number;
  /** Verzögerung ab jetzt in Sekunden (für kleine Melodien). */
  delay?: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noise: AudioBuffer | null = null;
  private volumes = { sfx: 0.6, music: 0.35 };
  private hidden = false;

  /** Beim ersten Nutzerereignis aufrufen; danach ist Audio verfügbar. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.master);
    this.musicBus.connect(this.master);
    this.master.connect(this.ctx.destination);
    // Eine Sekunde weißes Rauschen, wiederverwendet für Treffer und Explosionen.
    this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.apply();
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get music(): GainNode | null {
    return this.ctx ? this.musicBus : null;
  }

  setVolumes(sfx: number, music: number): void {
    this.volumes = { sfx, music };
    this.apply();
  }

  /** Stumm im Hintergrund-Tab (Konzept: „stumm im Hintergrund-Tab“). */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.apply();
  }

  private apply(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.hidden ? 0 : 1, now, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volumes.sfx, now, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volumes.music, now, 0.05);
  }

  /** Einen kurzen Ton spielen. `bus` = Effekte oder Musik. */
  play(tone: Tone, bus: 'sfx' | 'music' = 'sfx'): void {
    const ctx = this.ctx;
    if (!ctx || this.hidden) return;
    const start = ctx.currentTime + (tone.delay ?? 0);
    const end = start + tone.attack + tone.decay;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, tone.volume), start + tone.attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    gain.connect(bus === 'sfx' ? this.sfxBus : this.musicBus);

    let source: AudioScheduledSourceNode;
    if (tone.wave === 'noise' && this.noise) {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      // Rauschen über einen Bandpass „stimmen“, damit es nach Schlag statt Zischen klingt.
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(tone.freq, start);
      if (tone.slideTo) filter.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
      src.connect(filter);
      filter.connect(gain);
      source = src;
    } else {
      const osc = ctx.createOscillator();
      osc.type = tone.wave === 'noise' ? 'square' : tone.wave;
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
      osc.connect(gain);
      source = osc;
    }
    source.start(start);
    source.stop(end + 0.02);
  }
}

export const audio = new AudioEngine();
