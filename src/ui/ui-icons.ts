/**
 * Pixel-Icons der Oberfläche aus `npm run sprites` (src/assets/ui/*.png).
 * Vite sammelt alle Dateien beim Build ein; im Code genügt der Name, z. B. 'res-gold'.
 */
const files = import.meta.glob<string>('../assets/ui/*.png', { eager: true, import: 'default' });

const byName = new Map(
  Object.entries(files).map(([path, url]) => [path.replace(/^.*\/(.+)\.png$/, '$1'), url]),
);

/** URL eines Icons oder null, wenn es (noch) keins gibt – dann zeigt der Aufrufer einen Ersatz. */
export function uiIcon(name: string): string | null {
  return byName.get(name) ?? null;
}
