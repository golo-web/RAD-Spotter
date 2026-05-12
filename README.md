# CampingScout

CampingScout ist eine moderne und responsive Web-Anwendung für Radreisende, Camper und E-Biker. Sie ermöglicht es, gezielt nach Unterkünften (Campingplätze, Stellplätze, Hotels), Mobilitäts-Stationen (Bahnhöfe) und Ladepunkten entlang von eigenen GPX-Routen oder in einer bestimmten Umgebung zu suchen.

## 🚀 Aktuelle Funktionen

### 🗺️ Karten- und Ortssuche
- **Interaktive Karte:** Nahtlose Visualisierung von Suchergebnissen, Routen und eigenen Positionen mittels Leaflet.
- **Intelligente Standortsuche:** Eingabe von Postleitzahl (PLZ) oder Ortsnamen in Deutschland mit sofortigen Autocomplete-Vorschlägen.
- **Umkreissuche ("In der Nähe"):** Automatische Ermittlung der naheliegendsten Spots um die aktuelle GPS-Position des Nutzers.
- **Radius-Einstellung:** Slider zur flexiblen Anpassung des Suchradius (1 bis 50 km).

### 🚴 GPX-Routen Integration
- **Touren-Upload:** Einfaches Importieren (.gpx Dateien) eigener Routen.
- **Routen-Darstellung:** Automatische farbliche Markierung des Streckenverlaufs auf der Karte.
- **Streckenbasierte Suche:** Findet passende POIs (Points of Interest) in einem definierten Korridor (Suchradius) entlang der kompletten gefahrenen oder geplanten Strecke.

### 🔍 Detaillierte Filter & Kategorien
Die Anwendung bietet zielgruppengenaue Filterfunktionen:
- **Hauptkategorien:** Alle, Camping/Stellplätze, Hotels, Bahnhöfe, E-Bike Ladestationen.
- **Erweiterte Camping-Filter:**
  - *Fahrzeugart:* Gezielte Suche nach Plätzen für Wohnmobile, Wohnwagen oder Zelte.
  - *Ausstattung:* Filter für WLAN, Pool und erlaubte Haustiere (Hunde).
  - *Preis:* Auswahl zwischen allen Plätzen, explizit kostenlosen oder kostenpflichtigen Spots.
  - *Bewertungen:* Filterung nach Mindest-Sternebewertung (z.B. 3+, 4+, 4.5+).
- **Erweiterte Hotel-Filter:** Filterung der Hotels nach offizieller Sterne-Klassifikation.

### 📋 Detailansicht & Ergebnislisten
- **Ergebnisliste:** Sidebar-Liste aller gefundenen Spots, sortiert nach Relevanz.
- **Loading-States:** Elegante Shimmering-/Skeleton-Animationen (`framer-motion`) während Daten abgerufen werden.
- **Umfassende POI-Details:** 
  - Informationen wie Name, Adressdaten, ggf. Website und Telefonnummer.
  - Schnelle visuelle Übersicht der Ausstattung durch Icons.
- **Navigation Shortcuts:** Entfernungsangaben (Luftlinie) sowie ein Button zur direkten externen Navigationsplanung mit Google Maps.
- **Bewertungssystem (Mock):** Eingabemaske für Nutzer zur Abgabe individueller Kommentare und einer Sterne-Bewertung.

### 📱 Responsive UI & Usability
- **Mobile First Approach:** Die Sidebar kann auf kleinen Bildschirmen per Hamburger-Menü ein- und ausgeblendet werden und fungiert als Overlay mit abgedunkeltem Hintergrund.
- **Zwei-Modus-Design:** Nahtloser Wechsel zwischen allgemeiner _Umkreissuche_ und spezifischer _Tour-Ansicht_.

## 🛠️ Technologien & Komponenten

- **Frontend:** React 18, Vite, TypeScript
- **Styling:** Tailwind CSS
- **Interaktionen & Animationen:** Framer Motion (`motion/react`), Lucide React (Icons)
- **Karten-Library:** Leaflet (`react-leaflet`)

## 📡 Genutzte APIs

- **OpenStreetMap (Overpass API):** Zum effizienten Suchen von Campingplätzen, Stellplätzen, Hotels und Bahnhöfen in bestimmten Bounding-Boxen oder um Koordinaten.
- **Nominatim API (OSM):** Für Geocoding-Funktionen und die PLZ/Orts-Suchvorschläge.

## 💡 Ideen und zukünftige Erweiterungen

- **Echtes Backend (z.B. Firebase / Supabase):** Bislang ist das Bewertungssystem ein UI-Mockup. Mit einem Backend lassen sich Reviews echter Nutzer speichern; ebenso könnten Lieblings-Spots und eigene GPX-Routen fest mit einem Account verknüpft werden.
- **Community-Features:** Freigabe von gefahrenen GPX-Routen inklusive persönlicher POI-Hinweise für andere Nutzer.
- **Offline-Modus:** Caching der Kartendaten, Tiles und zuletzt gesuchter Bereiche via Service Worker / PWA, sehr praktisch in Gegenden mit schlechter Netzabdeckung.
- **Höhenprofil:** Visualisierung der Höhenmeter und Steigungen analog zur eingezeichneten GPX-Routenlinie.
- **Wetter-Modul:** Einblenden eines lokalen Wetterberichts oder einer Wettervorhersage spezifisch für Wegpunkte der Tour.
- **Echtzeit-Verfügbarkeits-Check:** Integration externer APIs von Platzbetreibern oder Hotel-Booking-Systemen, um freie Plätze live darzustellen, bevor man diese anfährt.
