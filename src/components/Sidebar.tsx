import React, { useState } from 'react';
import { Upload, Navigation, MapPin, Search, Filter, Tent, Zap, Loader2, Info, LayoutGrid, Globe, Phone, Clock, ExternalLink, X, ChevronDown, ChevronUp, Sparkles, Hotel, Star, MessageSquare, User, TrainFront } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GpxParser from 'gpxparser';
import { cn } from '../lib/utils';
import { PoiType, type Route, type POI } from '../types';

interface SidebarProps {
  onRouteLoaded: (route: Route) => void;
  onSearchNearby: () => void;
  onSearchLocation: (query: string) => void;
  isLoading: boolean;
  pois: POI[];
  radius: number;
  onRadiusChange: (radius: number) => void;
  error: string | null;
  onError: (error: string | null) => void;
  selectedPoiId: string | null;
  onSelectPoi: (id: string | null) => void;
}

export default function Sidebar({ 
  onRouteLoaded, 
  onSearchNearby, 
  onSearchLocation,
  isLoading, 
  pois, 
  radius, 
  onRadiusChange, 
  error, 
  onError,
  selectedPoiId,
  onSelectPoi
}: SidebarProps) {
  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilter, setActiveFilter] = useState<PoiType | 'all'>('all');
  const [campingType, setCampingType] = useState<'all' | PoiType.CAMPSITE | PoiType.STELLPLATZ>('all');
  const [vehicleType, setVehicleType] = useState<'all' | 'motorhome' | 'caravan' | 'tent'>('all');
  const [minStars, setMinStars] = useState<number>(0);
  const [maxStars, setMaxStars] = useState<number>(5);
  const [minRating, setMinRating] = useState<number>(0);
  const [hasWlan, setHasWlan] = useState(false);
  const [hasPool, setHasPool] = useState(false);
  const [allowsDogs, setAllowsDogs] = useState(false);
  const [priceRange, setPriceRange] = useState<'all' | 'free' | 'paid'>('all');
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (file.name.endsWith('.gpx')) {
          const gpx = new GpxParser();
          gpx.parse(content);
          
          if (gpx.tracks.length === 0 && gpx.routes.length === 0) {
            throw new Error('Keine Tracks in der GPX-Datei gefunden.');
          }

          const points = gpx.tracks[0]?.points || gpx.routes[0]?.points;
          onRouteLoaded({
            points: points.map(p => ({ lat: p.lat, lng: p.lon, ele: p.ele, time: p.time })),
            name: gpx.metadata.name || file.name,
          });
        }
      } catch (err: any) {
        onError(err.message || 'Fehler beim Parsen der Datei. Stellen Sie sicher, dass es eine valide GPX ist.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  // Handle suggestions
  React.useEffect(() => {
    if (locationQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&countrycodes=de&format=json&addressdetails=1&limit=5`);
        const data = await response.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [locationQuery]);

  const handleSuggestionClick = (suggestion: any) => {
    setLocationQuery(suggestion.display_name);
    setShowSuggestions(false);
    onSearchLocation(suggestion.display_name);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locationQuery.trim()) {
      onSearchLocation(locationQuery);
      setShowSuggestions(false);
    }
  };

  const campsites = pois.filter(p => p.type === 'campsite');
  const chargers = pois.filter(p => p.type === 'eb_charger');

  const selectedPoi = pois.find(p => p.id === selectedPoiId);
  
  const filteredPois = React.useMemo(() => {
    return pois.filter(p => {
      const typeMatch = activeFilter === 'all' 
        ? true 
        : activeFilter === PoiType.CAMPSITE 
          ? (p.type === PoiType.CAMPSITE || p.type === PoiType.STELLPLATZ)
          : p.type === activeFilter;
      
      const campingSubMatch = campingType === 'all' || p.type === campingType;
      
      const vehicleMatch = vehicleType === 'all' || (
        (vehicleType === 'tent' && (p.tags.tents !== 'no' && (p.type === PoiType.CAMPSITE || p.tags.tents === 'yes'))) ||
        (vehicleType === 'motorhome' && (p.tags.motorhome !== 'no' && (p.type === PoiType.STELLPLATZ || p.tags.motorhome === 'yes' || p.tags.caravan === 'yes'))) ||
        (vehicleType === 'caravan' && (p.tags.caravans !== 'no' && (p.tags.caravans === 'yes' || p.tags.caravan === 'yes')))
      );

      const stars = parseInt(p.tags.stars || '0');
      const starMatch = activeFilter !== PoiType.HOTEL || (
        (minStars === 0 || stars >= minStars) &&
        (maxStars === 5 || stars <= maxStars)
      );

      // Advanced Camping Filters
      const isCamping = p.type === PoiType.CAMPSITE || p.type === PoiType.STELLPLATZ;
      const wlanMatch = !hasWlan || !isCamping || (
        p.tags.internet_access === 'wlan' || p.tags.wifi === 'yes' || p.tags.internet_access === 'yes'
      );
      const poolMatch = !hasPool || !isCamping || (
        p.tags.swimming_pool === 'yes' || p.tags.amenity === 'swimming_pool' || p.tags.leisure === 'swimming_pool'
      );
      const dogsMatch = !allowsDogs || !isCamping || (
        p.tags.dogs === 'yes' || p.tags.pets === 'yes' || p.tags.dog === 'yes'
      );
      const priceMatch = priceRange === 'all' || !isCamping || (
        (priceRange === 'free' && p.tags.fee === 'no') ||
        (priceRange === 'paid' && p.tags.fee === 'yes')
      );
      
      // Mock rating for demo if not present
      const rating = parseFloat(p.tags.rating || '4.0');
      const ratingMatch = minRating === 0 || rating >= minRating;

      return typeMatch && campingSubMatch && vehicleMatch && starMatch && wlanMatch && poolMatch && dogsMatch && priceMatch && ratingMatch;
    });
  }, [pois, activeFilter, campingType, vehicleType, minStars, maxStars, hasWlan, hasPool, allowsDogs, priceRange, minRating]);

  // Close review form when POI changes
  React.useEffect(() => {
    setIsReviewFormOpen(false);
  }, [selectedPoiId]);

  return (
    <div className="w-80 h-full bg-white border-r border-natural-border flex flex-col shadow-xl z-10 relative">
      <AnimatePresence>
        {selectedPoi && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute inset-0 bg-white z-20 flex flex-col overflow-hidden"
          >
            <div className="p-5 border-b border-natural-border flex justify-between items-center bg-natural-surface/30">
               <div>
                  <span className={cn(
                    "text-[8px] uppercase font-bold tracking-[0.2em] px-2 py-0.5 rounded-full mb-1 inline-block",
                    selectedPoi.type === PoiType.CAMPSITE ? "bg-natural-accent/10 text-natural-accent" : 
                    selectedPoi.type === PoiType.STELLPLATZ ? "bg-amber-100 text-amber-700" :
                    selectedPoi.type === PoiType.TRAIN_STATION ? "bg-slate-100 text-slate-700" :
                    selectedPoi.type === PoiType.HOTEL ? "bg-indigo-100 text-indigo-600" : "bg-natural-primary/10 text-natural-primary"
                  )}>
                    {selectedPoi.type === PoiType.CAMPSITE ? 'Campingplatz' : selectedPoi.type === PoiType.STELLPLATZ ? 'Stellplatz' : selectedPoi.type === PoiType.TRAIN_STATION ? 'Bahnhof' : selectedPoi.type === PoiType.HOTEL ? 'Hotel' : 'Ladestation'}
                  </span>
                  <h3 className="font-serif font-bold text-xl text-natural-text leading-tight flex items-center gap-2">
                    {selectedPoi.name}
                    {selectedPoi.tags.stars && (
                      <div className="flex gap-0.5">
                        {[...Array(parseInt(selectedPoi.tags.stars))].map((_, i) => (
                          <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                        ))}
                      </div>
                    )}
                  </h3>
               </div>
               <button 
                 onClick={() => onSelectPoi(null)}
                 className="p-2 hover:bg-natural-surface rounded-full transition-colors text-natural-muted"
               >
                 <X size={20} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
               {/* Quick Info */}
               <div className="grid grid-cols-2 gap-3">
                  {selectedPoi.tags.operator && (
                    <div className="p-3 bg-natural-bg rounded-xl border border-natural-border">
                       <span className="text-[8px] uppercase font-bold text-natural-muted tracking-widest block mb-1">Betreiber</span>
                       <span className="text-xs font-medium text-natural-text line-clamp-1">{selectedPoi.tags.operator}</span>
                    </div>
                  )}
                  {selectedPoi.tags.source && (
                    <div className="p-3 bg-natural-bg rounded-xl border border-natural-border">
                       <span className="text-[8px] uppercase font-bold text-natural-muted tracking-widest block mb-1">Quelle</span>
                       <span className="text-xs font-medium text-natural-text">{selectedPoi.tags.source}</span>
                    </div>
                  )}
               </div>

               {/* Address & Contact */}
               <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-natural-muted uppercase tracking-[0.2em]">Details & Kontakt</h4>
                  
                  <div className="space-y-3">
                    {/* Description if available */}
                    {(selectedPoi.tags.description || selectedPoi.tags.note || selectedPoi.tags.access_info) && (
                      <div className="p-3 bg-natural-surface/50 rounded-xl border border-natural-border/30 text-xs text-natural-muted italic">
                        {selectedPoi.tags.description || selectedPoi.tags.note || selectedPoi.tags.access_info}
                      </div>
                    )}

                    {/* Address link to Google Maps */}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedPoi.name} ${selectedPoi.lat},${selectedPoi.lng}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 text-sm group"
                    >
                      <MapPin size={18} className="text-natural-accent shrink-0" />
                      <div>
                        <span className="font-medium text-natural-text group-hover:text-natural-accent transition-colors block">Google Maps Adresse</span>
                        <span className="text-xs text-natural-muted">In Google Maps öffnen</span>
                      </div>
                    </a>

                    {(selectedPoi.tags.website || selectedPoi.tags.url) && (
                      <a 
                        href={selectedPoi.tags.website || selectedPoi.tags.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex gap-3 text-sm group"
                      >
                        <Globe size={18} className="text-natural-primary shrink-0" />
                        <div className="overflow-hidden">
                          <span className="font-medium text-natural-text group-hover:text-natural-primary transition-colors block truncate">Website</span>
                          <span className="text-xs text-natural-muted truncate block">{selectedPoi.tags.website || selectedPoi.tags.url}</span>
                        </div>
                      </a>
                    )}

                    {selectedPoi.tags.phone && (
                      <a href={`tel:${selectedPoi.tags.phone}`} className="flex gap-3 text-sm group">
                        <Phone size={18} className="text-emerald-500 shrink-0" />
                        <div>
                          <span className="font-medium text-natural-text group-hover:text-emerald-500 transition-colors block">Telefon</span>
                          <span className="text-xs text-natural-muted">{selectedPoi.tags.phone}</span>
                        </div>
                      </a>
                    )}

                    {selectedPoi.tags.opening_hours && (
                      <div className="flex gap-3 text-sm">
                        <Clock size={18} className="text-amber-500 shrink-0" />
                        <div>
                          <span className="font-medium text-natural-text block">Öffnungszeiten</span>
                          <span className="text-xs text-natural-muted">{selectedPoi.tags.opening_hours}</span>
                        </div>
                      </div>
                    )}
                  </div>
               </div>

               {/* Amenities/Services Section */}
               {selectedPoi.type === PoiType.CAMPSITE && (
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-natural-muted uppercase tracking-[0.2em] flex items-center gap-2">
                       <Sparkles size={12} className="text-amber-500" /> Ausstattung & Services
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                       {[
                         { key: 'power_supply', label: 'Strom', icon: Zap },
                         { key: 'drinking_water', label: 'Trinkwasser', icon: Info },
                         { key: 'shower', label: 'Dusche', icon: Info },
                         { key: 'toilets', label: 'WCs', icon: Info },
                         { key: 'internet_access', label: 'WLAN', icon: Globe },
                         { key: 'dog', label: 'Hunde erlaubt', icon: Info },
                       ].map(item => {
                         const val = selectedPoi.tags[item.key];
                         if (!val || val === 'no') return null;
                         return (
                           <div key={item.key} className="flex items-center gap-2 p-2 bg-natural-bg rounded-lg border border-natural-border/50 text-[10px]">
                              <item.icon size={12} className="text-natural-accent" />
                              <span className="font-medium text-natural-text">{item.label}</span>
                              {val !== 'yes' && <span className="text-[8px] opacity-40 ml-auto">{val}</span>}
                           </div>
                         );
                       })}
                    </div>
                 </div>
               )}

               {/* Tags/Attributes Grid */}
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-natural-muted uppercase tracking-[0.2em]">Alle Eigenschaften</h4>
                    <button 
                      onClick={() => setShowAllDetails(!showAllDetails)}
                      className="text-[10px] text-natural-primary font-bold flex items-center gap-1 hover:underline"
                    >
                      {showAllDetails ? 'Weniger' : 'Mehr'} {showAllDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {(showAllDetails || Object.keys(selectedPoi.tags).length <= 5) && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap gap-2 pt-1">
                          {Object.entries(selectedPoi.tags).map(([key, value]) => {
                            if (['name', 'type', 'id', 'source', 'website', 'url', 'phone', 'opening_hours', 'operator', 'description', 'note', 'access_info'].includes(key)) return null;
                            if (typeof value !== 'string') return null;
                            return (
                              <div key={key} className="px-2.5 py-1 bg-natural-surface rounded-lg border border-natural-border/50 text-[10px]">
                                <span className="font-bold text-natural-muted/60 uppercase mr-1">{key.replace(/_/g, ' ')}:</span>
                                <span className="text-natural-text">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
               </div>

               {/* Reviews Section */}
               <div className="space-y-4 pt-4 border-t border-natural-border/30">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-natural-muted uppercase tracking-[0.2em] flex items-center gap-2">
                       <MessageSquare size={12} className="text-natural-primary" /> Rezensionen
                    </h4>
                    <button 
                      onClick={() => setIsReviewFormOpen(true)}
                      className="text-[10px] text-natural-primary font-bold hover:underline"
                    >
                      Bewertung schreiben
                    </button>
                  </div>

                  {isReviewFormOpen ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-natural-surface rounded-2xl border border-natural-primary/20 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                         <span className="text-[10px] font-bold uppercase text-natural-text">Deine Wertung</span>
                         <div className="flex gap-1">
                           {[1, 2, 3, 4, 5].map(s => (
                             <button 
                               key={s} 
                               onClick={() => setNewReview(prev => ({ ...prev, rating: s }))}
                               className="focus:outline-none"
                             >
                               <Star 
                                 size={16} 
                                 className={cn(
                                   "transition-colors",
                                   s <= newReview.rating ? "text-amber-400 fill-amber-400" : "text-natural-muted/30"
                                 )} 
                               />
                             </button>
                           ))}
                         </div>
                      </div>
                      <textarea 
                        value={newReview.comment}
                        onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                        placeholder="Wie war deine Erfahrung?"
                        className="w-full p-3 bg-white border border-natural-border rounded-xl text-xs focus:ring-2 focus:ring-natural-primary/20 resize-none h-24"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsReviewFormOpen(false)}
                          className="flex-1 py-2 text-[10px] font-bold uppercase tracking-wider text-natural-muted hover:text-natural-text transition-colors"
                        >
                          Abbrechen
                        </button>
                        <button 
                          onClick={() => {
                            // In a real app, send to API/Firebase
                            setIsReviewFormOpen(false);
                            setNewReview({ rating: 5, comment: '' });
                          }}
                          className="flex-1 py-2 bg-natural-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-lg shadow-sm hover:bg-natural-primary/90 transition-colors"
                        >
                          Absenden
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {/* Fake/Placeholder Review */}
                      <div className="space-y-3">
                        <div className="p-3 bg-natural-bg rounded-xl border border-natural-border/50">
                           <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                 <div className="w-6 h-6 rounded-full bg-natural-surface flex items-center justify-center">
                                    <User size={12} className="text-natural-muted" />
                                 </div>
                                 <span className="text-[10px] font-bold text-natural-text">Abenteurer_92</span>
                              </div>
                              <div className="flex gap-0.5">
                                 {[...Array(5)].map((_, i) => (
                                   <Star key={i} size={8} className="text-amber-400 fill-amber-400" />
                                 ))}
                              </div>
                           </div>
                           <p className="text-[11px] text-natural-muted leading-relaxed line-clamp-3">
                             "Ein wirklich toller Spot! Super gepflegt und die Lage ist einfach unschlagbar für eine Übernachtung während der Tour. Kann ich nur empfehlen."
                           </p>
                        </div>

                        {selectedPoi.tags.source === 'Open Charge Map' && (
                           <p className="text-[9px] text-natural-muted/60 italic text-center">
                             Weitere Nutzerkommentare finden Sie direkt bei Open Charge Map.
                           </p>
                        )}
                      </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="p-5 border-t border-natural-border bg-natural-surface/30 space-y-2">
               <a 
                 href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPoi.lat},${selectedPoi.lng}`}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 w-full py-3 bg-natural-primary text-white rounded-2xl font-bold uppercase text-xs tracking-widest shadow-md hover:bg-natural-primary/90 transition-colors"
               >
                 <Navigation size={16} /> Route starten
               </a>
               {selectedPoi.type === PoiType.CAMPSITE && (
                 <a 
                   href={`https://www.camping.info/de/suche?q=${encodeURIComponent(selectedPoi.name)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="flex items-center justify-center gap-2 w-full py-3 bg-white border border-natural-border text-natural-text rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-natural-bg transition-colors"
                 >
                   Camping.info Suche <ExternalLink size={14} />
                 </a>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Input Group: Search & Route */}
        <section className="bg-natural-surface/30 p-3 rounded-2xl border border-natural-border/30 space-y-3">
          <div className="relative group">
            <form onSubmit={handleSearchSubmit}>
              <input 
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="PLZ oder Ort..."
                className="w-full pl-3 pr-9 py-2.5 bg-white border border-natural-border rounded-xl text-xs focus:ring-2 focus:ring-natural-primary/20 transition-all placeholder:text-natural-muted/50"
              />
              <button 
                 type="submit"
                 className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-natural-muted hover:text-natural-primary"
              >
                <Search size={14} />
              </button>
            </form>

            <AnimatePresence>
              {showSuggestions && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-natural-border z-30 overflow-hidden"
                >
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full px-3 py-2 text-left text-[10px] hover:bg-natural-surface transition-colors border-b border-natural-border last:border-none flex items-start gap-2"
                    >
                      <MapPin size={12} className="text-natural-muted shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{s.display_name}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onSearchNearby}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-3 py-2.5 bg-natural-primary hover:bg-natural-primary/90 text-white rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 group"
            >
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
              <span className="font-bold text-[10px] uppercase tracking-wider">In der Nähe</span>
            </button>

            <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-natural-border hover:border-natural-accent rounded-xl cursor-pointer transition-all group">
              <Upload size={14} className="text-natural-muted group-hover:text-natural-accent" />
              <span className="text-[10px] font-bold text-natural-muted uppercase tracking-wider group-hover:text-natural-accent">GPX Tour</span>
              <input type="file" accept=".gpx" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </section>

        {/* Filters Group */}
        <section className="space-y-3 pt-2">
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-[9px] font-bold text-natural-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
                <Filter size={10} /> Suchradius
              </label>
              <span className="text-natural-accent font-bold text-[10px] px-2 py-0.5 rounded-full bg-natural-surface border border-natural-border">{radius} km</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="50" 
              value={radius} 
              onChange={(e) => onRadiusChange(parseInt(e.target.value))}
              className="w-full accent-natural-accent h-1 bg-natural-surface rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 bg-natural-surface/50 p-1 rounded-xl border border-natural-border/30">
            {[
              { id: 'all', label: 'Alle', icon: LayoutGrid },
              { id: PoiType.CAMPSITE, label: 'Camping', icon: Tent },
              { id: PoiType.HOTEL, label: 'Hotel', icon: Hotel },
              { id: PoiType.TRAIN_STATION, label: 'Bahnhof', icon: TrainFront },
              { id: PoiType.EB_CHARGER, label: 'E-Bike', icon: Zap },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveFilter(item.id as any);
                  if (item.id === PoiType.CAMPSITE) {
                     setCampingType('all');
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                  activeFilter === item.id || (activeFilter === PoiType.STELLPLATZ && item.id === PoiType.CAMPSITE)
                    ? "bg-white text-natural-text shadow-sm border border-natural-border/50" 
                    : "text-natural-muted hover:text-natural-text"
                )}
              >
                <item.icon size={12} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Sub-Filters (Contextual) */}


            {(activeFilter === PoiType.CAMPSITE || activeFilter === PoiType.STELLPLATZ) && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-tight">Camping-Typ</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'all', label: 'Alle' },
                      { id: PoiType.CAMPSITE, label: 'Plätze' },
                      { id: PoiType.STELLPLATZ, label: 'Stellplätze' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setCampingType(type.id as any)}
                        className={cn(
                          "flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all",
                          campingType === type.id 
                            ? "bg-natural-accent border-natural-accent text-white" 
                            : "bg-white border-natural-border text-natural-muted hover:border-natural-accent"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-tight">Fahrzeug / Eignung</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'Alle' },
                      { id: 'tent', label: 'Zelt (Rad)' },
                      { id: 'motorhome', label: 'Wohnmobil' },
                      { id: 'caravan', label: 'Wohnwagen' },
                    ].map(v => (
                      <button
                        key={v.id}
                        onClick={() => setVehicleType(v.id as any)}
                        className={cn(
                          "flex-1 min-w-[70px] py-1 rounded-lg border text-[10px] font-bold transition-all",
                          vehicleType === v.id 
                            ? "bg-natural-text border-natural-text text-white" 
                            : "bg-white border-natural-border text-natural-muted hover:border-natural-text"
                        )}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-tight">Ausstattung</label>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'wlan', label: 'WLAN', state: hasWlan, setter: setHasWlan, icon: Globe },
                      { id: 'pool', label: 'Pool', state: hasPool, setter: setHasPool, icon: Sparkles },
                      { id: 'dogs', label: 'Hunde', state: allowsDogs, setter: setAllowsDogs, icon: User },
                    ].map(feat => (
                      <button
                        key={feat.id}
                        onClick={() => feat.setter(!feat.state)}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-bold transition-all",
                          feat.state 
                            ? "bg-natural-accent border-natural-accent text-white" 
                            : "bg-white border-natural-border text-natural-muted hover:border-natural-accent"
                        )}
                      >
                        <feat.icon size={10} />
                        {feat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-tight">Preis & Bewertung</label>
                  <div className="flex gap-2">
                    <select 
                      value={priceRange}
                      onChange={(e) => setPriceRange(e.target.value as any)}
                      className="flex-1 bg-white border border-natural-border rounded-lg px-2 py-1 text-[10px] font-bold text-natural-muted outline-none focus:border-natural-accent"
                    >
                      <option value="all">Preis: Alle</option>
                      <option value="free">Kostenlos</option>
                      <option value="paid">Kostenpflichtig</option>
                    </select>
                    <select 
                      value={minRating}
                      onChange={(e) => setMinRating(parseFloat(e.target.value))}
                      className="flex-1 bg-white border border-natural-border rounded-lg px-2 py-1 text-[10px] font-bold text-natural-muted outline-none focus:border-natural-accent"
                    >
                      <option value="0">Bewertung: Alle</option>
                      <option value="3">3+ Sterne</option>
                      <option value="4">4+ Sterne</option>
                      <option value="4.5">4.5+ Sterne</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeFilter === PoiType.HOTEL && (
              <div className="space-y-4 pt-1">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-tight">Mindest Sterne</label>
                  <div className="flex gap-2">
                    {[0, 3, 4, 5].map(stars => (
                      <button
                        key={stars}
                        onClick={() => {
                          setMinStars(stars);
                          if (stars > maxStars) setMaxStars(stars);
                        }}
                        className={cn(
                          "flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all",
                          minStars === stars 
                            ? "bg-natural-primary border-natural-primary text-white" 
                            : "bg-white border-natural-border text-natural-muted hover:border-natural-primary"
                        )}
                      >
                        {stars === 0 ? 'Alle' : `${stars}+`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-natural-muted uppercase tracking-tight">Maximal Sterne</label>
                  <div className="flex gap-2">
                    {[3, 4, 5].map(stars => (
                      <button
                        key={stars}
                        disabled={stars < minStars && minStars !== 0}
                        onClick={() => setMaxStars(stars)}
                        className={cn(
                          "flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all",
                          maxStars === stars 
                            ? "bg-natural-primary border-natural-primary text-white" 
                            : "bg-white border-natural-border text-natural-muted hover:border-natural-primary",
                          stars < minStars && minStars !== 0 && "opacity-30 cursor-not-allowed"
                        )}
                      >
                        {stars}*
                      </button>
                    ))}
                    <button
                      onClick={() => setMaxStars(5)}
                      className={cn(
                        "flex-1 py-1 rounded-lg border text-[10px] font-bold transition-all",
                        maxStars === 5 && minStars === 0
                          ? "bg-natural-primary border-natural-primary text-white" 
                          : "bg-white border-natural-border text-natural-muted hover:border-natural-primary"
                      )}
                    >
                      Alle
                    </button>
                  </div>
                </div>
              </div>
            )}
        </section>

        {/* Results List */}
        <section className="space-y-3 pt-3 border-t border-natural-border">
          <div className="flex justify-between items-center px-1">
             <h2 className="text-[9px] font-bold text-natural-muted uppercase tracking-[0.2em] flex items-center gap-1.5">
               <Info size={10} /> Treffer ({filteredPois.length})
             </h2>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <AnimatePresence mode="popLayout">
              {filteredPois.length === 0 && !isLoading && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-natural-muted italic text-center py-4"
                >
                  Keine Spots gefunden. Versuchen Sie einen größeren Radius oder anderen Filter.
                </motion.p>
              )}
              {filteredPois.map((poi, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={poi.id}
                  onClick={() => onSelectPoi(poi.id)}
                  className={cn(
                    "p-3 rounded-2xl border transition-all cursor-pointer group hover:shadow-md",
                    selectedPoiId === poi.id 
                      ? "bg-natural-primary border-natural-primary text-white shadow-lg scale-[1.02]" 
                      : "bg-natural-bg border-natural-border text-natural-text hover:border-natural-accent"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-[8px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full",
                      selectedPoiId === poi.id 
                        ? "bg-white/20 text-white" 
                        : poi.type === PoiType.CAMPSITE ? "bg-natural-accent/10 text-natural-accent" : 
                          poi.type === PoiType.STELLPLATZ ? "bg-amber-100 text-amber-700" :
                          poi.type === PoiType.TRAIN_STATION ? "bg-slate-100 text-slate-700" :
                          poi.type === PoiType.HOTEL ? "bg-indigo-100 text-indigo-600" : "bg-natural-primary/10 text-natural-primary"
                    )}>
                      {poi.type === PoiType.CAMPSITE ? 'Camping' : poi.type === PoiType.STELLPLATZ ? 'Stellplatz' : poi.type === PoiType.TRAIN_STATION ? 'Bahnhof' : poi.type === PoiType.HOTEL ? 'Hotel' : 'E-Bike'}
                    </span>
                    {poi.tags.source === 'Open Charge Map' && (
                       <span className="text-[7px] opacity-40 font-bold uppercase tracking-tighter">OCM</span>
                    )}
                  </div>
                  <h4 className={cn(
                    "font-serif font-bold text-sm truncate",
                    selectedPoiId === poi.id ? "text-white" : "text-natural-text"
                  )}>
                    {poi.name}
                  </h4>
                  {poi.tags.operator && (
                    <p className={cn(
                      "text-[10px] truncate mt-0.5 opacity-60",
                      selectedPoiId === poi.id ? "text-white" : "text-natural-muted"
                    )}>
                      {poi.tags.operator}
                    </p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-medium flex justify-between items-start"
          >
            <span className="flex-1">{error}</span>
            <button 
              onClick={() => onError(null)}
              className="ml-2 text-rose-400 hover:text-rose-600 font-bold px-1"
            >
              &times;
            </button>
          </motion.div>
        )}
      </div>

      <div className="p-4 bg-natural-surface/50 border-t border-natural-border">
        <div className="flex items-center gap-2 text-[9px] text-natural-muted font-bold uppercase tracking-widest mb-3">
            <Navigation size={10} />
            <span>Map data &copy; OSM</span>
        </div>
        <div className="w-full h-1 bg-natural-border rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-natural-accent" 
              animate={{ width: isLoading ? '100%' : '0%' }}
              transition={{ duration: isLoading ? 2 : 0, repeat: isLoading ? Infinity : 0 }}
            />
        </div>
      </div>
    </div>
  );
}
