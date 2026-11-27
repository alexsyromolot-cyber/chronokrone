/**
 * Ein einfaches Dialogfenster über dem Spiel – für Bestätigungen (Zeitsprung) und
 * die Feier nach dem Sprung. Eigener Dialog statt window.confirm, damit Ton und Optik passen.
 */
import { esc } from './dom';

export interface ModalButton {
  label: string;
  primary?: boolean;
  onClick?: () => void;
}

export interface ModalOptions {
  title: string;
  lines: string[];
  buttons: ModalButton[];
  /** Zusätzliche CSS-Klasse, z. B. für die Sprung-Feier. */
  variant?: string;
}

export function showModal(opts: ModalOptions): void {
  document.querySelector('.modal-backdrop')?.remove();
  const backdrop = document.createElement('div');
  backdrop.className = `modal-backdrop ${opts.variant ?? ''}`;
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
    <h2>${esc(opts.title)}</h2>
    ${opts.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    <div class="modal-buttons">${opts.buttons
      .map(
        (b, i) =>
          `<button class="btn ${b.primary ? 'primary' : ''}" data-modal="${i}">${esc(b.label)}</button>`,
      )
      .join('')}</div>
  </div>`;
  backdrop.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-modal]');
    if (!btn) return;
    backdrop.remove();
    opts.buttons[Number(btn.dataset.modal)]?.onClick?.();
  });
  document.body.appendChild(backdrop);
  backdrop.querySelector<HTMLButtonElement>('.btn.primary')?.focus();
}
