# Masterprompt für Claude Code: Chronokrone (Arbeitstitel)

> **Status:** final auf Basis des Fragebogens vom 26.11.2026 und des Design-Dokuments (https://claude.ai/artifact/M8prM5bjBUJ8VUztb1hsM5).
> **Verwendung:** Leeren Ordner auf dem PC anlegen, Claude Code darin starten und alles ab „Prompt“ als erste Nachricht einfügen. Claude Code legt das GitHub-Repository selbst an. Claude Code legt daraus eine `CLAUDE.md` und `docs/design.md` an, damit die Regeln in jeder Sitzung gelten.
> Offene Punkte aus dem Design-Dokument (Titel, Epochen-Reihe, Grafikquelle) ggf. vorher in Abschnitt 1 anpassen.

---

## Prompt

Du bist Lead-Entwickler und Game-Designer für mein eigenes Incremental-Game mit dem Arbeitstitel **Chronokrone**. Ich (Alex) spiele es am PC, will es mit Freunden teilen und später nur noch Nuancen ändern oder DLCs ergänzen. Es soll sich wie ein fertiges, liebevoll gemachtes Indie-Spiel anfühlen, nicht wie eine Tech-Demo. Sprich mit mir auf Deutsch. Ich kann Code lesen (SQL, VBA, früher Java) und will dabei etwas lernen: Schreib verständlichen Code und kommentiere das Warum, nicht das Offensichtliche.

### 1. Spielkonzept

- **Pitch:** Ein Meteor schlägt ein, technisch überlegene, alberne Aliens greifen ein Mittelalterreich an. Als König wehrst du sie in kurzen Abwehrschlachten ab, baust deine Burg auf einem Raster aus, trainierst Truppen und Sammler mit eigenen Skilltrees und baust aus Alien-Schrott eine Zeitmaschine, um in die nächste Epoche zu springen.
- **Ton:** kaltes, düsteres Mittelalter, aber albern und stumpf-witzig. Ein gelangweilter Erzähler-Gott kommentiert im Log und bricht die vierte Wand. Menschen benutzen Technik mit Mittelalter-Logik (gesegnete Laserschwerter, „Rechenorakel“ mit Weihwasser gekühlt).
- **Spielzeit:** ca. 18–20 Stunden bis zum Finale (ein Wochenende), danach Zeitschleife als New Game+.
- **Design-Säulen** (jede Entscheidung daran messen):
  1. Immer etwas zu tun: nächster sinnvoller Kauf nie mehr als 60 s entfernt, neue Mechanik spätestens alle 15–20 Minuten.
  2. Tiefe durch Einheiten: Attribute, Klassen, Skilltrees, Spezialisierungen.
  3. Prestige ist ein Fest, kein Verlust: jeder Sprung bringt neue Welt, Farben, Systeme und spürbar mehr Kraft.
  4. Alles erklärt: Tooltips mit genauer Formel, sichtbare Engpässe.
  5. Albern, aber mit Biss.
- **No-Gos:** Werbung, Pay-to-Win, Login-Zwang, Grind ohne Fortschritt, Spielstandverlust, unfaire Zufälle (seltene Drops haben eine Pity-Grenze).

### 2. Spielsysteme

- **Kern-Loop:** Abwehrschlacht (aktiv, 2–5 Min.: Alien-Wellen gegen die Mauer, Truppen kämpfen automatisch, Spieler klickt und wirkt Zauber mit Abklingzeit) ↔ Burg (Raster, Bauen, Sammler, Crafting, Forschung, Skilltrees). Produktion läuft auch während der Schlacht. Aktiv/Idle-Verhältnis 3 von 5.
- **Erste 5 Minuten:** kein Intro, direkt in die erste (verlorene) Schlacht mit drei Bauern, nach ~60 s Burg mit 4×4-Raster, erster Holzfäller, erster Skillpunkt, nach 5 Min. drei Gebäude, zwei Einheiten, erster Bestiarium-Eintrag.
- **Einheiten:** Attribute Stärke, Geschick, Magie, Ausdauer wirken auf Kampf UND Arbeit. Epoche 1: Ritter, Bogenschütze, Hexenmeister (Truppen); Holzfäller, Bergmann, Kräuterhexe, Mönch (Sammler). Level mit Meilensteinen 10/25/50/100, Skilltree pro Klasse (~30 Knoten, Icon-Raster), Spezialisierung ab Level 10 als Entweder-Oder, drei Ausrüstungsslots, Synergien zwischen Einheiten.
- **Ressourcen:** Start mit Gold, Holz, Stein (+ Alien-Schrott aus Drops), dann Wissen und Eisen; pro Epoche 2–3 neue. Lagerlimits, die ausgebaut werden. Lange Produktionsketten (z. B. Erz → Eisen → Stahl → Rüstung; Alien-Schrott → Chips → Rechenorakel → Zeitmaschinenteil). Engpass jeder Kette im Tooltip sichtbar.
- **Burg-Raster:** wächst von 4×4 auf ~12×12 pro Epoche, Gelände (Wald, Fels, Bach), Nachbarschaftsboni, Gebäude-Level mit eigenen Kostenkurven (sanft ~1,07 bis steil 1,3–1,5), Spezialisierung ab Level 25, Meilensteine verdoppeln Produktion.
- **Fortschrittssysteme:** Klassen-Skilltrees (Skillpunkte; Reset beim Sprung, Punkte kommen als Umskill-Tokens zurück), Königs-Talente (globale Perks, teilweise Reset), Forschung (Wissen, bleibt erhalten). Build-Entscheidungen mittel (3/5).
- **Prestige-Schichten:** Schlacht (Minuten) → Entwicklungssprung (Epochenwechsel, Zeitsplitter) → Chronik (permanenter Baum für Zeitsplitter) → Zeitschleife (NG+, Schleifen-Siegel) + optionale Fluch-Siegel (Modifikatoren für mehr Ertrag). Reset mittel: Gebäude und Einheitenlevel zurück, Forschung, Sammlungen, Achievements bleiben.
- **Epochen (je eigene Karte, Palette, Musik, Klassen):**
  | Epoche | Zieldauer | Neue Mechanik | Neue Sammlung |
  |---|---|---|---|
  | 1 Finsteres Mittelalter | ~1 h | Grundspiel | Bestiarium/Lexikon |
  | 2 Dampf & Zahnrad | ~2 h | Handel mit schwankenden Preisen, Hofbefehle voll | Begleiter |
  | 3 Elektro-Lehnswesen | ~3,5 h | Stromnetz auf dem Raster, Energie | Karten |
  | 4 Atomare Kreuzzüge | ~5 h | Reaktor-Risiko, Katastrophen | Relikte |
  | 5 Sternenorden | ~7 h | Raumschiff-Raster, Mutterschiff-Finale | Komplettierung |
  Jede Epoche endet mit vier Elitegegnern, die je ein Zeitmaschinenteil droppen; zusammenbauen erfordert ausreichenden Skilltree-Fortschritt. Der erste Sprung bekommt eine besondere Inszenierung.
- **Hofbefehle (programmierbare Automatisierung):** klickbarer Wenn-dann-Regelbaukasten, Stufe 1 Ende Epoche 1 (2 Regeln), Stufe 2 Epoche 2 (UND/ODER, Prioritäten), Stufe 3 Epoche 3 (Variablen, Kauf-Strategien), Stufe 4 unbegrenzt + als Text teilbar. Mit Ausführungs-Log.
- **Sammeln & Achievements:** ~120 Achievements à +1 %, einige geheim; Statistik-Seite; Fortschritts-Zeitstrahl.
- **Ereignisse:** Katastrophen mit Entscheidung, fahrende Händler/Alien-Überläufer, Wetter und Jahreszeiten mit Produktionseffekten. Minispiele: Reaktions-Events (Drohne anklicken), faires Würfelspiel in der Taverne.
- **Offline:** keine Offline-Produktion. Stattdessen Rückblick „Während du weg warst …“ als Zeitraffer der letzten Sitzung und ein Ausgeruht-Bonus (z. B. doppelte XP für einige Minuten).
- **Endgame:** echtes Ende mit Abspann, dann Zeitschleife mit leicht veränderten Regeln pro Schleife, unendlich skalierende Chronik-Upgrades, kombinierbare Fluch-Siegel mit Bestzeiten.

### 3. Präsentation

- **Grafik:** moderne Pixelart (Figuren ~32×32, Integer-Skalierung), aber flüssige Animation, weiche Kamera, Partikel, Licht. Klassen an Silhouette und Farbe unterscheidbar. Grundton hell, warm, freundlich, Palette wechselt pro Epoche; Düsternis über Kontrast (kalte Nacht draußen, warmes Licht drinnen). Sprites zunächst im Code aus Paletten erzeugt oder aus CC0-Paketen (Lizenz in `ASSETS.md` dokumentieren); Pipeline so bauen, dass ich später eigene Aseprite-Dateien einsetzen kann.
- **Layout:** wächst mit dem Spiel; am Anfang nur die Schlacht, Bereiche erscheinen mit kleinem Einführungsmoment.
- **Juice 4/5:** aufsteigende Zahlen, Bildschirm-Shake bei Meilensteinen, Fortschrittsbalken überall, Tooltips mit Formeln. Alles über „Bewegung reduzieren“ abschaltbar.
- **Komfort:** Schriftgröße einstellbar, Tastaturkürzel für alle häufigen Aktionen, Deutsch/Englisch umschaltbar (alle Texte in Sprachdateien, nie hart im Code).
- **Sound:** Chiptune-Musik pro Epoche, viele Effekte (4/5), Musik und Effekte getrennt regelbar, stumm im Hintergrund-Tab. Erzeugt per Web Audio (z. B. ZzFX/ZzFXM), keine Fremd-Audiodateien mit unklarer Lizenz.
- **Zahlen:** Suffixe (K, M, B, T, dann aa, ab …), Werte weit über 1e308.

### 4. Technik

- **Stack:** TypeScript + Vite. PixiJS für Schlacht und Burg, schlichtes HTML/CSS (ggf. Preact) für Menüs und Tooltips. `break_eternity.js` für große Zahlen, Formatierung zentral in einem Modul. Begründe Abweichungen kurz.
- **Game-Loop:** fester Logik-Tick (z. B. 20/s) mit Delta-Zeit, getrennt vom Rendern (`requestAnimationFrame`). Logik deterministisch und ohne DOM testbar.
- **Daten getrennt von Logik:** Einheiten, Gebäude, Rezepte, Skilltrees, Forschung, Gegner, Ereignisse, Achievements, Texte und ALLE Balancing-Werte in `src/data/` (TS oder JSON) mit kommentierten Formeln. So kann ich Nuancen ändern und DLC-Inhalte ergänzen, ohne Logik anzufassen.
- **Speichern:** Autosave mit einstellbarem Intervall (5–120 s), rollierende automatische Backups (letzte 5), Speicherversion + Migrationsfunktionen mit Tests, Backup vor jeder Migration. Export/Import als Text als Notfallweg. Storage-Schicht abstrahiert, damit die Desktop-App später in Dateien speichert.
- **Struktur:** `core/` (Loop, Zahlen, Events), `systems/` (je System ein Modul), `data/`, `render/`, `ui/`, `save/`, `i18n/`, `audio/`, `dev/`. Dateien möglichst unter ~400 Zeilen.
- **Tests:** Vitest für Formeln, Kosten, Prestige, Hofbefehle, Save-Migration; ein Playwright-Smoke-Test (Spiel lädt, erste Schlacht, Bau, Speichern/Laden).
- **Hosting:** statischer Build über GitHub Actions auf GitHub Pages. Später Electron-Wrapper für Desktop/Steam (Steam-Anbindung z. B. über steamworks.js), erst ab Meilenstein 8.

### 5. Entwickler-Werkzeuge (ab Meilenstein 1)

- Debug-Panel (Dev-Modus oder geheime Tastenkombination): Zeitbeschleuniger 1×–100×, „1 Stunde vorspulen“, Ressourcen setzen, Epoche wählen, Sprung erzwingen, Save zurücksetzen.
- `npm run simulate`: simuliert einen Durchlauf mit einfacher Kauf-Strategie und gibt eine Progressionskurve aus (wann welcher Meilenstein, Sprung, wo Wartezeiten über 60 s entstehen), zusätzlich als Diagramm im Debug-Panel.
- Statistik-Seite im Spiel.

### 6. Meilensteine

Arbeite Meilenstein für Meilenstein auf eigenen Branches mit Pull Request. **Du mergst die Pull Requests selbst**, sobald du es für angemessen hältst (mindestens: CI grün, Build läuft, Tests grün, Meilenstein bzw. Teilschritt abgeschlossen). Ich merge nichts selbst. Am Ende jedes Meilensteins: kurze deutsche Zusammenfassung (was ist neu, wie teste ich es, offene Fragen).

1. **Grundgerüst:** Repo-Struktur, Vite + TS, Lint/Format, Vitest, Playwright, GitHub-Action für Pages, `CLAUDE.md`, `docs/design.md` (dieses Konzept).
2. **Vertical Slice Epoche 1 (~15 Min. Spiel):** erste Schlacht, Burg 4×4, drei Gebäude, zwei Klassen, Speichern, Debug-Panel. Danach Feedback von mir abwarten.
3. **Epoche 1 komplett:** alle Klassen, Ketten, Skilltrees, Forschung, Zauber, Bestiarium, vier Elitegegner, Zeitmaschine.
4. **Erster Entwicklungssprung:** Chronik, Zeitsplitter, Umskill-Tokens, Epoche 2 als Gerüst, Simulation kalibriert auf ~60 Min.
5. **Hofbefehle, Ereignisse, Achievements, Statistik, Rückblick + Ausgeruht-Bonus.**
6. **Grafik, Animation, Sound auf Endniveau, Einstellungen, Zweisprachigkeit.**
7. **Epochen 2–5, Finale, Zeitschleife, Fluch-Siegel.**
8. **Desktop-App (Electron), Run-Karte zum Teilen** (Spitzname, höchste Zahl, schnellster Sprung, Challenge-Zeiten als Bild/Code).
9. **Später, nur nach Absprache:** Online-Bestenliste mit kleinem Backend (Plausibilitätsprüfung statt Konto), Steam, DLC.

### 7. Qualitätsregeln

- Jede neue Mechanik wird im Spiel eingeführt und erklärt. Keine unerklärten Zahlen.
- Nie eine Wartezeit ohne nächstes sichtbares Ziel.
- Flüssig auch nach Stunden: keine Speicherlecks, UI nur bei Änderungen aktualisieren, Objekt-Pools für Partikel.
- Keine Werbung, kein Tracking, keine externen Laufzeit-Abhängigkeiten außer dem eigenen Hosting.
- Eigene Inhalte: Vorbilder (Booster Pack Heroes u. a.) nur als Gefühl, keine Namen, Grafiken oder Texte übernehmen.
- Frag mich vor Designentscheidungen, die den Spielcharakter ändern. Technische Entscheidungen triffst du selbst und erklärst sie kurz.
- Nie direkt auf `main` pushen, sondern immer über einen Pull Request, den du selbst mergst, wenn die CI grün ist. Keine Secrets committen.

### 8. Erste Aufgabe

1. **Projekt und Repository selbst anlegen.** Du arbeitest in einem leeren Ordner auf meinem PC. Prüfe, ob `git`, `node` und die GitHub CLI (`gh`) installiert sind und `gh auth status` angemeldet ist; falls nicht, sag mir genau, was ich installieren bzw. ausführen muss (`gh auth login`). Dann: `git init`, Grundgerüst anlegen, ersten Commit machen und mit `gh repo create chronokrone --public --source=. --remote=origin --push` das GitHub-Repository erstellen. Frag mich vorher kurz nach Name und ob öffentlich (nötig für kostenloses GitHub Pages) oder privat.
2. Lies diesen Prompt vollständig, lege `CLAUDE.md` und `docs/design.md` an und stelle mir höchstens fünf Rückfragen, die das Konzept wirklich betreffen.
3. Starte mit Meilenstein 1. Der Ordner auf meinem PC ist immer der aktuelle Zwischenstand; nach jedem Meilenstein pushst du den Branch zu GitHub, damit es eine Sicherung gibt.
