import { defineConfig } from 'vitest/config';

// GitHub Pages liefert das Spiel unter https://<user>.github.io/chronokrone/ aus.
// Deshalb braucht der Produktions-Build diesen Unterpfad als Basis; lokal bleibt es "/".
// Über BASE_PATH lässt sich das überschreiben (z. B. "./" für die spätere Electron-App).
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS ? '/chronokrone/' : '/');

export default defineConfig({
  base,
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    include: ['src/**/*.test.ts'],
    // Spiellogik soll ohne DOM laufen – "node" stellt sicher, dass sich kein
    // versehentlicher window/document-Zugriff in core/ oder systems/ einschleicht.
    environment: 'node',
  },
});
