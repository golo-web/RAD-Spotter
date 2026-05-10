import { PoiType, type POI } from '../types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export async function fetchPois(lat: number, lng: number, radiusMs: number): Promise<POI[]> {
  const query = `
    [out:json][timeout:25];
    (
      node["tourism"~"camp_site|caravan_site"](around:${radiusMs},${lat},${lng});
      way["tourism"~"camp_site|caravan_site"](around:${radiusMs},${lat},${lng});
      node["tourism"="hotel"](around:${radiusMs},${lat},${lng});
      way["tourism"="hotel"](around:${radiusMs},${lat},${lng});
      node["railway"="station"](around:${radiusMs},${lat},${lng});
      way["railway"="station"](around:${radiusMs},${lat},${lng});
      node["amenity"="charging_station"]["bicycle"~"yes|designated"](around:${radiusMs},${lat},${lng});
      node["amenity"="charging_station"]["socket:ebike"="yes"](around:${radiusMs},${lat},${lng});
      node["amenity"="bicycle_parking"]["bicycle_parking:charging"="yes"](around:${radiusMs},${lat},${lng});
      node["amenity"="bicycle_parking"]["socket:ebike"="yes"](around:${radiusMs},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
    });

    if (response.status === 429) {
      throw new Error('Overpass API: Zu viele Anfragen. Bitte warten Sie einen Moment.');
    }

    if (!response.ok) {
      throw new Error(`Overpass API Fehler: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    
    if (data.remark && data.remark.includes('timeout')) {
      throw new Error('Overpass API: Zeitüberschreitung bei der Suche. Verringern Sie evtl. den Radius.');
    }
    
    return (data.elements || []).map((el: any) => {
    let type = PoiType.CAMPSITE;
    if (el.tags?.amenity === 'charging_station' || el.tags?.['socket:ebike'] === 'yes' || el.tags?.['bicycle_parking:charging'] === 'yes') {
      type = PoiType.EB_CHARGER;
    } else if (el.tags?.tourism === 'hotel') {
      type = PoiType.HOTEL;
    } else if (el.tags?.railway === 'station') {
      type = PoiType.TRAIN_STATION;
    } else if (el.tags?.tourism === 'caravan_site') {
      type = PoiType.STELLPLATZ;
    }

    return {
      id: `${el.id}`,
      type,
      lat: el.lat || el.center?.lat,
      lng: el.lon || el.center?.lon,
      name: el.tags?.name || (
        type === PoiType.CAMPSITE ? 'Campingplatz' : 
        type === PoiType.STELLPLATZ ? 'Stellplatz' : 
        type === PoiType.HOTEL ? 'Hotel' : 
        type === PoiType.TRAIN_STATION ? 'Bahnhof' :
        'E-Bike Station'
      ),
      tags: { 
        ...(el.tags || {}),
        source: 'OpenStreetMap'
      },
    };
  });
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Ein unbekannter Fehler ist bei der Overpass-Abfrage aufgetreten.');
  }
}

export async function fetchPoisAlongRoute(points: {lat: number, lng: number}[], radiusMs: number): Promise<POI[]> {
  // Sample every 2km for better coverage but fewer points total
  const sampledPoints = points.filter((_, idx) => idx % 10 === 0);
  
  const pointsQueries = sampledPoints.map(p => `
    node["tourism"~"camp_site|caravan_site"](around:${radiusMs},${p.lat},${p.lng});
    way["tourism"~"camp_site|caravan_site"](around:${radiusMs},${p.lat},${p.lng});
    node["tourism"="hotel"](around:${radiusMs},${p.lat},${p.lng});
    way["tourism"="hotel"](around:${radiusMs},${p.lat},${p.lng});
    node["railway"="station"](around:${radiusMs},${p.lat},${p.lng});
    way["railway"="station"](around:${radiusMs},${p.lat},${p.lng});
    node["amenity"="charging_station"]["bicycle"~"yes|designated"](around:${radiusMs},${p.lat},${p.lng});
    node["amenity"="charging_station"]["socket:ebike"="yes"](around:${radiusMs},${p.lat},${p.lng});
    node["amenity"="bicycle_parking"]["bicycle_parking:charging"="yes"](around:${radiusMs},${p.lat},${p.lng});
    node["amenity"="bicycle_parking"]["socket:ebike"="yes"](around:${radiusMs},${p.lat},${p.lng});
  `).join('\n');

  const query = `
    [out:json][timeout:60];
    (
      ${pointsQueries}
    );
    out center;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
    });

    if (response.status === 429) {
      throw new Error('Overpass API: Zu viele Anfragen auf der Route. Bitte warten Sie einen Moment.');
    }

    if (!response.ok) {
      throw new Error(`Overpass API Fehler (Route): ${response.statusText} (${response.status})`);
    }

    const data = await response.json();
    
    if (data.remark && data.remark.includes('timeout')) {
      throw new Error('Overpass API: Die Route ist zu komplex für die Suche. Probieren Sie einen kleineren Radius.');
    }

    const seen = new Set<string>();
    const results: POI[] = [];

    (data.elements || []).forEach((el: any) => {
    if (seen.has(el.id)) return;
    seen.add(el.id);

    let type = PoiType.CAMPSITE;
    if (el.tags?.amenity === 'charging_station' || el.tags?.['socket:ebike'] === 'yes' || el.tags?.['bicycle_parking:charging'] === 'yes') {
      type = PoiType.EB_CHARGER;
    } else if (el.tags?.tourism === 'hotel') {
      type = PoiType.HOTEL;
    } else if (el.tags?.railway === 'station') {
      type = PoiType.TRAIN_STATION;
    } else if (el.tags?.tourism === 'caravan_site') {
      type = PoiType.STELLPLATZ;
    }

    results.push({
      id: `${el.id}`,
      type,
      lat: el.lat || el.center?.lat,
      lng: el.lon || el.center?.lon,
      name: el.tags?.name || (
        type === PoiType.CAMPSITE ? 'Campingplatz' : 
        type === PoiType.STELLPLATZ ? 'Stellplatz' : 
        type === PoiType.HOTEL ? 'Hotel' : 
        type === PoiType.TRAIN_STATION ? 'Bahnhof' :
        'E-Bike Station'
      ),
      tags: { 
        ...(el.tags || {}),
        source: 'OpenStreetMap'
      },
    });
  });

  return results;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Übertragungsfehler bei der Routen-Suche.');
  }
}
