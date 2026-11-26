# Chronokrone

Ein Incremental-Game: Ein Meteor schlägt ein, technisch überlegene, alberne Aliens greifen ein Mittelalterreich an. Als König wehrst du sie in kurzen Abwehrschlachten ab, baust deine Burg aus, trainierst Truppen und Sammler und baust aus Alien-Schrott eine Zeitmaschine, um in die nächste Epoche zu springen.

Keine Werbung, kein Tracking, kein Login. Läuft im Browser.

**Spielen:** https://&lt;github-user&gt;.github.io/chronokrone/ (wird nach dem ersten Merge auf `main` veröffentlicht)

## Entwickeln

Voraussetzung: Node.js 22 oder neuer.

```sh
npm install
npm run dev        # http://localhost:5173
npm run check      # Lint, Typen, Format, Unit-Tests
npm run test:e2e   # Playwright-Smoke-Test (einmalig: npx playwright install chromium)
npm run build      # Produktions-Build nach dist/
```

- Spielkonzept: [`docs/design.md`](docs/design.md)
- Regeln für die Entwicklung: [`CLAUDE.md`](CLAUDE.md)
- Grafik- und Sound-Lizenzen: [`ASSETS.md`](ASSETS.md)
