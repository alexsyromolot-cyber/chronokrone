/**
 * Meldungen als kleine Karten oben rechts (Erfolge, Funde, Hinweise). Sie verschwinden von selbst;
 * es stehen höchstens MAX gleichzeitig da, die älteste fliegt zuerst.
 */
import { esc } from './dom';
import { uiIcon } from './ui-icons';

const MAX = 4;
const LIFETIME_MS = 3500;

export type ToastKind = 'info' | 'good' | 'bad' | 'achievement';

export function pushToast(text: string, kind: ToastKind = 'info'): void {
  const box = document.querySelector<HTMLElement>('#toasts');
  if (!box) return;
  const card = document.createElement('div');
  card.className = `toast-card ${kind}`;
  // Erfolge tragen ein Wachssiegel – wie eine königliche Urkunde.
  const seal = kind === 'achievement' ? uiIcon('seal') : null;
  card.innerHTML = `${seal ? `<img class="seal" src="${seal}" alt="">` : ''}<span>${esc(text)}</span>`;
  box.appendChild(card);
  while (box.children.length > MAX) box.firstElementChild?.remove();
  window.setTimeout(() => {
    card.classList.add('leaving');
    window.setTimeout(() => card.remove(), 300);
  }, LIFETIME_MS);
}
