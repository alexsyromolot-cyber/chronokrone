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

## 19. Entscheidungen

Geklärt am 27.11.2026:

| Thema                | Entscheidung                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Titel                | **Chronokrone** (Deutsch) / **Chronocrown** (Englisch)                                                                |
| Epochen-Reihe        | wie in Abschnitt 10: Mittelalter → Dampf & Zahnrad → Elektro-Lehnswesen → Atomare Kreuzzüge → Sternenorden            |
| Grafikquelle         | Sprites im Code aus Paletten erzeugt; Pipeline bleibt offen für eigene Aseprite-Dateien                               |
| Erste Schlacht       | absichtlich nicht gewinnbar, Mauer fällt nach ~60 s                                                                   |
| Spielerrolle         | König; ein gelangweilter Erzähler-Gott kommentiert und bricht die vierte Wand                                         |
| Offline-Fortschritt  | keiner; stattdessen Rückblick und Ausgeruht-Bonus                                                                     |
| Repository / Hosting | öffentliches Repo `alexsyromolot-cyber/chronokrone`, GitHub Pages: https://alexsyromolot-cyber.github.io/chronokrone/ |

Technische Umsetzungsentscheidungen aus Meilenstein 3 und 4 (vorläufig, Spieldesign wird noch überarbeitet):

| Thema              | Umsetzung                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Burgkarte          | 8×8 je Epoche, startet als 4×4 in der Mitte, Landvermessung I/II erweitert auf 6×6 / 8×8                       |
| Skilltrees         | 12 Knoten je Klasse (statt ~30) – 6 allgemeine, je 3 pro Spezialisierungsweg; Ausbau auf ~30 bei Bedarf        |
| Ausrüstung         | Stufe je Klasse und Slot (bis 30); Waffen wirken multiplikativ (×1,2 Schaden bzw. ×1,15 Produktion je Stufe)   |
| Zauber             | Angriffszauber skalieren mit der Truppen-Kampfkraft, nicht mit Gegner-LP (sonst wird jede Stufe gleich leicht) |
| Elitegegner        | Letzter Gegner der Belagerungsstufen 3, 6, 9, 12; je ein Zeitmaschinenteil                                     |
| Schlachtdauer      | „Wut“: nach 150 s verdoppelt sich der Mauerschaden alle 20 s                                                   |
| Zeitmaschine       | 4 Teile + Rechenorakel + Chronologie + 40 Skill-Stufen                                                         |
| Entwicklungssprung | Splitter = 10 × Epoche + 3 × Belagerungsstufe + 1 je 5 Skill-Stufen; Skills kommen als Umskill-Tokens zurück   |
| Chronik            | 10 Knoten, zwei davon unbegrenzt (+25 % Produktion / Schaden je Rang)                                          |
| Epoche 2 (Gerüst)  | eigene Karte und Palette, Gegner-LP ×6, Beute ×5; eigene Mechaniken folgen in M5/M7                            |
| Kalibrierung (Bot) | Epoche 1 ~56 Min., Epoche 2 ~2:16 h (mit Ereignissen, Drohnen und Erfolgen)                                    |
| Hofbefehle         | Stufe 1 ab 2 Zeitmaschinenteilen (2 Regeln), Stufe 2 ab Epoche 2 (6 Regeln, UND/ODER, Reihenfolge)             |
| Ereignisse         | alle 4–6 Min., 6 Arten, 60 s Bedenkzeit; Stallfeuer kostet ein Level statt eines ganzen Gebäudes               |
| Jahreszeiten       | wechseln alle 8 Min. mit Produktionseffekten                                                                   |
| Minispiele         | Alien-Drohne (10 % der letzten Schlachtbeute), faires Würfelspiel in der Taverne (max. 10 % des Golds)         |
| Erfolge            | 134 (davon 6 geheim), je ×1,01 auf Produktion und Schaden                                                      |
| Rückblick          | ab 5 Min. Pause; Ausgeruht = 5 Min. doppelte XP je Stunde Abwesenheit (2–15 Min.)                              |

Warum Waffen multiplikativ? Gegner wachsen je Belagerungsstufe ×1,75. Mit nur additiven Boni wuchs die
Kampfkraft linear, die Wirtschaft lief über (Hunderttausende Holz), und der Bot verlor 24 Schlachten in Folge
am letzten Elitegegner. Mit multiplikativen Waffen fließt die Wirtschaft wieder in Kampfkraft.

### M7a – Epoche 2 „Dampf & Zahnrad“

- Neue Rohstoffe Kohle und Zahnräder, neue Gebäude Kohlegrube, Zahnradwerk, Markt, Dampfgießerei (Forschung nur ab Epoche 2 sichtbar).
- Neue Klassen: Heizer (Sammler, Hauptattribut Ausdauer) und Dampfritter (Reichweite 60, Flächenschaden).
- Markt: Preise schwanken alle 10 s (±12 %, Zug zum Grundpreis), Spanne 10 % minus 1 % je Level (min. 2 %), damit Hin-und-her-Handel kein Gelddrucken ist.
- Sammlung „Begleiter“: 8 Tiere, je Sieg 35 % Fundchance, Glücksschutz nach 3 Siegen, bleiben bei jedem Sprung; volle Sammlung +10 % auf alles.
- Bot-Ergebnis: Epoche 2 dauert 69 Min. (vorher 2:16 h), keine Wartezeit über 60 s.
- Offen: Heizer und Dampfritter haben erst 6 Skillknoten ohne Spezialisierung.

### M7b – Epoche 3 „Elektro-Lehnswesen“

- Neue Rohstoffe Kupfer und Draht; Gebäude Kupfermine, Drahtzieherei, Kraftwerk, Strommast, Teslaturm. Klassen Leitungsknecht (Sammler, Geschick) und Blitzlanzer (Reichweite 140, großer Flächenschaden).
- **Stromnetz:** Kraftwerke verbrennen Kohle (0,5/s je Level) und liefern 3 Strom je Level × Meilenstein. Masten leiten weiter, wenn sie an ein Kraftwerk oder verbundenen Mast grenzen. Angrenzende Gebäude hängen am Netz, brauchen 1 Strom je Level und bekommen ×(1 + 100 % × Versorgung) auf Produktion bzw. Rezepte. Masten haben Höchstlevel 1.
- **Karten:** 10 Karten, 3 Slots, nur zwischen Schlachten wechselbar. Einige Karten haben Nachteile (Glaskanone: +60 % Schaden, −30 % Mauer). 30 % Fundchance je Sieg, Glücksschutz nach 4 Siegen, bleiben bei jedem Sprung; volle Sammlung +10 % Schaden und Beute.
- Gegner-LP ×140, Beute ×56: gleiches Verhältnis wie Epoche 2 (2,5). Mit ×400 kam der Bot nicht am letzten Elitegegner vorbei; ×160 gab in M7c Wartezeiten bis 112 s kurz vor Schluss.
- Bot-Ergebnis: Epoche 3 dauert 2:31 h.

### M7c – Epoche 4 „Atomare Kreuzzüge“

- Neue Rohstoffe Uran und Brennstäbe; Gebäude Uranmine, Brennstabwerk (2 Uran → 1 Stab), Reaktor (höchstens einer), Kühlturm, Kreuzzugsbunker. Klassen Uransucher (Sammler, Ausdauer) und Strahlenpaladin (Truppe, Stärke, Reichweite 70, Flächenschaden).
- **Reaktor-Risiko:** Der Spieler wählt die Leistung (aus, halb, voll, Überlast 150 %). Bonus auf ALLE Gebäude = 15 % × Level × Leistung, Verbrauch 0,04 Stäbe/s × Level × Leistung. Hitze/s = 0,004 × Level × Leistung² − 0,006 × Kühlturm-Level. Weil die Hitze quadratisch wächst, der Bonus nur linear, ist Überlast ein Wagnis. Warnung ab 80 %.
- **Kernschmelze (Katastrophe mit Entscheidung):** Bei 100 % Hitze fährt der Reaktor herunter (Leistung 0, Hitze 40 %). Dann: Evakuieren (Reaktor verliert die Hälfte seiner Level), Eindämmen (25 % des Golds) oder Beten (10 % Wunder, sonst Level 1). Dazu das Ereignis „Strahlender Sandsturm“ ab Epoche 4.
- **Relikte (Regelbrecher):** 8 Relikte, wirken sofort und für immer: Bleischürze (−35 % Hitze), Gesprungene Sanduhr (Wut 60 s später), Goldene Waage (keine Marktspanne), Glücksisotop (alle Pity-Grenzen halbiert), Zwillingsschlag (Klick trifft auch den nächsten Gegner mit 50 %), Spiegelschild (Gegner an der Mauer verlieren 2 % LP/s), Brennender Kelch (Kernschmelze wird zum Produktionsrausch ×2 für 60 s), Schatzkarte (Drohne doppelt so oft). 25 % Fundchance je Sieg, Glücksschutz nach 5 Siegen; volle Sammlung +15 % Produktion und Schaden.
- Gegner-LP ×3200, Beute ×1280 (Verhältnis 2,5). Bot-Ergebnis: Epoche 4 dauert 3:44 h; kurz vor dem letzten Elitegegner einzelne Wartezeiten von 64–92 s (Raster voll, alles teuer). Der Bot fährt den Reaktor vorsichtig und erlebt keine Kernschmelze.

### M7d – Epoche 5 „Sternenorden“ und Finale

Alex' Vorgabe (27.11.2026): „bau einmal komplett alles zu Ende und dann teste ich und wir passen vieles an“. Die folgenden Designentscheidungen sind deshalb ohne Rückfrage getroffen und ausdrücklich zum Anpassen gedacht.

- Neue Rohstoffe Sternenstaub und Sternenglas; Gebäude Hüllensegment, Sternenstaub-Kollektor (Bonus auf Bach-Feldern = Nebelströme), Buntglashütte (3 Staub → 1 Glas), Neon-Rosette, Ordenshangar. Klassen Sternenpilger (Sammler, Magie) und Leere-Templer (Truppe, Magie, Reichweite 90, Flächenschaden).
- **Raumschiff-Raster:** Ab Epoche 5 arbeitet ein Modul nur, wenn eine lückenlose Kette bebauter Felder es mit der Brücke (Bergfried) verbindet. Abgetrennte Module „treiben im All“ (rot markiert, produzieren nichts). Hüllensegmente sind billige Verbindungsstücke ohne Ausbau.
- **Neon-Rosetten (Kirchenfenster):** +6 % je Level für jedes verbundene Modul in derselben Zeile oder Spalte (Licht fällt durchs Schiff). Platzierungsrätsel statt reiner Zahl.
- **Sammlung „Komplettierung“:** Durchschnitt aller Sammlungen (Erfolge, Bestiarium, Begleiter, Karten, Relikte, Chronik-Knoten); Anteil × 50 % als Bonus auf Produktion und Schaden, wirksam ab Epoche 5 und in jeder Zeitschleife.
- Ereignis „Meteorschauer“ ab Epoche 5: Schilde hoch (10 % Gold) oder Einsammeln (halbes Sternenstaub-Lager, ein zufälliges Modul verliert 1 Level).
- **Mutterschiff-Finale:** In der letzten Epoche führt die fertige Zeitmaschine nicht weiter, sondern zur Finalschlacht (höchste Belagerungsstufe, 8 Wellen). In der letzten Welle kommt das Mutterschiff (dreifach groß, Endgegner); bei 66 % und 33 % LP ruft es je 6 Begleiter. Sieg → Abspann (Geschichte, Zahlen, Epochenzeiten, Mitwirkende). Das Mutterschiff lässt sich danach erneut herausfordern.
- Gegner-LP ×80 000, Beute ×32 000 (Verhältnis 2,5).

### M7e – Zeitschleife und Fluch-Siegel

Ebenfalls ohne Rückfrage entschieden (siehe M7d), zum Anpassen gedacht.

- **Zeitschleife:** Nach dem Sieg über das Mutterschiff startet ein Knopf (auch im Abspann) die nächste Schleife: zurück in Epoche 1. Bleibt: Chronik, Zeitsplitter, alle Sammlungen, Erfolge, Hofbefehle, Statistik. Zurück: zusätzlich zur normalen Epochen-Rücksetzung auch Forschung und Zauber, sonst wäre Epoche 1 ein Spaziergang.
- **Schleifen-Siegel:** Jede abgeschlossene Schleife gibt 1 Siegel (+0,5 je aktivem Fluch). Jedes Siegel: +25 % Produktion und Schaden, für immer. Dazu Zeitsplitter wie bei einem Sprung (+25 % je Fluch).
- **Schleifenregeln** (reihum, „jede Schleife ändert die Regeln leicht“): 1 Spiegelwelt (Karten gespiegelt), 2 Flinke Aliens (+25 % Tempo, +20 % Gold), 3 Andere Startaufstellung (Ritter, Bogenschützin, Bauer), 4 Gepanzerte Aliens (+20 % Nahkampf-Panzer), dann von vorn.
- **Fluch-Siegel:** Vor dem Start einer Schleife frei kombinierbar (bis zu 5): Mürbe Mauern (Mauer 50 %), Zähe Aliens (×2 LP), Lahmer Finger (Klick 25 %), Magere Jahre (Produktion 70 %), Kurze Lunte (Wut 60 s früher). Bestzeiten bis zum Mutterschiff werden je Fluch-Kombination gespeichert.

### M8 – Desktop-App und Run-Karte

- **Desktop-App (Electron):** lädt den Vite-Build mit relativen Pfaden; Spielstände als Dateien im Benutzerordner (`%APPDATA%/chronokrone/saves`), atomar geschrieben (Temp-Datei, dann umbenennen). Renderer ohne Node-Zugriff (contextIsolation, sandbox), nur drei Speicherfunktionen über die Preload-Brücke. `npm run desktop:pack` baut eine portable Windows-.exe (unsigniert). Steam-Anbindung bleibt M9 (nur nach Absprache).
- **Run-Karte:** Spitzname, höchste Zahl (insgesamt verdientes Gold), schnellster Sprung, Fortschritt, Challenge-Zeiten je Fluch-Kombination. Als PNG (Canvas) oder als Code `CK1.…` (Base64-JSON); fremde Codes lassen sich ansehen und werden beim Einlesen Feld für Feld geprüft.

## 20. Offene Fragen

Keine. (Die Balancing-Frage aus M3 – zähe Phase vor dem letzten Elitegegner – ist mit den multiplikativen Waffen gelöst.)
