/**
 * Tooltips mit Formeln. Jedes Element mit `data-tip` bekommt beim Überfahren ein Kästchen.
 * Ein einziges Tooltip-Element für alles, per Event-Delegation – funktioniert auch,
 * wenn Panels ihr HTML neu schreiben.
 */
export function installTooltips(box: HTMLElement): void {
  let current: HTMLElement | null = null;

  const place = (x: number, y: number) => {
    const pad = 14;
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    const left = Math.min(x + pad, window.innerWidth - w - 8);
    const top = y + pad + h > window.innerHeight ? y - h - pad : y + pad;
    box.style.left = `${Math.max(8, left)}px`;
    box.style.top = `${Math.max(8, top)}px`;
  };

  document.addEventListener('pointermove', (e) => {
    const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tip]') ?? null;
    if (target !== current) {
      current = target;
      if (target) {
        box.textContent = target.dataset.tip ?? '';
        box.hidden = false;
      } else {
        box.hidden = true;
      }
    } else if (target && box.textContent !== target.dataset.tip) {
      // Inhalt aktualisieren, wenn sich die Zahlen unter dem Mauszeiger geändert haben.
      box.textContent = target.dataset.tip ?? '';
    }
    if (!box.hidden) place(e.clientX, e.clientY);
  });
  document.addEventListener('pointerleave', () => {
    box.hidden = true;
    current = null;
  });
}
