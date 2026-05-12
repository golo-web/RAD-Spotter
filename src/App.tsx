import { useState, useCallback, useEffect } from 'react';
import { Tent, Menu, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import { fetchPois, fetchPoisAlongRoute } from './services/overpassService';
import { fetchChargingStations } from './services/chargingService';
import { cn } from './lib/utils';
import type { Route, POI } from './types';

export default function App() {
  const [route, setRoute] = useState<Route | null>(null);
  const [pois, setPois] = useState<POI[]>([]);
  const [filteredPois, setFilteredPois] = useState<POI[]>([]);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [radius, setRadius] = useState(15);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Auto-close sidebar on mobile after selection or initial load
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load POIs when a route is loaded
  const handleRouteLoaded = useCallback(async (newRoute: Route) => {
    setRoute(newRoute);
    setError(null);
    setIsLoading(true);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    try {
      const osmPois = await fetchPoisAlongRoute(newRoute.points, radius * 1000); // User radius
      
      // Also fetch from OCM for start and end of route at least
      let ocmPois: POI[] = [];
      if (newRoute.points.length > 0) {
        const start = newRoute.points[0];
        const end = newRoute.points[newRoute.points.length - 1];
        try {
          const [ocmStart, ocmEnd] = await Promise.all([
             fetchChargingStations(start.lat, start.lng, radius),
             fetchChargingStations(end.lat, end.lng, radius)
          ]);
          ocmPois = [...ocmStart, ...ocmEnd];
        } catch (ocmError) {
          console.warn('OCM data fetching partially failed:', ocmError);
          // Don't block OSM results if OCM fails
        }
      }

      // Merge and remove duplicates by lat/lng or id
      const merged = [...osmPois];
      const seen = new Set(merged.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`));
      
      ocmPois.forEach(p => {
        const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
        if (!seen.has(key)) {
          merged.push(p);
          seen.add(key);
        }
      });

      setPois(merged);
    } catch (err: any) {
      console.error('Error fetching POIs along route:', err);
      setError(err.message || 'Fehler beim Laden der Route-POIs.');
    } finally {
      setIsLoading(false);
    }
  }, [radius]);

  // Search near current location
  const handleSearchNearby = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation wird von Ihrem Browser nicht unterstützt.');
      return;
    }

    setError(null);
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        setRoute(null); // Clear route if searching nearby

        try {
          const [osmPoisResult, ocmPoisResult] = await Promise.allSettled([
            fetchPois(latitude, longitude, radius * 1000),
            fetchChargingStations(latitude, longitude, radius)
          ]);
          
          const osmPois = osmPoisResult.status === 'fulfilled' ? osmPoisResult.value : [];
          const ocmPois = ocmPoisResult.status === 'fulfilled' ? ocmPoisResult.value : [];

          if (osmPoisResult.status === 'rejected' && ocmPoisResult.status === 'rejected') {
            throw new Error('Beide Dienste (OSM & OCM) konnten nicht erreicht werden.');
          }

          if (osmPoisResult.status === 'rejected') {
            setError('Warnung: OpenStreetMap Daten konnten nicht geladen werden.');
          } else if (ocmPoisResult.status === 'rejected') {
            setError('Warnung: Open Charge Map Daten konnten nicht geladen werden.');
          }

          const merged = [...osmPois];
          const seen = new Set(merged.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`));
          
          ocmPois.forEach(p => {
            const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
            if (!seen.has(key)) {
              merged.push(p);
              seen.add(key);
            }
          });

          setPois(merged);
        } catch (err: any) {
          console.error('Error fetching POIs nearby:', err);
          setError(err.message || 'Fehler bei der Umkreissuche.');
        } finally {
          setIsLoading(false);
        }
      },
      (geoError) => {
        console.error('Geolocation error:', geoError);
        setIsLoading(false);
        setError('Standortzugriff verweigert oder Fehlgeschlagen.');
      },
      { timeout: 10000 }
    );
  }, [radius]);

  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const handleSelectPoi = useCallback((id: string | null) => {
    setSelectedPoiId(id);
    if (id && window.innerWidth < 768) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Search for a specific location (City/Address)
  const handleSearchLocation = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await resp.json();
      
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        setCurrentLocation([latitude, longitude]);
        setRoute(null);
        
        // Trigger POI search at this location
        const [osmPoisResult, ocmPoisResult] = await Promise.allSettled([
          fetchPois(latitude, longitude, radius * 1000),
          fetchChargingStations(latitude, longitude, radius)
        ]);
        
        const osmPois = osmPoisResult.status === 'fulfilled' ? osmPoisResult.value : [];
        const ocmPois = ocmPoisResult.status === 'fulfilled' ? ocmPoisResult.value : [];
        
        const merged = [...osmPois];
        const seen = new Set(merged.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`));
        
        ocmPois.forEach(p => {
          const key = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
          if (!seen.has(key)) {
            merged.push(p);
            seen.add(key);
          }
        });
        
        setPois(merged);
      } else {
        setError(`Ort "${query}" konnte nicht gefunden werden.`);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError('Fehler bei der Ortssuche.');
    } finally {
      setIsLoading(false);
    }
  }, [radius]);

  // Try to get initial location for center without forcing search
  useEffect(() => {
     if (navigator.geolocation && !currentLocation) {
       navigator.geolocation.getCurrentPosition((pos) => {
         setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);
       });
     }
  }, [currentLocation]);

  return (
    <div className="flex flex-col h-screen w-screen bg-natural-bg overflow-hidden font-sans antialiased text-natural-text">
       {/* Top Navigation */}
       <nav className="h-16 md:h-20 border-b border-natural-border px-4 md:px-8 flex items-center justify-between bg-white/50 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 hover:bg-natural-surface rounded-lg text-natural-muted"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="w-8 h-8 md:w-10 md:h-10 bg-natural-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-natural-primary/20">
            <Tent size={18} className="md:size-22" />
          </div>
          <h1 className="text-lg md:text-2xl font-serif font-bold tracking-tight text-[#2d2d1f]">CampingScout</h1>
        </div>
        <div className="hidden sm:flex items-center gap-6">
          <div className="flex bg-natural-surface p-1 rounded-full border border-natural-border/50">
            <button 
              className={cn(
                "px-4 md:px-6 py-1 rounded-full text-xs md:text-sm font-medium transition-all shadow-sm",
                route ? "bg-white text-natural-text" : "text-natural-muted"
              )}
            >
              Tour
            </button>
            <button 
              className={cn(
                "px-4 md:px-6 py-1 rounded-full text-xs md:text-sm font-medium transition-all",
                !route ? "bg-white text-natural-text shadow-sm" : "text-natural-muted"
              )}
            >
              Suche
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={cn(
          "absolute md:relative z-30 h-full transition-transform duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0"
        )}>
          <Sidebar 
            onRouteLoaded={handleRouteLoaded}
            onSearchNearby={handleSearchNearby}
            onSearchLocation={handleSearchLocation}
            isLoading={isLoading}
            pois={pois}
            radius={radius}
            onRadiusChange={setRadius}
            error={error}
            onError={setError}
            selectedPoiId={selectedPoiId}
            onSelectPoi={handleSelectPoi}
            onFilteredPoisChange={setFilteredPois}
          />
        </div>

        {/* Backdrop for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] md:hidden z-20"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        <main className="flex-1 relative h-full">
          <Map 
            route={route}
            pois={filteredPois}
            currentLocation={currentLocation}
            selectedPoiId={selectedPoiId}
          />

          {/* Floating Route Info if available */}
          {route && (
             <div className="absolute top-6 left-6 p-5 bg-white/90 backdrop-blur-md border border-natural-border rounded-3xl shadow-2xl z-10 min-w-64 pointer-events-none">
                <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-natural-accent">GPX Tour Details</span>
                <h1 className="font-serif font-bold text-xl text-natural-text mt-1 truncate">{route.name}</h1>
                
                <div className="mt-4 flex justify-between items-end border-t border-natural-border/50 pt-4">
                   <div>
                      <p className="text-2xl font-serif font-bold text-natural-primary">{route.points.length}</p>
                      <p className="text-[10px] font-bold uppercase text-natural-muted tracking-widest">Wegpunkte</p>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-bold text-natural-text">Aktiv</p>
                      <p className="text-[10px] font-bold uppercase text-natural-muted tracking-widest">Status</p>
                   </div>
                </div>
             </div>
          )}

          {/* Global Loading Overlay (Subtle) */}
          {isLoading && (
              <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] pointer-events-none z-[1000]" />
          )}
        </main>
      </div>
    </div>
  );
}

