# BaHaar’s Styling Studio – Website

Neue Website für **BaHaar’s Styling Studio**, Friseurmeisterin Bahar in München-Giesing.
Designsprache: **Liquid Glass** mit weichem Türkis als Leitfarbe, echte Haar-Ergebnisse aus dem Studio im Mittelpunkt, echte Orchideenblüten als dezente Akzente.

## Seiten

| Datei | Inhalt |
| --- | --- |
| `index.html` | Startseite: Liquid-Glass-Hero (WebGL), Leistungen, Über Bahar, Preis-Ausschnitt, Brautstyling, Galerie mit Lightbox, fließende Bewertungen, Kontakt mit Live-Öffnungsstatus |
| `preise.html` | Komplette Preisliste (32 Leistungen) mit Suche (umlaut- & tippfehlertolerant), Kategorie-Navigation, Haarlängen-Schalter und Termin-Planer |
| `impressum.html`, `datenschutz.html` | Rechtliches (bitte vor Livegang prüfen lassen) |
| `404.html` | Fehlerseite |

Statische Website ohne Build-Schritt – einfach alle Dateien auf den Webspace laden.

## Häufige Änderungen

- **Preise**: direkt in `preise.html` (jede Leistung ist ein `<li class="svc">` mit `data-p1` = Preis kurz/mittel, `data-p2` = Preis lang, `data-p1max` = Obergrenze bei Spannen, `data-dur` = Dauer in Minuten). Den Ausschnitt auf der Startseite (`index.html`, Abschnitt „Preise“) entsprechend mitpflegen.
- **Öffnungszeiten**: an drei Stellen – `HOURS` in `assets/js/site.js` (Live-Status), die Tabelle in `index.html` (`data-hours`) und der Footer. Außerdem `openingHoursSpecification` im JSON-LD von `index.html`.
- **Bewertungen**: in `index.html` im Abschnitt „Stimmen“ (`data-row="1"` oder `"2"` bestimmt die Laufreihe).
- **Header & Footer**: nur in `index.html` bearbeiten und danach `node tools/sync-partials.mjs` ausführen – das überträgt die Blöcke in alle Unterseiten.

## Technik

- Reines HTML/CSS/JavaScript, keine Abhängigkeiten, keine Cookies, kein Tracking.
- Schriften (Instrument Serif, Plus Jakarta Sans) lokal eingebunden – DSGVO-freundlich, keine Google-Fonts-Verbindung.
- Hero: WebGL2-Shader mit flüssigen Glastropfen (Brechung, chromatische Aberration, Verschmelzen per Smooth-Min), folgt Maus/Touch, passt die Auflösung bei schwachen Geräten automatisch an und pausiert außerhalb des Sichtbereichs. Ohne WebGL2 erscheint eine identisch komponierte CSS-Version.
- Online-Buchung über Salonized im Glas-Dialog (wird erst beim Klick geladen), OpenStreetMap-Karte erst nach Klick.
- `prefers-reduced-motion` wird respektiert; Tastatur-Bedienung, Fokus-Stile und ARIA-Rollen für Tabs, Radiogruppen und Dialoge.
- `.htaccess` leitet die alten Adressen (`/preise`, `/galerie`, `/impressum`, `/datenschutzerklarung`) weiter und aktiviert Kompression & Caching.

## Bildnachweise

- Fotos aus dem Studio, Porträt und Arbeitsbeispiele: BaHaar’s Styling Studio
- Orchideenblüte: Jan Dommerholt (Unsplash-Lizenz)
- Orchideenzweig: Marko Bugarski (Unsplash-Lizenz)
- Schriften: SIL Open Font License (siehe `assets/fonts/`)

## Lokal ansehen

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```
