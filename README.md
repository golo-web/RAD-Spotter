# RAD-Spotter: Der Touren-Begleiter

RAD-Spotter ist eine spezialisierte Web-Anwendung für Radreisende und E-Biker. Sie ermöglicht es, GPX-Routen hochzuladen und entlang dieser Route gezielt nach Unterkünften (Campingplätze, Hotels) und E-Bike-Ladestationen zu suchen.

## 🚀 Funktionen

- **GPX-Integration:** Upload und Visualisierung von Fahrradrouten.
- **Intelligente Umkreissuche:** Suche nach Points of Interest (POI) in einem definierbaren Radius (1-50 km) entlang des gesamten Routenverlaufs.
- **Kategorien-Filter:**
  - **Campingplätze:** Suche nach Zelt- und Stellplätzen.
  - **Stellplätze:** Detaillierte Filter für Wohnmobile, Wohnwagen und Zelte (Radreisende).
  - **Hotels:** Inklusive Filterung nach Hotel-Kategorie (Sterne).
  - **Bahnhöfe:** Anzeige von Bahnhöfen für die An- und Abreise oder Etappenplanung.
  - **E-Bike Ladestationen:** Anzeige von öffentlich zugänglichen Ladepunkten.
- **PLZ-Suche:** Intelligente Ortssuche für Deutschland mit Autofortschrittung/Vorschlägen (via Nominatim).
- **Detailansicht:** Ausführliche Informationen zu jedem Spot (Kontakt, Website, Öffnungszeiten, Ausstattung).
- **Navigation:** Direkte Links zu Google Maps für Adresssuche und Routenführung.
- **Nutzer-Feedback:** System für Rezensionen und Bewertungen pro Standort.

## 🛠 Genutzte Dienste & APIs

Die Anwendung kombiniert Daten aus mehreren Quellen:

### 1. OpenStreetMap (via Overpass API)
- **Zweck:** Abfrage von Campingplätzen, Hotels und Bahnhöfen.
- **Endpunkt:** `https://overpass-api.de/api/interpreter`
- **Logik:** Nutzt die `around`-Abfrage von Overpass, um Entitäten innerhalb eines Radius um die Koordinatenpunkte der GPX-Datei oder eines Suchorts zu finden.
- **Tags:** Filtert nach `tourism=camp_site`, `tourism=caravan_site`, `tourism=hotel` und `railway=station`.

### 2. Open Charge Map (OCM)
- **Zweck:** Abfrage von E-Bike Ladestationen.

### 3. Nominatim (OpenStreetMap Search)
- **Zweck:** Geocoding und Autocomplete für die Ortssuche in Deutschland.
- **Endpunkt:** `https://nominatim.openstreetmap.org/search`
- **Endpunkt:** `https://api.openchargemap.io/v3/poi/`
- **Logik:** Sucht nach Ladestationen mit spezifischen Filtern für Fahrräder/E-Bikes (`bicycle=yes` oder `socket:ebike=yes`).

## 📦 Installation & Entwicklung

### Voraussetzungen
- Node.js (Version 18 oder höher)
- npm oder yarn

### Schritte
1. **Repository klonen oder herunterladen.**
2. **Abhängigkeiten installieren:**
   ```bash
   npm install
   ```
3. **Entwicklungsserver starten:**
   ```bash
   npm run dev
   ```
4. **Produktions-Build erstellen:**
   ```bash
   npm run build
   ```

## 🏗 Projektstruktur

- `/src/components`: UI-Komponenten (Karte, Sidebar, Filter).
- `/src/services`: Logik für API-Aufrufe (`overpassService.ts`, `chargingService.ts`).
- `/src/lib`: Hilfsfunktionen (z.B. GPX-Parsing, Styling-Utilities).
- `/src/types.ts`: Zentrale TypeScript-Definitionen.

## 💡 Ideen zur Reproduktion & Erweiterung

Um das Projekt weiterzuentwickeln oder für andere Zwecke anzupassen, könnten folgende Punkte interessant sein:
- **Offline-Modus:** Caching der Suchergebnisse via Service Worker für Regionen mit schlechtem Empfang.
- **Höhenprofil:** Anzeige des Höhenprofils der geladenen GPX-Datei.
- **Wetter-Integration:** Abfrage aktueller Wetterdaten für die Zielregionen entlang der Route.
- **Echtzeit-Verfügbarkeit:** Integration von Buchungssystemen für Hotels oder Status-Abfragen für Ladestationen.
