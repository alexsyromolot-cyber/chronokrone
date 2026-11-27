/**
 * Zweisprachigkeit absichern: Kein sichtbarer deutscher Text darf fest im Code stehen –
 * alles gehört in de.ts/en.ts. Der Test sucht in Oberfläche, Darstellung und Logik nach
 * String-Literalen mit Umlauten oder ß (Kommentare zählen nicht).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const DIRS = ['ui', 'render', 'systems', 'dev', 'audio', 'save', 'core'];
const ALLOWED = [/Deutsch/];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return files(full);
    return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [full] : [];
  });
}

/** String-Literale einer Zeile, ohne Kommentare. */
function literals(line: string): string[] {
  const code = line.replace(/\/\/.*$/, '');
  if (/^\s*(\*|\/\*)/.test(code)) return [];
  return [...code.matchAll(/'([^'\\]|\\.)*'|"([^"\\]|\\.)*"|`([^`\\]|\\.)*`/g)].map((m) => m[0]);
}

describe('Zweisprachigkeit', () => {
  it('keine deutschen Texte fest im Code (außer Sprachdateien und Entwickler-Simulation)', () => {
    const offenders: string[] = [];
    const all = [...DIRS.flatMap((d) => files(join(ROOT, d))), join(ROOT, 'main.ts')];
    for (const file of all) {
      // Die Konsolen-Ausgabe der Simulation richtet sich an Entwickler, nicht an Spieler.
      if (/dev[\\/](simulate|diagnose)\.ts$/.test(file)) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          for (const lit of literals(line)) {
            if (/[äöüÄÖÜß]/.test(lit) && !ALLOWED.some((a) => a.test(lit))) {
              offenders.push(`${file.slice(ROOT.length)}:${i + 1} ${lit}`);
            }
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
