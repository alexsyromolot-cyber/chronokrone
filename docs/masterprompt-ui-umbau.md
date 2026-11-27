# Masterprompt für Claude Code: Chronokrone – Umbau von Oberfläche und Grafik

> **Stand:** 27.11.2026, auf Basis von Alex' UI-Fragebogen, dem klickbaren Mockup und fünf Designentscheidungen.
> **Verwendung:** Claude Code im Ordner `C:\Users\Alex\Projekt - Chronokrone` starten und schreiben: „Lies `docs/masterprompt-ui-umbau.md` und leg los.“ Alternativ alles ab „Prompt“ als Nachricht einfügen.
> **Mockup:** https://claude.ai/artifact/WkUGpmv35UAdxC9isasA2L. Der Quelltext liegt als Referenz in `docs/ui-mockup/Main.dc.html` (HTML mit `{{…}}`-Platzhaltern und einer Logikklasse unten, kein lauffähiger Spielcode).

---

## Prompt

Wir bauen die Oberfläche und die Grafik von Chronokrone grundlegend um. Heute wirkt das Spiel wie eine Webseite: eine lange Seite mit zwei Spalten, bis zu 15 Panels untereinander, graue Kästen, viel Scrollen. Ziel ist, dass es sich wie ein **richtiges Indie-Game** anfühlt: getrennte Szenen, flüssige Übergänge, ansehnliche **moderne Pixelart, in der man Einzelheiten erkennt**, und eine aufgeräumte, benutzerfreundliche Oberfläche.

Alex' drei wichtigste Wünsche, in Alex' eigenen Worten:
1. „Es soll sich wie ein Spiel anfühlen mit flüssigen Übergängen.“
2. „Die Grafik sollte ansehnlich sein und optisch etwas her machen.“
3. „Es soll benutzerfreundlich und nicht zu voll geklatscht sein.“

Es gelten weiter `CLAUDE.md` (Rolle, Ton, Technik, Git-Regeln, Qualitätsregeln) und `docs/design.md`. Spiellogik, Balancing und Inhalte bleiben, soweit dieser Prompt nichts anderes sagt. Es ist ein Umbau der Darstellung und der Bedienung, kein neues Spiel.

### 0. Zuerst lesen

1. `CLAUDE.md`, `docs/design.md`, dann diese Datei ganz.
2. `docs/ui-mockup/Main.dc.html`: Aufbau, Texte, Farben und Abläufe des Mockups. Es zeigt die Absicht, nicht das Pixel-genaue Ziel. Die Grafik soll **sauberer und detaillierter** werden als im Mockup.
3. `index.html`, `src/main.ts`, `src/ui/`, `src/render/`, `src/style.css`, um die heutige Aufteilung zu verstehen.

Fass danach in 10–15 Zeilen zusammen, wie du den Umbau technisch angehen willst, und leg los. Fragen nur bei Designentscheidungen, die hier nicht geklärt sind (als Auswahldialog, siehe CLAUDE.md).

### 1. Grundstruktur: zwei Phasen statt einer Seite

**Kampfphase.** Der ganze Bildschirm zeigt nur die Arena: Schlachtfeld mit Overlay-HUD.
- Groß, mit schmaler Seitenleiste rechts für die Truppen: Name, Level, Lebensbalken.
- Overlay über dem Bild:
  - Belagerungsstufe, Welle x/y, Mauer- und Wellenbalken
  - Wut-Countdown
  - Beute-Zähler der laufenden Schlacht
  - Schadenszahlen
  - Gegner-Info beim Drüberfahren
  - Zauberleiste unten mit Abklingzeit und Tasten 1–3
- Oben sind nur die Ressourcen sichtbar, die im Kampf zählen: Gold, Alien-Schrott und die Beute.
- Ende: **Ergebnisfenster, das man wegklicken muss** (Sieg oder Niederlage, Beute, XP, neue Bestiarium-Einträge, Zeitmaschinenteil). Der Knopf „Ins Dorf zurückkehren“ startet den Übergang. Rückzug bleibt möglich.

**Dorfphase.** Oben steht eine Reiterleiste mit Pixel-Icons, der Name erscheint als Tooltip. Ein Reiter ist ein Raum, und es ist immer nur ein Raum groß zu sehen. Ein Knopf „Zur Mauer“ startet die nächste Schlacht.

**Zeit und Pausen (wichtig, Logikänderung):**
- Eine Schlacht findet nur in der Kampfphase statt. Im Dorf läuft keine Schlacht, weder sichtbar noch im Hintergrund.
- Die **Produktion des Dorfs läuft immer weiter**, auch während der Schlacht (wie bisher).
- **Hofbefehle** mit der Aktion „Schlacht starten“ lösen im Dorf einen **sichtbaren Countdown** aus (Vorschlag: 10 s, als Karte oben rechts mit „Abbrechen“). Danach öffnet sich das Tor und der Spieler kommt in die Kampfphase. Hofbefehle führen keine Schlachten im Hintergrund aus. Das Ergebnisfenster schließt der Spieler selbst.
- **Ereignisse mit Entscheidung** (Stallfeuer, Kernschmelze usw.) öffnen ein Fenster in der Mitte und **pausieren den Logik-Tick**, solange es offen ist. Die heutige Bedenkzeit von 60 s entfällt dafür.
- Prüf mit `npm run simulate`, wie sich das auf die Progression auswirkt (der Bot muss die Phasen genauso nutzen). Kalibriere so nach, dass die Zielzeiten aus `docs/design.md` §15 wieder stimmen: erster Sprung ca. 60 Min., kein Kauf weiter als 60 s entfernt.

### 2. Die Räume des Dorfs

Thematische Namen, je Raum eigener Hintergrund und eigene Kulisse. Diese Panels von heute ziehen um:

| Raum            | Inhalt (heutiges Panel)                                                    |
| --------------- | -------------------------------------------------------------------------- |
| Bauplatz        | Burg-Raster, Gebäude, Bauen, Ausbau                                        |
| Kaserne         | Leute anwerben, Ausrüstung, Einheitenliste                                 |
| Übungsplatz     | Skilltrees (getrennt von den Leuten)                                       |
| Bibliothek      | Forschung                                                                  |
| Werkstatt       | Zeitmaschine, Rechenorakel, Crafting-Ketten                                |
| Thronsaal       | Hofbefehle, Königs-Talente                                                 |
| Schatzkammer    | Sammlungen als **Buch zum Blättern**: Bestiarium, Begleiter, Karten, Relikte, Erfolge |
| Chronik-Turm    | Chronik-Upgrades, Zeitschleife, Fluch-Siegel                               |
| Archiv          | Statistik, Zeitstrahl, Run-Karte                                           |
| Markt           | Handel (ab Epoche 2)                                                       |

- Ein Raum erscheint erst, wenn er freigeschaltet ist. Beim ersten Öffnen stellt ihn der **Erzähler in einer kleinen Zwischensequenz** vor: große Erzählerfigur, Titel, 2–3 Sätze im Erzählerton, ein Satz Erklärung, Knopf „Betreten“. Einmal je Raum, danach im Archiv erneut abspielbar.
- Noch gesperrte, aber schon angekündigte Räume zeigen ein Schloss und im Tooltip, ab wann sie kommen.
- Karten wählt man weiter direkt vor der Schlacht. Im Kampf-Vorbereitungsmoment oder als kleines Panel beim Knopf „Zur Mauer“, nicht in der Schatzkammer.

### 3. HUD und Overlay

- **Ressourcenleiste oben:** zeigt nur die Ressourcen, die im aktuellen Raum oder in der aktuellen Phase gebraucht werden, z. B. Bauplatz: Holz, Stein, Gold; Bibliothek: Wissen. Tooltip mit Rate, Lager und Formel wie bisher.
- **Erzähler:** kleine Pixelfigur unten links mit Sprechblase für die neueste Zeile. Klick öffnet den Verlauf (die heutige Chronik des Erzählers). Das Log-Panel entfällt.
- **Hinweise statt Zielanzeige:** Es gibt keine feste Anzeige „Nächstes Ziel“. Wenn der Spieler ca. 60 s nichts Sinnvolles tut, gibt der Erzähler in der Sprechblase einen Tipp zum nächsten sinnvollen Schritt („Die Holzfällerhütte könnte Level 13 vertragen. Nur so ein Gedanke.“). Die Logik dafür kommt in `systems/` (testbar, ohne DOM), die Texte in `i18n/`.
- **Meldungen** (Erfolge, Funde, Countdown) erscheinen als kleine Karten oben rechts und verschwinden selbst.
- **Bedienung:** Alles muss mit der Maus gehen. Bestehende Tastenkürzel bleiben, sind aber nicht nötig.
- **Tooltips mit genauen Formeln bleiben** (Alex' Wunsch).

### 4. Optischer Stil

- **Behalten:** dunkle Nachtfarben mit Fackelgold, Pixelart im Schlachtfeld, Ressourcenleiste oben, Monospace-Schrift (lokal eingebunden oder Systemschrift, keine externen Fonts).
- **Wenig Rahmen:** Inhalte schweben auf dem Hintergrund, als halbtransparente Flächen mit Unschärfe, runden Ecken und ohne graue Kastenrahmen.
- **Viele Pixel-Icons**, Text steht im Tooltip. Jede Ressource, jeder Raum, jeder Zauber und jeder Skillknoten bekommt ein Icon.
- **Hintergründe leicht animiert:** Schnee, Rauch, Sterne, Fackelflackern. Die Partikel kommen aus Objekt-Pools.
- **Tag und Nacht wechseln im Spiel** (Vorschlag: koppeln an die Jahreszeiten-Uhr, ein Tag pro Jahreszeit), und die Helligkeit der Oberfläche folgt mit.
- **Mehr Effekte als jetzt:**
  - Treffer-Blitz und Schadenszahlen
  - kurzer Shake bei Krit und Meilenstein
  - Münzen, die in die Ressourcenleiste fliegen
  - Glühen bei Level-Up

  „Bewegung reduzieren“ schaltet alles ab.
- **Epochen:** Jede Epoche bekommt später einen **komplett eigenen Look**: Farben, Rahmen, Hintergründe, Räume (die Bibliothek wird zum Rechenzentrum usw.). Bau das Theme-System von Anfang an so, dass eine Epoche ein Datensatz ist (Palette, Hintergründe, Raum-Kulissen). Umgesetzt wird aber **zuerst nur Epoche 1**, siehe Etappen.

### 5. Grafik: neue Sprite-Pipeline

Die heutigen Sprites werden als ca. 16×16-Textraster im Code gezeichnet und sind zu grob. Neu:

- **PNG-Sprite-Sheets, per Skript erzeugt** (Alex' Entscheidung), z. B. `scripts/sprites/` → `public/sprites/*.png` + Atlas-JSON für PixiJS. Das Skript läuft deterministisch und wird über `npm run sprites` gestartet. Die erzeugten PNGs werden mit eingecheckt. Eine kleine Dev-Abhängigkeit für das PNG-Schreiben ist ok. In `ASSETS.md` stehen sie als eigenes Werk.
- **Figuren 32×32** (Alex' Entscheidung), mit 1 px dunklem Umriss und 3–4 Tonstufen je Material. Licht fällt von oben links. Klassen sind an Silhouette und Farbe unterscheidbar.
- **Animationen:** je Figur mindestens Idle (2–4 Frames), Laufen, Angriff und Treffer. Aliens bekommen Idle/Schweben und Treffer.
- **Isometrische Gebäude und Gelände** für den Bauplatz: Rautenkacheln (Vorschlag 64×32 Grundfläche). Gebäude haben Höhe, Fenster mit Licht und je Level-Meilenstein eine sichtbare Ausbaustufe.
- **Kulissen** in Parallax-Ebenen: Himmel, Berge, Wald, Boden, Meteorkrater mit Rauch, Turm und Mauer mit Fackeln.
- **Darstellung:** feste interne Auflösung in 16:9 mit ganzzahliger Skalierung und Nearest-Neighbor, damit die Pixel scharf bleiben. Auf anderen Seitenverhältnissen wird die Kulisse erweitert, nicht verzerrt. Es muss auf Laptop, Full HD, WQHD und Ultrawide gut aussehen. Alex spielt meist im Vollbild: Es gibt einen Vollbild-Knopf (Browser und Electron).
- Zeig mir nach den ersten Sprites (Etappe 2) einen Screenshot-Vergleich alt gegen neu, bevor du alle Klassen zeichnest.

### 6. Die wichtigsten Räume im Detail

**Bauplatz (isometrisch)**
- Die Logik bleibt das bestehende Raster mit Nachbarschaft. Isometrisch ist nur die Darstellung.
- Auf dem Raster sichtbar:
  - Nachbarschaftsboni als Linien mit Wert („+15 %“)
  - Produktion pro Gebäude als kleine Zahl
  - Level-Plakette
  - Engpässe rot markiert
  - Sammler als kleine Figuren, die herumlaufen
  - Stromnetz und Verbindungen ab den späteren Epochen
- Gelände (Wald, Fels, Bach) ist als Grafik erkennbar.
- Infos und Ausbau stehen in einer **Seitenleiste** neben dem Raster: Name, Level, Beschreibung, Produktion mit Formel, Boni-Liste, Meilenstein-Balken, Arbeiter-Slots, Knopf „Ausbauen“ mit Kosten.
- **Bau-Modus:** Ein Katalog am unteren Rand. Wählt man ein Gebäude, zeigt jedes freie Feld eine Vorschau, welchen Bonus es dort bekäme (grün = Bonus, grau = keiner). Mausrad-Zoom ist nicht nötig.

**Übungsplatz (Skilltrees)**
- Links die Klassenliste mit Sprite und freien Punkten. In der Mitte der Baum als Graph mit Icon-Knoten und Verbindungslinien, die Spezialisierung als sichtbare Gabelung (Weg A / Weg B, Entweder-oder). Rechts die Detailleiste: Rang, Wirkung jetzt, nächster Rang, Formel, Knopf „Skillpunkt setzen“.
- Knotenzustände: gelernt, voll, verfügbar, gesperrt. Sie sind auf einen Blick unterscheidbar, nicht nur über die Farbe.
- Übersichtlich, auch wenn Bäume später auf ca. 30 Knoten wachsen.

**Schatzkammer (Buch)**
- Doppelseite: links Bild und Name mit dem Erzähler-Zitat, rechts Steckbrief und Sammelbonus. Kapitel-Reiter unten.
- Umblättern ist animiert. Noch nicht gefundene Einträge erscheinen als Silhouette mit „???“.

Kaserne, Bibliothek, Werkstatt, Thronsaal, Chronik-Turm, Archiv und Markt bekommen denselben Aufbau: Kulisse, schwebende Flächen und Icons. Die Inhalte bleiben wie heute, nur neu angeordnet.

### 7. Übergänge

- **Kampf ↔ Dorf:** Ein Tor schließt sich und öffnet sich wieder, mit Text („Zur Mauer!“ / „Ins Dorf …“). Der Wechsel passiert, während das Tor zu ist. Dauer ca. 1,2–1,5 s.
- **Zwischen Räumen:** kurzer Wechsel mit Gleiten oder Überblenden, max. 0,3 s.
- **Im Buch:** Seite wird umgeblättert.
- **Neue Räume:** Zwischensequenz des Erzählers (siehe §2).
- Mit „Bewegung reduzieren“ werden alle Übergänge zu einem schlichten Schnitt.

### 8. Etappen

Jede Etappe bekommt einen eigenen Branch und einen eigenen PR (Regeln in CLAUDE.md). Am Ende jeder Etappe:
- `npm run check` und `npm run test:e2e` sind grün.
- Playwright-Screenshots der neuen Ansichten liegen in `test-results/`.
- Eine kurze deutsche Zusammenfassung: was neu ist, wie Alex es testet, offene Fragen.
- `docs/design.md` ist nachgezogen (neuer Abschnitt „UI-Umbau“).

1. **Szenen-Gerüst:**
   - Phasen Kampf/Dorf mit Szenen-Manager und Tor-Übergang.
   - Reiterleiste mit Räumen; die bestehenden Panels ziehen in ihre Räume um, vorerst in alter Optik.
   - Gefilterte Ressourcenleiste, Erzählerfigur mit Sprechblase und Verlauf, Toasts.
   - Ereignis-Pause, Hofbefehl-Countdown, Ergebnisfenster.
   - Bot und Simulation angepasst, Spielstand-Migration falls nötig.
2. **Grafik-Pipeline und Schlachtfeld:** Sprite-Skript, Atlas, 32×32-Figuren für die Klassen und Aliens von Epoche 1, Kulisse in Ebenen, HUD-Overlay, mehr Effekte. Danach den Screenshot-Vergleich zeigen und kurz auf Alex' Rückmeldung warten.
3. **Bauplatz isometrisch** mit Seitenleiste und Bau-Modus.
4. **Übungsplatz und Kaserne.**
5. **Schatzkammer-Buch und die übrigen Räume**, mit Erzähler-Zwischensequenzen.
6. **Feinschliff Epoche 1:** Tag/Nacht, Hinweise des Erzählers, animierte Hintergründe, Effekte, Vollbild, Prüfung auf allen Bildschirmgrößen.
7. **Später, erst nach Rückfrage:** eigene Looks für die Epochen 2–5.

### 9. Qualitätsregeln für den Umbau

- Kein Spielstandverlust: Alte Spielstände laden weiter, mit Migration und Test.
- Die Logik bleibt ohne DOM testbar. Phasen, Pausen, Countdown und Hinweise liegen in `systems/` und haben Unit-Tests.
- Alle neuen Texte stehen in `i18n/` (de/en).
- Flüssig nach Stunden: Objekt-Pools, keine Lecks, die UI wird nur bei Änderungen aktualisiert.
- Nicht überladen: Pro Raum ist nur sichtbar, was dort gebraucht wird. Im Zweifel weniger zeigen und den Rest in den Tooltip.
- Keine Namen, Grafiken oder Texte aus anderen Spielen übernehmen.
- Vor Designentscheidungen, die hier nicht stehen und den Spielcharakter ändern: als Auswahldialog fragen (Alex klickt lieber, als Text zu schreiben).

### 10. Erste Aufgabe

Lies alles aus §0. Schreib die Zusammenfassung deines technischen Plans. Leg den Branch für Etappe 1 an und fang mit dem Szenen-Gerüst an.
