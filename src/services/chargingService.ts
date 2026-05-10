import { PoiType, type POI } from '../types';

const OCM_KEY = (import.meta as any).env.VITE_OPEN_CHARGE_MAP_KEY;
const OCM_URL = 'https://api.openchargemap.io/v3/poi/';

export async function fetchChargingStations(lat: number, lng: number, radiusKm: number): Promise<POI[]> {
  if (!OCM_KEY) {
    console.warn('Open Charge Map API Key missing. Skipping OCM search.');
    return [];
  }

  const params = new URLSearchParams({
    key: OCM_KEY,
    latitude: lat.toString(),
    longitude: lng.toString(),
    distance: radiusKm.toString(),
    distanceunit: 'KM',
    maxresults: '50',
    compact: 'true',
    verbose: 'false',
  });

  try {
    const response = await fetch(`${OCM_URL}?${params}`);
    
    if (response.status === 401 || response.status === 403) {
      throw new Error('Open Charge Map: API Key ungültig oder eingeschränkt.');
    }

    if (!response.ok) {
      throw new Error(`Open Charge Map Fehler: ${response.statusText} (${response.status})`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Open Charge Map: Unerwartetes Datenformat empfangen.');
    }

    return data.map((item: any) => ({
      id: `ocm-${item.ID}`,
      type: PoiType.EB_CHARGER,
      lat: item.AddressInfo.Latitude,
      lng: item.AddressInfo.Longitude,
      name: item.AddressInfo.Title || 'Charging Station',
      tags: {
        operator: item.OperatorInfo?.Title || 'Unknown',
        usage: item.UsageType?.Title || 'Unknown',
        usage_cost: item.UsageCost || 'Unknown',
        address: item.AddressInfo.AddressLine1 || '',
        town: item.AddressInfo.Town || '',
        phone: item.AddressInfo.ContactTelephone1 || '',
        website: item.AddressInfo.ContactEmail ? `mailto:${item.AddressInfo.ContactEmail}` : (item.AddressInfo.RelatedURL || ''),
        access_info: item.AddressInfo.AccessComments || '',
        source: 'Open Charge Map',
      },
    }));
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching from Open Charge Map:', error.message);
      throw error;
    }
    throw new Error('Verbindungsfehler zu Open Charge Map.');
  }
}
