// Build für die Desktop-App: relative Pfade (BASE_PATH=./), weil Electron die Dateien
// direkt von der Festplatte lädt statt von https://…/chronokrone/.
// Als Node-Skript statt "BASE_PATH=./ vite build", damit es unter Windows und Linux gleich läuft.
import { execSync } from 'node:child_process';

execSync('npx tsc --noEmit', { stdio: 'inherit' });
execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, BASE_PATH: './' } });
