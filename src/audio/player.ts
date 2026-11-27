/**
 * Soundeffekte abspielen und die Musik der Epoche als Schleife takten.
 */
import { SFX, SONGS, type SfxId } from '../data/sounds';
import { audio } from './engine';

/**
 * Gleiche Effekte nicht öfter als alle MIN_GAP Sekunden: Bei 20 Treffern pro Sekunde
 * würde sonst ein unangenehmes Rauschen entstehen (und Rechenzeit kosten).
 */
const MIN_GAP: Partial<Record<SfxId, number>> = {
  hit: 0.06,
  click: 0.03,
  kill: 0.05,
  wallHit: 0.25,
  crit: 0.08,
};
const lastPlayed = new Map<SfxId, number>();

export function sfx(id: SfxId): void {
  const ctx = audio.context;
  if (!ctx) return;
  const gap = MIN_GAP[id] ?? 0;
  const last = lastPlayed.get(id) ?? -Infinity;
  if (ctx.currentTime - last < gap) return;
  lastPlayed.set(id, ctx.currentTime);
  for (const tone of SFX[id]) audio.play(tone);
}

/**
 * Musik: ein kleiner Sequenzer. Er plant immer ein Stück voraus (LOOKAHEAD) und wird
 * regelmäßig aufgerufen – so bleibt der Takt stabil, auch wenn der Browser einmal stockt.
 */
const LOOKAHEAD = 0.25;
let currentSong = 0;
let step = 0;
let nextTime = 0;

const freq = (semitones: number) => 440 * 2 ** (semitones / 12);

export function updateMusic(epoch: number): void {
  const ctx = audio.context;
  if (!ctx) return;
  const songId = SONGS[epoch] ? epoch : 1;
  const song = SONGS[songId]!;
  if (songId !== currentSong) {
    currentSong = songId;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
  }
  const stepLength = 60 / song.bpm / 2; // Achtelnoten
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    const delay = Math.max(0, nextTime - ctx.currentTime);
    const m = song.melody[step % song.melody.length];
    const b = song.bassline[step % song.bassline.length];
    if (m !== null && m !== undefined) {
      audio.play(
        {
          wave: song.lead,
          freq: freq(song.root + m),
          attack: 0.01,
          decay: stepLength * 0.9,
          volume: 0.07,
          delay,
        },
        'music',
      );
    }
    if (b !== null && b !== undefined) {
      audio.play(
        {
          wave: song.bass,
          freq: freq(song.root + b),
          attack: 0.01,
          decay: stepLength * 3.5,
          volume: 0.12,
          delay,
        },
        'music',
      );
    }
    nextTime += stepLength;
    step++;
  }
}
