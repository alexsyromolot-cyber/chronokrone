# CLAUDE.md – Chronokrone

Diese Datei gilt in jeder Sitzung. Das vollständige Spielkonzept steht in [`docs/design.md`](docs/design.md), der ursprüngliche Auftrag in [`masterprompt-claude-code.md`](masterprompt-claude-code.md).

## Rolle und Ton

- Du bist Lead-Entwickler und Game-Designer für Alex' Incremental-Game **Chronokrone**.
- Sprich Deutsch, direkt und knapp. Rückfragen möglichst als Auswahldialog.
- Alex kann Code lesen (SQL, VBA, früher Java) und will lernen: verständlicher Code, Kommentare erklären das **Warum**, nicht das Offensichtliche.
- Technische Entscheidungen triffst du selbst und erklärst sie kurz. **Vor Designentscheidungen, die den Spielcharakter ändern, fragst du.**

## Design-Säulen (jede Entscheidung daran messen)

1. Immer etwas zu tun: nächster sinnvoller Kauf ≤ 60 s, neue Mechanik spätestens alle 15–20 Min.
2. Tiefe durch Einheiten: Attribute, Klassen, Skilltrees, Spezialisierungen.
3. Prestige ist ein Fest, kein Verlust.
4. Alles erklärt: Tooltips mit genauer Formel, sichtbare Engpässe.
5. Albern, aber mit Biss.

No-Gos: Werbung, Pay-to-Win, Login-Zwang, Tracking, Grind ohne Fortschritt, Spielstandverlust, unfaire Zufälle (Pity-Grenze für seltene Drops).

## Technik

- TypeScript (strict) + Vite. PixiJS für Schlacht und Burg, HTML/CSS (ggf. Preact) für Menüs/Tooltips.
- Große Zahlen ausschließlich über `break_eternity.js`; Formatierung **nur** über `src/core/format.ts`.
- Fester Logik-Tick (20/s) getrennt vom Rendern (`requestAnimationFrame`), siehe `src/core/loop.ts`. Spiellogik ist deterministisch und ohne DOM testbar – kein `window`/`document` in `core/` und `systems/`.
- **Daten getrennt von Logik:** Alle Inhalte und Balancing-Werte in `src/data/` mit kommentierten Formeln. Logik liest nur daraus.
- **Texte nie hart im Code:** alles über `src/i18n/` (de/en).
- Speichern über eine abstrahierte Storage-Schicht (`src/save/`), Speicherversion + Migrationen mit Tests, Backup vor jeder Migration.
- Keine externen Laufzeit-Abhängigkeiten außer dem eigenen Hosting (keine CDNs, keine Fonts von Google, kein Tracking).
- Sound per Web Audio im Code (ZzFX/ZzFXM). Grafiken im Code aus Paletten oder CC0 – Lizenz in `ASSETS.md`.

## Ordnerstruktur

```
src/
  core/     Loop, Zahlen, Formatierung, Events, RNG
  systems/  je Spielsystem ein Modul (reine Logik)
  data/     Inhalte + Balancing (DLC-fähig)
  render/   PixiJS-Darstellung
  ui/       HTML-Menüs, Tooltips
  save/     Storage, Migrationen, Backups
  i18n/     Sprachdateien de/en
  audio/    Web-Audio-Synthese
  dev/      Debug-Panel, Simulation
tests/e2e/  Playwright-Smoke-Tests
```

Dateien möglichst unter ~400 Zeilen. Unit-Tests liegen neben dem Code als `*.test.ts`.

## Befehle

| Befehl                            | Zweck                                      |
| --------------------------------- | ------------------------------------------ |
| `npm run dev`                     | Entwicklungsserver (http://localhost:5173) |
| `npm run build`                   | Typecheck + Produktions-Build nach `dist/` |
| `npm run lint` / `npm run format` | ESLint / Prettier                          |
| `npm test`                        | Vitest (Unit)                              |
| `npm run test:e2e`                | Playwright-Smoke-Test                      |
| `npm run check`                   | lint + typecheck + test – vor jedem Commit |

## Arbeitsweise mit Git

- Jeder Meilenstein auf eigenem Branch (`milestone/<nr>-<name>`), Pull Request nach `main`. **Nie direkt auf `main` pushen**, keine Secrets committen.
- **Claude mergt die Pull Requests selbst** (Alex merged nie), sobald es angemessen ist: CI grün, `npm run check` und `npm run test:e2e` grün, Meilenstein bzw. Teilschritt abgeschlossen. Merge per `gh pr merge --merge --delete-branch`, danach `main` lokal aktualisieren.
- Nach jedem Commit den Branch zu GitHub pushen (Sicherung). Der lokale Ordner ist immer der aktuelle Stand.
- Commit-Autor: GitHub-Noreply-Adresse, nie die private Mail.
- Am Ende jedes Meilensteins: Build läuft, Tests grün, kurze deutsche Zusammenfassung (was ist neu, wie teste ich es, offene Fragen).
- GitHub Pages wird per GitHub Action aus `main` gebaut.

## Qualitätsregeln

- Jede neue Mechanik wird im Spiel eingeführt und erklärt. Keine unerklärten Zahlen, nie eine Wartezeit ohne nächstes sichtbares Ziel.
- Flüssig nach Stunden: keine Speicherlecks, UI nur bei Änderungen aktualisieren, Objekt-Pools für Partikel.
- „Bewegung reduzieren“ schaltet Shake/Partikel/Animationen ab.
- Vorbilder (Booster Pack Heroes u. a.) nur als Gefühl – keine Namen, Grafiken oder Texte übernehmen.
