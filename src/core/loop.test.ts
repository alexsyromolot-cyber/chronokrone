import { describe, expect, it } from 'vitest';
import { FixedStepLoop } from './loop';

describe('FixedStepLoop', () => {
  it('führt bei 20 Ticks/s pro Sekunde genau 20 Ticks aus, unabhängig von der Frame-Größe', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(() => ticks++);
    // 60 FPS ≈ 16,67 ms pro Frame
    for (let i = 0; i < 60; i++) loop.advance(1000 / 60);
    expect(ticks).toBe(20);
  });

  it('übergibt immer dieselbe Delta-Zeit', () => {
    const deltas = new Set<number>();
    const loop = new FixedStepLoop((dt) => deltas.add(dt));
    loop.advance(37);
    loop.advance(500);
    loop.advance(3);
    expect([...deltas]).toEqual([0.05]);
  });

  it('merkt sich Restzeit zwischen Frames', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(() => ticks++);
    loop.advance(30);
    expect(ticks).toBe(0);
    loop.advance(30);
    expect(ticks).toBe(1);
    expect(loop.alpha).toBeCloseTo(0.2);
  });

  it('beschleunigt mit dem Speed-Faktor', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(() => ticks++);
    loop.speed = 100;
    loop.advance(1000);
    expect(ticks).toBe(250); // gedeckelt durch maxTicksPerAdvance
  });

  it('verwirft Rückstand nach einem langen Hänger statt in die Todesspirale zu laufen', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(() => ticks++, { maxTicksPerAdvance: 10 });
    loop.advance(60_000);
    expect(ticks).toBe(10);
    loop.advance(50);
    expect(ticks).toBe(11);
  });

  it('spult mit fastForward exakt vor', () => {
    let ticks = 0;
    const loop = new FixedStepLoop(() => ticks++);
    expect(loop.fastForward(3600)).toBe(72_000);
    expect(ticks).toBe(72_000);
    expect(loop.ticks).toBe(72_000);
  });
});
