# Chronokrone – Game Design

> Quelle: Masterprompt vom 26.11.2026 und das Design-Dokument „Game Design Document: Incremental Game“ (claude.ai). Diese Datei ist die verbindliche Fassung im Repo; Änderungen am Konzept werden hier nachgezogen.

## 1. Kurzfassung

Du bist König eines verschlafenen Mittelalterreichs, als hinter dem Wald ein Meteor einschlägt und technisch überlegene, alberne Aliens angreifen. In kurzen Abwehrschlachten wehrst du sie ab, baust zwischendurch deine Burg auf einem Raster aus und trainierst Truppen und Sammler mit eigenen Skilltrees. Aus Alien-Schrott baust du eine Zeitmaschine und springst in die nächste Epoche. Die Aliens sind dort stärker, aber auch deine Leute haben die Technik halb verstanden und benutzen sie mit Mittelalter-Logik.

- **Spielzeit:** 18–20 Stunden bis zum Finale (ein langes Wochenende), danach Zeitschleife als New Game+.
- **Erster Entwicklungssprung:** nach ca. 60 Minuten.
- **Plattform:** Browser (GitHub Pages), später Desktop-App (Electron) und ggf. Steam.

## 2. Design-Säulen

1. **Immer etwas zu tun.** Nächster sinnvoller Kauf nie mehr als 60 s entfernt, neue Mechanik spätestens alle 15–20 Minuten.
2. **Tiefe durch Einheiten.** Attribute, Klassen, Skilltrees, Spezialisierungen sind das Herz des Spiels.
3. **Prestige ist ein Fest, kein Verlust.** Jeder Sprung bringt neue Welt, Farben, Systeme und spürbar mehr Kraft.
4. **Alles erklärt.** Tooltips mit genauer Formel, sichtbare Engpässe.
5. **Albern, aber mit Biss.** Kaltes, düsteres Mittelalter, über das sich das Spiel selbst lustig macht.

**No-Gos:** Werbung, Pay-to-Win, Login-Zwang, Grind ohne Fortschritt, Spielstandverlust, unfaire Zufälle (seltene Drops haben eine Pity-Grenze).

## 3. Welt, Story und Ton

- **Spielerrolle:** Du spielst den König. Ein gelangweilter **Erzähler-Gott** kommentiert im Log, beschwert sich über das Balancing und weiß, dass er in einem Incremental steckt.
- **Auftakt:** Meteor schlägt ein, blecherne Wesen (Staubsauger × Tintenfisch) stehen vor der Mauer. Der König hat drei Bauern mit Mistgabeln. Die erste Schlacht ist nicht zu gewinnen.
- **Bogen jeder Epoche:** Normale Gegner droppen Kleinteile (Chips, Kabel, Schrauben), vier Elitegegner je ein Großteil der Zeitmaschine. Zusammenbauen erfordert genug Skilltree-Fortschritt.
- **Mittelalter-Logik:** gesegnete Laserschwerter, das „Rechenorakel“ wird mit Weihwasser gekühlt.
- **Erzählweise:** Tagebuch-Zeilen im Log, Ereignis-Fenster mit Entscheidungen, Oberfläche wandelt sich pro Epoche (Pergament → Messing → Neon).
- **Ende:** Die Aliens sind selbst Zeitreisende, ein paar Epochen voraus. Die Zeitschleife beginnt, mit Wissen, das du behalten darfst. Gefühl: „Das war großartig, und jetzt weiß ich, wie ich es besser mache.“

## 4. Kern-Loop

Zwei Takte: **Abwehrschlacht** (aktiv, 2–5 Min.) ↔ **Burg** (Basis, produziert immer weiter, auch während der Schlacht). Aktiv/Idle-Verhältnis 3 von 5.

- **Abwehrschlacht:** Alien-Wellen rollen auf die Mauer. Truppen kämpfen automatisch, der Spieler klickt und wirkt Zauber mit Abklingzeit. Ende, wenn die Mauer fällt oder die letzte Welle besiegt ist. Je weiter, desto mehr Beute (Gold, Alien-Schrott, XP, seltene Teile).
- **Burg:** Gebäude auf Raster platzieren, Sammler verteilen, craften, forschen, Skilltrees leveln.
- **Später automatisierbar:** Hofbefehle starten und wiederholen Schlachten selbst.

### Die ersten fünf Minuten

1. Kein Intro. Direkt in die erste Schlacht: drei Bauern gegen die erste Welle.
2. Nach ~60 s fällt die Mauer. Erzähler: „Das war zu erwarten.“
3. Die Burg erscheint (4×4, fast leer). Erstes Feld frei → erster Holzfäller.
4. Erster Skillpunkt in Mistgabel-Training; die zweite Schlacht dauert doppelt so lang.
5. Nach 5 Min.: drei Gebäude, zwei Einheiten, erster Alien-Chip im Bestiarium.

## 5. Einheiten

Jede Einheit hat vier Attribute, eine Klasse mit eigenem Skilltree und drei Ausrüstungsslots (Waffe, Rüstung, Talisman). Attribute wirken auf Kampf **und** Arbeit.

| Attribut | Im Kampf                        | Bei der Arbeit                    |
| -------- | ------------------------------- | --------------------------------- |
| Stärke   | Nahkampfschaden, Mauerreparatur | Holz und Stein pro Schlag         |
| Geschick | Fernkampf, kritische Treffer    | Tempo, Chance auf Doppelertrag    |
| Magie    | Zauberschaden, Schilde          | Forschung, Alchemie, Verzauberung |
| Ausdauer | Lebenspunkte                    | Arbeitszeit vor der Pause         |

### Klassen in Epoche 1

| Klasse       | Typ     | Schwerpunkt     | Spezialisierungen ab Level 10                       |
| ------------ | ------- | --------------- | --------------------------------------------------- |
| Ritter       | Truppe  | Stärke          | Bollwerk (tanken) oder Berserker (Schaden)          |
| Bogenschütze | Truppe  | Geschick        | Scharfschütze oder Salvenmeister                    |
| Hexenmeister | Truppe  | Magie           | Feuer oder Frost                                    |
| Holzfäller   | Sammler | Stärke          | Kahlschlag oder Förster (nachhaltig)                |
| Bergmann     | Sammler | Stärke/Ausdauer | Tiefbau oder Edelsteinsucher                        |
| Kräuterhexe  | Sammler | Magie           | Alchemistin oder Heilerin                           |
| Mönch        | Sammler | Magie/Geschick  | Gelehrter (Wissen) oder Schreiber (Automatisierung) |

Jede Epoche fügt 2–3 Klassen hinzu, oft Mischformen (Dampfritter, Techno-Hexe).

- **Level** durch XP aus Schlacht oder Arbeit, Meilensteine bei 10/25/50/100.
- **Skilltree** pro Klasse als Icon-Raster mit ~30 Knoten. Spezialisierung ist Entweder-Oder, änderbar nur beim Entwicklungssprung.
- **Synergien:** z. B. Kräuterhexe neben dem Ritter-Quartier heilt während der Schlacht; Mönch neben Bibliothek kopiert Schriftrollen; Ritter mit Alien-Rüstung bekommt Magieresistenz, aber Angst vor Wasser.

## 6. Ressourcen und Produktionsketten

Start mit drei Ressourcen (+ Alien-Schrott aus Drops), pro Epoche 2–3 neue. Alle Rohstoffe haben **Lagerlimits**, ausbaubar durch Lagergebäude.

| Ressource     | Rolle                                   | Woher                       | Ab          |
| ------------- | --------------------------------------- | --------------------------- | ----------- |
| Gold          | Hauptwährung für Bauen und Anwerben     | Schlachten, Steuern, Handel | Start       |
| Holz          | Grundrohstoff                           | Holzfäller                  | Start       |
| Stein         | Grundrohstoff                           | Steinbruch                  | Start       |
| Alien-Schrott | Kleinteile für Technik und Zeitmaschine | Gegner-Drops                | Start       |
| Wissen        | Forschung und Skilltrees                | Kloster, Mönche             | ca. 10 Min. |
| Eisen         | Ausrüstung                              | Mine, Schmelze              | ca. 20 Min. |
| Zeitsplitter  | Prestige-Währung                        | Entwicklungssprung          | Prestige 1  |

**Ketten (lang, 4 von 5):**

- Holz → Bretter → Palisaden → Mauerausbau
- Erz → Eisen → Stahl → Ritterrüstung
- Kräuter → Tränke → Zaubertinte → Schriftrollen für Zauber
- Alien-Schrott → Chips sortieren → Rechenorakel → Zeitmaschinenteil

Jede Kette zeigt im Tooltip ihren **Engpass**: welches Glied bremst und um wie viel.

## 7. Burg: Raster, Gebäude, Synergien

- Raster wächst von **4×4** auf **~12×12** pro Epoche; jede Epoche hat eine eigene Karte.
- **Gelände:** Wald, Fels, Bach – Boni für passende Gebäude.
- **Kostenkurven:** Grundgebäude sanft (Faktor ~1,07), Spezialgebäude steil (1,3–1,5).
- **Nachbarschaftsboni:** Sägewerk neben Holzfäller +15 %, Schmiede neben Mine +20 %, Taverne hebt die Moral angrenzender Sammler.
- **Spezialisierung ab Level 25** (z. B. Waffen- oder Rüstungsschmiede).
- **Meilensteine** bei Level 10/25/50/100 verdoppeln die Produktion (mit Bildschirm-Shake).
- Neue UI-Bereiche (Markt, Bibliothek, Werkstatt) erscheinen erst, wenn das passende Gebäude steht.

## 8. Fortschrittssysteme

| System             | Währung                        | Was es tut                                        | Reset beim Sprung                           |
| ------------------ | ------------------------------ | ------------------------------------------------- | ------------------------------------------- |
| Klassen-Skilltrees | Skillpunkte pro Level          | Werte und Fähigkeiten einer Klasse                | Ja, Punkte kommen als Umskill-Tokens zurück |
| Königs-Talente     | Talentpunkte aus Meilensteinen | Globale Perks („+10 % Lager“)                     | Teilweise                                   |
| Forschung          | Wissen                         | Schaltet Gebäude, Ketten, Zauber, Mechaniken frei | Nein                                        |

Build-Entscheidungen mittel (3/5): Die meisten Knoten sind kaufbar, aber jede Spezialisierung und jeder dritte Talentknoten verlangt ein Entweder-Oder.

**Zauber** (aktive Seite der Schlacht, mit Abklingzeit): Start mit Steinregen, Segen der Mauer, Rufen der Bauern. Später Tech-Twists wie der gesegnete EMP.

## 9. Prestige-Schichten

1. **Schlacht** (Minuten): kleiner Lauf mit Beute.
2. **Entwicklungssprung** (Stunden): Zeitmaschine bauen, Epoche wechseln, Zeitsplitter kassieren.
3. **Chronik** (dauerhaft): Zeitsplitter kaufen permanente Multiplikatoren und Startvorteile in einem eigenen Baum; unendlich skalierende Upgrades.
4. **Zeitschleife** (nach dem Finale): NG+ mit Schleifen-Siegeln, jede Schleife ändert die Regeln leicht (andere Startklasse, gespiegelte Karte, neue Alien-Eigenschaften).
5. **Fluch-Siegel** (optional): Modifikatoren für mehr Ertrag, bis zu fünf kombinierbar, mit eigenen Bestzeiten.

**Reset mittel (3/5):** Gebäude und Einheitenlevel zurück; Forschung, Sammlungen, Achievements und Zeitsplitter bleiben.

## 10. Epochen

| #   | Epoche                | Zieldauer | Neue Mechanik                                    | Neue Sammlung      | Stimmung                       |
| --- | --------------------- | --------- | ------------------------------------------------ | ------------------ | ------------------------------ |
| 1   | Finsteres Mittelalter | ~1 h      | Grundspiel                                       | Bestiarium/Lexikon | Fackellicht, Holz, Schnee      |
| 2   | Dampf & Zahnrad       | ~2 h      | Handel mit schwankenden Preisen, Hofbefehle voll | Begleiter          | Messing, Kupfer, Nebel         |
| 3   | Elektro-Lehnswesen    | ~3,5 h    | Stromnetz auf dem Raster, Energie                | Karten             | warmes Glühbirnenlicht         |
| 4   | Atomare Kreuzzüge     | ~5 h      | Reaktor-Risiko, Katastrophen mit Entscheidung    | Relikte            | Gelbgrün, Bunker, Wüste        |
| 5   | Sternenorden          | ~7 h      | Raumschiff-Raster, Mutterschiff-Finale           | Komplettierung     | Weltraum, Neon, Kirchenfenster |

Jede Epoche endet mit vier Elitegegnern (je ein Zeitmaschinenteil). **Der erste Sprung ist besonders:** Zeitmaschine aus Holz, Seilen und einem Alien-Chip, eigene Animation, neue Epoche startet sichtbar stärker.

## 11. Hofbefehle (programmierbare Automatisierung)

Wenn-dann-Regeln, die ein Schreiber-Mönch abarbeitet – als klickbarer Baukasten, keine Tipp-Sprache. Mit Ausführungs-Log.

Beispiele: `WENN Holz > 90 % Lager DANN baue Lagerhaus` · `WENN Zeitsplitter-Ertrag > 2 × letzter Sprung DANN melde „Bereit zum Sprung“`

| Stufe | Ab            | Umfang                                           |
| ----- | ------------- | ------------------------------------------------ |
| 1     | Ende Epoche 1 | 2 Regeln, eine Bedingung, feste Aktionen         |
| 2     | Epoche 2      | 6 Regeln, UND/ODER, Prioritäten                  |
| 3     | Epoche 3      | Variablen und Zähler, Kauf-Strategien            |
| 4     | Epoche 4+     | unbegrenzt, Vorlagen speichern, als Text teilbar |

## 12. Sammeln, Achievements, Ereignisse

- **Sammlungen** (pro Epoche neu): Bestiarium (Steckbrief, Schwächen, Erzähler-Kommentar; Bonus +Schaden gegen den Typ), Begleiter (Kampfgans, Roboterkatze), Karten (drei Slots vor der Schlacht), Relikte (Regelbrecher). Jeder Eintrag kleiner Dauerbonus, vollständiges Kapitel großer Bonus.
- **Achievements:** ~120 à +1 % auf alles, einige geheim. Dazu Statistik-Seite und Fortschritts-Zeitstrahl.
- **Ereignisse:** Katastrophen mit Entscheidung (Stallfeuer: löschen, brennen lassen, beten), fahrende Händler, Alien-Überläufer, Wetter und Jahreszeiten mit Produktionseffekten.
- **Minispiele:** Reaktions-Events (Drohne anklicken), faires Würfelspiel in der Taverne mit sichtbaren Chancen, nie um wichtige Ressourcen.
- **Glücksschutz:** Pity-Grenze für seltene Drops.

## 13. Offline und Rückkehr

Keine Offline-Produktion. Stattdessen Rückblick „Während du weg warst …“ als Zeitraffer der letzten Sitzung und ein **Ausgeruht-Bonus** (z. B. doppelte XP für einige Minuten).

## 14. Präsentation

- **Grafik:** moderne Pixelart (Figuren ~32×32, Integer-Skalierung), flüssige Animation, weiche Kamera, Partikel, Licht. Klassen an Silhouette und Farbe unterscheidbar. Grundton hell und warm, Düsternis über Kontrast (kalte Nacht draußen, warmes Licht drinnen). Palette wechselt pro Epoche.
- **Grafikquelle:** zunächst im Code aus Paletten erzeugt oder CC0-Pakete (Lizenz in `ASSETS.md`); Pipeline für spätere eigene Aseprite-Dateien.
- **Layout wächst:** am Anfang nur die Schlacht, neue Bereiche mit kleinem Einführungsmoment.
- **Juice 4/5:** aufsteigende Zahlen, Shake bei Meilensteinen, Fortschrittsbalken überall, Tooltips mit Formeln. Alles über „Bewegung reduzieren“ abschaltbar.
- **Komfort:** Schriftgröße einstellbar, Tastaturkürzel, Deutsch/Englisch (alle Texte in Sprachdateien).
- **Sound:** Chiptune pro Epoche, viele Effekte (4/5), Musik/Effekte getrennt regelbar, stumm im Hintergrund-Tab. Erzeugt per Web Audio (ZzFX/ZzFXM).
- **Zahlen:** Suffixe K, M, B, T, dann aa, ab …; Werte weit über 1e308.

## 15. Tempo und Balancing

Tempo mittel (3/5), ausgelegt auf lange Sitzungen mit unregelmäßigen Pausen.

| Kennzahl                       | Ziel                  |
| ------------------------------ | --------------------- |
| Zeit bis zum nächsten Kauf     | < 60 s                |
| Neue Mechanik / neuer Bereich  | mind. alle 15–20 Min. |
| Erster Entwicklungssprung      | ~60 Min.              |
| Zweiter Durchlauf einer Epoche | ~50 % der ersten Zeit |
| Gesamtzeit bis zum Finale      | 18–20 h               |

Alle Kosten, Faktoren, Drop-Raten und Zeiten in `src/data/`. Werkzeuge: Zeitbeschleuniger 1×–100×, „1 Stunde vorspulen“, Debug-Konsole, `npm run simulate` mit Progressionskurve.

## 16. Technik

| Bereich      | Entscheidung                                               | Warum                                  |
| ------------ | ---------------------------------------------------------- | -------------------------------------- |
| Sprache      | TypeScript (strict)                                        | lesbar, fängt Fehler früh, ähnelt Java |
| Build        | Vite                                                       | schnell, einfach                       |
| Darstellung  | PixiJS für Schlacht/Burg, HTML/CSS (ggf. Preact) für Menüs | flüssige Pixelart, lesbare Menüs       |
| Große Zahlen | break_eternity.js                                          | weit über 1e308                        |
| Sound        | Web Audio, im Code erzeugt                                 | keine Lizenzfragen                     |
| Tests        | Vitest + Playwright                                        | Formeln/Migrationen + Smoke-Test       |
| Hosting      | GitHub Pages per GitHub Actions                            | kostenlos, ein Link für Freunde        |
| Desktop      | Electron (ab Meilenstein 8), Steam via steamworks.js       | bewährter Weg                          |

- **Game-Loop:** fester Logik-Tick 20/s mit Delta-Zeit, getrennt vom Rendern; Logik deterministisch und ohne DOM testbar.
- **Speichern:** Autosave (5–120 s einstellbar), rollierende Backups (letzte 5), Speicherversion + Migrationen mit Tests, Backup vor jeder Migration, Export/Import als Text. Storage-Schicht abstrahiert (später Dateien in der Desktop-App).

## 17. Teilen und Endgame

- **Version 1:** Link zum Spiel + Run-Karte (Spitzname, höchste Zahl, schnellster Sprung, Challenge-Zeiten) als Bild oder Code. Ohne Konto, ohne Server.
- **Später:** Online-Bestenliste über kleines Backend, Plausibilitätsprüfung statt Konto (Schummelschutz 3/5).
- **Endgame:** echtes Ende mit Abspann (Sieg über das Mutterschiff), dann Zeitschleife, unendliche Chronik-Upgrades, Fluch-Siegel mit Bestzeiten. Datenformat DLC-fähig (neue Epochen, Klassen, Ereignisse).

## 18. Meilensteine

1. **Grundgerüst:** Repo, Vite + TS, Lint/Format, Vitest, Playwright, Pages-Action, `CLAUDE.md`, `docs/design.md`.
2. **Vertical Slice Epoche 1 (~15 Min.):** erste Schlacht, Burg 4×4, drei Gebäude, zwei Klassen, Speichern, Debug-Panel → Feedback abwarten.
3. **Epoche 1 komplett:** alle Klassen, Ketten, Skilltrees, Forschung, Zauber, Bestiarium, vier Elitegegner, Zeitmaschine.
4. **Erster Entwicklungssprung:** Chronik, Zeitsplitter, Umskill-Tokens, Epoche 2 als Gerüst, Simulation auf ~60 Min. kalibriert.
5. **Hofbefehle, Ereignisse, Achievements, Statistik, Rückblick + Ausgeruht-Bonus.**
6. **Grafik, Animation, Sound auf Endniveau, Einstellungen, Zweisprachigkeit.**
7. **Epochen 2–5, Finale, Zeitschleife, Fluch-Siegel.**
8. **Desktop-App (Electron), Run-Karte zum Teilen.**
9. **Später, nur nach Absprache:** Online-Bestenliste, Steam, DLC.

## 19. Offene Fragen

Siehe Abschnitt „Offene Punkte“ im Pull Request zu Meilenstein 1; Antworten werden hier eingetragen.
