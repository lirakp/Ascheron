# Ascheron

Ein 2D-Open-World-RPG auf Grundlage der Welt-Bibel „Entitäten, Fraktionen & Dungeons“. Gespielt wird im Browser mit Phaser 3 und TypeScript. Alle Grafiken und Sounds werden per Code erzeugt, es gibt keine externen Assets.

## Starten

```bash
npm install
npm run dev        # Entwicklungsserver auf http://localhost:5173
npm run build      # erzeugt dist/ und dist/ascheron.html (eine einzige, eigenständige Datei)
```

## Steuerung

| Wo | Taste |
|---|---|
| Oberwelt & Dungeon | WASD/Pfeile bewegen, Umschalt rennen, E/Leertaste interagieren, Esc Menü |
| Turm (Seitenansicht) | A/D laufen, Leertaste/W springen, W/S an Leitern klettern, E Tafel lesen |
| Kampf | 1–6 Aktionen, Enter/Leertaste Ziel bestätigen, **Leertaste = Parieren**, **Umschalt = Ausweichen** |

## Was aus der Welt-Bibel umgesetzt ist (Version 0.1, Rabenmark)

- **Charaktererstellung:** Alle Völker der Bibel – Mensch, Zwerg, Tiermensch (Wolf, Fuchs, Katze, Bär, Hase), Elf, Dunkelelf – und ihre Halbwesen (Halbzwerg, Halb-Tiermensch, Halbelf, Halb-Dunkelelf), jeweils männlich oder weiblich. Anpassbar sind Haut, Haar und Fell, Frisur, Augen, Bart, Statur, Kleidung und Farben, dazu fünf Trupp-Rollen. Das Volk bestimmt den Mana-Rang (C bis S), die angeborenen Elemente und eine eigene Technik. Halbwesen haben zwei getrennte Manaflüsse samt *Doppelwirken*. Elfen und Tiermenschen zahlen bei menschlichen Händlern mehr.
- **Kampf:** Rundenbasiert mit Zeitleiste nach Tempo. Gegnerangriffe werden mit einem Ring angekündigt. **Goldene** Angriffe lassen sich parieren (knappes Fenster; wer alle Treffer pariert, kontert). **Rote** Angriffe kann man nur ausweichen. Präzise Angriffe und Paraden füllen *Schwung* für Techniken.
- **Magie:** Neun Elemente. Ein Zauber verbindet so viele Elemente, wie der Mana-Rang erlaubt. Alle benannten Zauber der Bibel sind enthalten (Heilung, Stille, Bannlicht, Läuterung, Aschesturm …). Dazu kommen Bruchklang bei Gegensätzen, Überlastung mit Blutung und Ohnmacht, sowie Bücher von Konsortium, Kirche (Licht) und Rostiger Münze (Schatten).
- **Dungeons:** Einweg-Schwelle, Proviant pro Tag und Person, Hunger, Rasträume, Truhen. **Fristen** laufen weiter, während ihr anderswo seid, und stehen still, solange der Trupp im Dungeon lebt. Läuft eine Frist ab, folgen Ausbruch und Blutmond-Chance. Beim **Blutmond** werden Physische Dungeons zu Blut-Dungeons. Alle 8–14 Tage meldet die Gilde neue, zufällig erzeugte Dungeons.
- **Bestiarium als Mechanik:** Hohlmänner stehen wieder auf, bis ein präziser Treffer oder Licht den Kopf abtrennt. Kreidekriecher lauern an der Decke und verraten sich durch rieselnden Staub. Sitzer bewegen sich nur, wenn du nicht hinsiehst oder blinzelst. Bei der Kreidemutter zielst du auf die pochende Flanke. Der Glöckner läutet für alle, die stillstehen, und wird ohne seinen Klöppel wehrlos. Aschhunde vergessen nie, vor ihnen gibt es keine Flucht. Blutgänger erscheinen nur beim Blutmond.
- **Fraktionen & Wirtschaft:** Silber, Gold und Platin mit 2 % Wechselgebühr. Die Gilde erhebt 10 % Blutsteuer, *definiert* schlafende Beute und nimmt Seelenplaketten und Rangprüfungen ab. Die Kirche heilt, löst Flüche, verleiht Licht-Bücher und vermietet Kleriker. Die Rostige Münze verkauft verfluchte A-Ware mit Tribut. Ab Rang A fordert Ausrüstung Tribut (Blut oder Mana).
- **Die Fee der zeitlosen Wünsche:** Statt Game Over gibt es eine Wiederbelebung gegen eine Erinnerung. Du vergisst dann zum Beispiel ein Element, Gefährten vergessen dich, oder die Gilde vergisst deine Taten.
- **Dorn-Dungeons:** Der Dornhag nordöstlich der Stadt (Rang B) und zufällige Dorn-Dungeons.
  - Etwa auf jedem 25. Feld liegt eine Falle: Stacheln, Pfeile oder Ranken. Ein Pfadfinder deckt sie auf und entschärft sie.
  - Rankenweber flicken ausgelöste Fallen wieder und sterben erst, wenn alle ihre Rosenaugen getroffen sind.
  - Boss ist die Gärtnerin. „Zurückschneiden“ trifft immer die Figur, die zuletzt den meisten Schaden gemacht hat. Ihre Herzrose liegt im Dornenkäfig, der sich nur öffnet, wenn sie blüht.
- **Dornen-Tattoo:** Die Prinzessin der Dornen bietet es nach dem Sieg an.
  - Es hebt den Mana-Rang um eine Stufe, bei Halbwesen nur den schwächeren Fluss, und macht immun gegen Dornenfallen.
  - Dafür jagen Inquisitoren den Träger. Händler verlangen mehr, und die Kirche vermietet keine Kleriker mehr.
- **Balancing:** Die Kampfformeln liegen in `src/core/combat.ts`. `npm run balance` simuliert Kern- und Bosskämpfe sowie ganze Dungeon-Durchläufe für Anfänger, durchschnittliche und geübte Spieler.
- **Rabenmark:** Krähenfurt mit sieben Gebäuden, Küste, Moore, Weißer Hang und Nordtor-Ruinen. Dazu Tag und Nacht, Kräuter, Gerüchte, Chronik und die Frist der Verlorenen Königin bis 139 n. S.

## Nächste Ausbaustufen

1. Erinnerungs-Dungeons (getarnt als D/C, Schleifen aktiv/inaktiv, Störenfried-Bruch, Nachhall)
2. Entitäten als Weltereignisse: Feldschmiede des Königs der Stärke, Wolf der Sünden, Sündenklingen
3. Weitere Reiche: Kaldrion, Aurelsfeste, Veyrath, Eschenwacht, Erstarrte Lande (Zeitmotten)
4. Touch-Steuerung, Musik, mehr Gefährten

## Aufbau

```
src/data/     Welt-Bibel als Daten (Völker, Klassen, Magie, Monster, Gegenstände, Aufträge, Kalender)
src/core/     Spielzustand, Speichern, Weltsimulation (Fristen, Blutmond), Karte, Sound
src/gfx/      Prozedurale Pixelgrafik (Figuren, Monster, Kacheln)
src/scenes/   Titel, Oberwelt, Dungeon, Turm (Seitenansicht), Kampf
src/ui/       HTML-Overlay: HUD, Menü, Läden, Charaktererstellung, Fee
```
