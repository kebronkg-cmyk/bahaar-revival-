# BaHaar’s Styling Studio · Website

Neue Website für **BaHaar’s Styling Studio**, Friseurmeisterin Bahar in Giesing, München.
Designsprache: **Liquid Glass** in Lavendel und Violett, echte Haarergebnisse aus dem Studio im Mittelpunkt, echte blaue Orchideen als Begleiter. Im Hero schaut eine Schere aus einem Orchideenbusch heraus.

## Seiten

| Datei | Inhalt |
| --- | --- |
| `index.html` | Startseite: Hero mit Schere im Orchideenbusch (am Rechner mit WebGL Glastropfen, am Handy als leichte Glaskarte), Leistungen, Über Bahar, Unser Studio (lila verblendet, echte Farben per Schalter), Preisausschnitt, Brautstyling, Galerie mit Lightbox, fließende Bewertungen, Kontakt mit Live-Öffnungsstatus |
| `preise.html` | Komplette Preisliste (32 Leistungen) mit Suche (versteht Umlaute und Tippfehler), Kategorienavigation, Haarlängenschalter und Terminplaner |
| `impressum.html`, `datenschutz.html` | Rechtliches (bitte vor Livegang prüfen lassen) |
| `404.html` | Fehlerseite |

Statische Website ohne Buildschritt. Einfach alle Dateien auf den Webspace laden.

## Häufige Änderungen

- **Preise**: direkt in `preise.html` (jede Leistung ist ein `<li class="svc">` mit `data-p1` = Preis kurz/mittel, `data-p2` = Preis lang, `data-p1max` = Obergrenze bei Spannen, `data-dur` = Dauer in Minuten). Den Ausschnitt auf der Startseite (`index.html`, Abschnitt „Preise“) bitte mitpflegen.
- **Öffnungszeiten**: an drei Stellen: `HOURS` in `assets/js/site.js` (Live-Status), die Tabelle in `index.html` (`data-hours`) und der Footer. Außerdem `openingHoursSpecification` im JSON-LD von `index.html`.
- **Bewertungen**: in `index.html` im Abschnitt „Stimmen“ (`data-row="1"` oder `"2"` bestimmt die Laufreihe).
- **Header & Footer**: nur in `index.html` bearbeiten und danach `node tools/sync-partials.mjs` ausführen. Das überträgt die Blöcke in alle Unterseiten.
- **Texte**: warm, freundlich, in Du-Form und ohne Gedankenstriche. Preisspannen als „60 bis 90 €“.

## Technik

- Reines HTML/CSS/JavaScript, keine Abhängigkeiten, keine Cookies, kein Tracking.
- Schriften (Instrument Serif, Plus Jakarta Sans) lokal eingebunden, also DSGVO-freundlich ohne Verbindung zu Google Fonts.
- Hero am Rechner (breites Fenster, Maus): WebGL2-Shader mit flüssigen Glastropfen (Brechung, chromatische Aberration, Verschmelzen per Smooth-Min), die der Maus folgen. Beim Scrollen öffnet sich der Busch und die Schere tritt nach vorn. Die Auflösung passt sich bei schwachen Rechnern an, außerhalb des Sichtbereichs pausiert der Shader.
- Hero auf Handy und Tablet: kein Shader und keine Tropfen, sondern scharfe Bilder mit einer kurzen Einblendung und einer Glaskarte mit Titel, Buchen, Preisen und Anrufen. Bewegte Hintergründe und Korn sind dort abgeschaltet, damit Glas und Scrollen flüssig bleiben.
- Online-Buchung über Salonized im Glas-Dialog (wird erst beim Klick geladen), OpenStreetMap-Karte erst nach Klick.
- `prefers-reduced-motion` wird respektiert; Tastatur-Bedienung, Fokus-Stile und ARIA-Rollen für Tabs, Radiogruppen und Dialoge.
- `.htaccess` leitet die alten Adressen (`/preise`, `/galerie`, `/impressum`, `/datenschutzerklarung`) weiter und aktiviert Kompression & Caching.

## Bildnachweise

- Fotos aus dem Studio, Porträt und Arbeitsbeispiele: BaHaar’s Styling Studio
- Schere im Hero: Vorlage von Pinterest, **Bildrechte vor dem Livegang klären** (oder durch ein eigenes Foto ersetzen)
- Orchideenblüte: Jan Dommerholt (Unsplash-Lizenz)
- Orchideenzweig: Marko Bugarski (Unsplash-Lizenz)
- Schriften: SIL Open Font License (siehe `assets/fonts/`)

## Lokal ansehen

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```
