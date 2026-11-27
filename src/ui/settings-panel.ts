/**
 * Einstellungen: Sprache, Schriftgröße, Bewegung reduzieren, Lautstärken, Autosave,
 * dazu die Liste aller Tastenkürzel. Einstellungen sind keine Spielaktionen und werden
 * direkt in state.settings geschrieben (und mit dem Spielstand gespeichert).
 */
import { t } from '../i18n';
import type { Settings } from '../systems/state';
import { esc } from './dom';

export const SHORTCUTS: [string, string][] = [
  ['Leertaste', 'keys.battle'],
  ['1 – 3', 'keys.spells'],
  ['R', 'keys.retreat'],
  ['S', 'keys.save'],
  ['M', 'keys.mute'],
  ['O', 'keys.settings'],
  ['Esc', 'keys.close'],
  ['Strg + Umschalt + D', 'keys.debug'],
];

const range = (key: keyof Settings, value: number, min: number, max: number, step: number) =>
  `<input type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${value}">`;

export function settingsHtml(s: Settings): string {
  const autosave = [5, 10, 30, 60, 120]
    .map((v) => `<option value="${v}" ${v === s.autosaveSeconds ? 'selected' : ''}>${v} s</option>`)
    .join('');
  const keys = SHORTCUTS.map(
    ([key, label]) =>
      `<tr><th><kbd>${esc(key === 'Leertaste' ? t('keys.space') : key)}</kbd></th><td>${esc(t(label as 'keys.battle'))}</td></tr>`,
  ).join('');
  return `<h3>${esc(t('settings.title'))}</h3>
    <label>${esc(t('settings.language'))}
      <select data-setting="locale"><option value="de" ${s.locale === 'de' ? 'selected' : ''}>Deutsch</option><option value="en" ${s.locale === 'en' ? 'selected' : ''}>English</option></select>
    </label>
    <label>${esc(t('settings.fontScale', { pct: Math.round(s.fontScale * 100) }))} ${range('fontScale', s.fontScale, 0.85, 1.4, 0.05)}</label>
    <label><input type="checkbox" data-setting="reducedMotion" ${s.reducedMotion ? 'checked' : ''}> ${esc(t('settings.reducedMotion'))}</label>
    <label>${esc(t('settings.sfx', { pct: Math.round(s.sfxVolume * 100) }))} ${range('sfxVolume', s.sfxVolume, 0, 1, 0.05)}</label>
    <label>${esc(t('settings.music', { pct: Math.round(s.musicVolume * 100) }))} ${range('musicVolume', s.musicVolume, 0, 1, 0.05)}</label>
    <label>${esc(t('settings.autosave'))} <select data-setting="autosaveSeconds">${autosave}</select></label>
    <h3 class="sub">${esc(t('settings.keys'))}</h3>
    <table class="stats-table keys">${keys}</table>
    <div class="modal-buttons"><button class="btn primary" data-settings-close>${esc(t('settings.close'))}</button></div>`;
}

/** Wert eines geänderten Bedienelements in die Einstellungen übernehmen. */
export function applySetting(s: Settings, el: HTMLInputElement | HTMLSelectElement): void {
  const key = el.dataset.setting as keyof Settings;
  switch (key) {
    case 'reducedMotion':
      s.reducedMotion = (el as HTMLInputElement).checked;
      break;
    case 'locale':
      s.locale = el.value === 'en' ? 'en' : 'de';
      break;
    case 'fontScale':
    case 'sfxVolume':
    case 'musicVolume':
    case 'autosaveSeconds':
      s[key] = Number(el.value);
      break;
  }
}
