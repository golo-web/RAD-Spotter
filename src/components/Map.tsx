import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Tent, Zap, MapPin, Hotel, Caravan, TrainFront } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PoiType, type POI, type Route } from '../types';
import { cn } from '../lib/utils';

// Custom icons using Lucide and Tailwind
const createCustomIcon = (icon: React.ReactNode, color: string) => {
  return L.divIcon({
    html: renderToStaticMarkup(
      <div className={`p-2 rounded-full shadow-lg border-2 border-white ${color} text-white hover:scale-110 transition-transform`}>
        {icon}
      </div>
    ),
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const campsiteIcon = createCustomIcon(<Tent size={20} />, 'bg-natural-accent');
const stellplatzIcon = createCustomIcon(<Caravan size={20} />, 'bg-amber-600');
const ebChargerIcon = createCustomIcon(<Zap size={20} />, 'bg-natural-primary');
const hotelIcon = createCustomIcon(<Hotel size={20} />, 'bg-indigo-600');
const trainStationIcon = createCustomIcon(<TrainFront size={20} />, 'bg-slate-700');
const currentLocationIcon = createCustomIcon(<MapPin size={20} />, 'bg-natural-text');

interface MapProps {
  route: Route | null;
  pois: POI[];
  currentLocation: [number, number] | null;
  selectedPoiId: string | null;
}

// Controller to auto-fit map correctly
function MapController({ route, currentLocation, pois, selectedPoiId }: { 
  route: Route | null, 
  currentLocation: [number, number] | null,
  pois: POI[],
  selectedPoiId: string | null
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPoiId) {
      const poi = pois.find(p => p.id === selectedPoiId);
      if (poi) {
        map.setView([poi.lat, poi.lng], 16, { animate: true });
      }
    } else if (route && route.points.length > 0) {
      const bounds = L.latLngBounds(route.points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (currentLocation) {
      map.setView(currentLocation, 13);
    }
  }, [route, currentLocation, map, selectedPoiId, pois]);

  return null;
}

export default function Map({ route, pois, currentLocation, selectedPoiId }: MapProps) {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setMapReady(true);
  }, []);

  if (!mapReady) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400 font-medium">Initializing Map...</div>;

  return (
    <MapContainer
      center={currentLocation || [51.1657, 10.4515]}
      zoom={currentLocation ? 13 : 6}
      scrollWheelZoom={true}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapController 
        route={route} 
        currentLocation={currentLocation} 
        pois={pois}
        selectedPoiId={selectedPoiId}
      />

      {currentLocation && (
        <Marker position={currentLocation} icon={currentLocationIcon}>
          <Popup>Current Location</Popup>
        </Marker>
      )}

      {route && route.points.length > 0 && (
        <Polyline
          positions={route.points.map(p => [p.lat, p.lng])}
          color="#5a5a40"
          weight={4}
          opacity={0.8}
          dashArray="8, 6"
        />
      )}

      {pois.map(poi => (
        <Marker
          key={poi.id}
          position={[poi.lat, poi.lng]}
          icon={
            poi.type === PoiType.CAMPSITE ? campsiteIcon : 
            poi.type === PoiType.STELLPLATZ ? stellplatzIcon :
            poi.type === PoiType.TRAIN_STATION ? trainStationIcon :
            poi.type === PoiType.HOTEL ? hotelIcon : ebChargerIcon
          }
          ref={(ref) => {
            if (ref && selectedPoiId === poi.id) {
              ref.openPopup();
            }
          }}
        >
          <Popup>
            <div className="p-2 min-w-[200px] font-sans">
              <span className={cn(
                "text-[9px] uppercase font-bold tracking-widest",
                poi.type === PoiType.CAMPSITE ? 'text-natural-accent' : 
                poi.type === PoiType.STELLPLATZ ? 'text-amber-600' :
                poi.type === PoiType.TRAIN_STATION ? 'text-slate-700' :
                poi.type === PoiType.HOTEL ? 'text-indigo-600' : 'text-natural-primary'
              )}>
                {poi.type === PoiType.CAMPSITE ? 'Campingplatz' : poi.type === PoiType.STELLPLATZ ? 'Stellplatz' : poi.type === PoiType.HOTEL ? 'Hotel' : poi.type === PoiType.TRAIN_STATION ? 'Bahnhof' : 'E-Bike Station'}
              </span>
              <h3 className="font-serif font-bold text-base text-natural-text mt-0.5 mb-2 leading-tight">{poi.name}</h3>
              
              <div className="space-y-1.5 border-t border-natural-border pt-2 overflow-hidden">
                {Object.entries(poi.tags).map(([key, value]) => {
                  if (['name', 'type', 'id', 'tourism', 'amenity', 'source'].includes(key)) return null;
                  return (
                    <div key={key} className="text-[10px] text-natural-muted flex gap-1 items-baseline">
                      <span className="font-bold text-natural-text/40 uppercase tracking-tight whitespace-nowrap">{key.replace(/_/g, ' ')}:</span>
                      <span className="truncate">{value}</span>
                    </div>
                  );
                })}
              </div>

              {poi.tags.source && (
                 <div className="mt-2 text-[8px] text-natural-muted/60 uppercase font-bold tracking-tighter">
                   Quelle: {poi.tags.source}
                 </div>
              )}

              <div className="mt-4 space-y-2">
                 <a 
                   href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${poi.name} ${poi.lat},${poi.lng}`)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="block w-full text-center text-[10px] py-1.5 bg-white border border-natural-border hover:bg-natural-bg text-natural-text rounded-lg no-underline font-bold uppercase tracking-wider transition-colors"
                 >
                   Google Maps Adresse
                 </a>
                 <a 
                   href={`https://www.google.com/maps/dir/?api=1&destination=${poi.lat},${poi.lng}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="block w-full text-center text-[10px] py-1.5 bg-natural-primary hover:bg-natural-primary/90 text-white rounded-lg no-underline font-bold uppercase tracking-wider transition-colors shadow-sm"
                 >
                   Route berechnen
                 </a>
                 
                 {(poi.type === PoiType.CAMPSITE || poi.type === PoiType.STELLPLATZ) && (
                   <a 
                     href={`https://www.camping.info/de/suche?q=${encodeURIComponent(poi.name)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="block w-full text-center text-[10px] py-1.5 bg-white border border-natural-border hover:bg-natural-bg text-natural-text rounded-lg no-underline font-bold uppercase tracking-wider transition-colors"
                   >
                     Camping.info Suche
                   </a>
                 )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
