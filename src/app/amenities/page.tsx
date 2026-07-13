'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveWaitTimes, updateWaitTime } from '@/app/actions';
import { 
  Search, 
  Filter, 
  Map, 
  Check, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  Accessibility
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

interface AmenityWaitTime {
  amenityId: number;
  name: string;
  type: string;
  location: string;
  waitTimeMinutes: number | null;
  updatedAt: Date | null;
  status: string;
}

export default function AmenitiesPage() {
  const router = useRouter();
  const { announceToScreenReader, speak } = useAccessibility();

  // Selected venue state
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  
  // Data states
  const [rawAmenities, setRawAmenities] = useState<AmenityWaitTime[]>([]);
  const [filteredAmenities, setFilteredAmenities] = useState<AmenityWaitTime[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  // Load selected venue and pull amenities
  useEffect(() => {
    const savedVenueId = localStorage.getItem('selectedVenueId') || 'metlife-stadium';
    setSelectedVenueId(savedVenueId);

    async function loadData() {
      try {
        const data = await getActiveWaitTimes(savedVenueId);
        // Cast or convert Date if needed
        const formatted = data.map((item: any) => ({
          ...item,
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : null
        })) as AmenityWaitTime[];
        
        setRawAmenities(formatted);
        setFilteredAmenities(formatted);
      } catch (err) {
        console.error('Error fetching amenities:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Fluctuate wait times slightly in real-time to simulate live operations and update DB
  useEffect(() => {
    if (rawAmenities.length === 0) return;

    const interval = setInterval(() => {
      rawAmenities.forEach(async (item) => {
        if (item.waitTimeMinutes !== null && (item.type === 'food' || item.type === 'restroom')) {
          // Random shift by -1, 0, or +1 minute (clamped between 2 and 30)
          const shift = Math.floor(Math.random() * 3) - 1;
          const nextWait = Math.max(2, Math.min(30, item.waitTimeMinutes + shift));
          
          if (nextWait !== item.waitTimeMinutes) {
            // Call server action to update waitTimeMinutes in database
            await updateWaitTime(item.amenityId, nextWait);
          }
        }
      });

      // Reload wait times from DB to update client UI reactively
      const refreshData = async () => {
        try {
          const data = await getActiveWaitTimes(selectedVenueId);
          const formatted = data.map((item: any) => ({
            ...item,
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : null
          })) as AmenityWaitTime[];
          setRawAmenities(formatted);
        } catch (err) {
          console.error('Error refreshing wait times:', err);
        }
      };
      refreshData();
    }, 15000); // Shift every 15s

    return () => clearInterval(interval);
  }, [rawAmenities, selectedVenueId]);

  // Apply filters whenever search, category, or accessibility toggles change
  useEffect(() => {
    let result = [...rawAmenities];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        a => a.name.toLowerCase().includes(q) || 
             a.location.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter(a => a.type === categoryFilter);
    }

    if (accessibleOnly) {
      // Elevators, ramps, quiet rooms, relief areas and restrooms containing 'accessible' in name
      result = result.filter(
        a => ['elevator', 'ramp', 'sensory_room', 'relief_area'].includes(a.type) ||
             a.name.toLowerCase().includes('accessible')
      );
    }

    setFilteredAmenities(result);
  }, [searchQuery, categoryFilter, accessibleOnly, rawAmenities]);

  // Navigate to map with target destination preselected
  const handleGetDirections = (amenity: AmenityWaitTime) => {
    // Determine target node id in map coordinates
    let mapMarkerId = '';
    const nameLower = amenity.name.toLowerCase();
    
    if (nameLower.includes('109')) {
      mapMarkerId = 'm1';
    } else if (nameLower.includes('124') || nameLower.includes('toilet') || nameLower.includes('restroom')) {
      mapMarkerId = nameLower.includes('109') ? 'm1' : 'm2';
    } else if (nameLower.includes('elevator bank a') || nameLower.includes('elevator a') || nameLower.includes('elevator bank')) {
      mapMarkerId = 'm3';
    } else if (nameLower.includes('escalator') || nameLower.includes('concourse b') || nameLower.includes('elevator bank b') || nameLower.includes('elevator b')) {
      mapMarkerId = 'm4';
    } else if (nameLower.includes('sensory') || nameLower.includes('quiet')) {
      mapMarkerId = 'm5';
    } else if (nameLower.includes('first aid') || nameLower.includes('medical')) {
      mapMarkerId = 'm6';
    } else if (nameLower.includes('kickoff') || nameLower.includes('eats')) {
      mapMarkerId = 'm7';
    } else if (nameLower.includes('corner') || nameLower.includes('cafe')) {
      mapMarkerId = 'm8';
    } else {
      // Default fallback based on type
      if (amenity.type === 'restroom') mapMarkerId = 'm1';
      else if (amenity.type === 'elevator' || amenity.type === 'ramp') mapMarkerId = 'm3';
      else if (amenity.type === 'sensory_room') mapMarkerId = 'm5';
      else if (amenity.type === 'first_aid') mapMarkerId = 'm6';
      else if (amenity.type === 'food') mapMarkerId = 'm7';
      else mapMarkerId = 'm3';
    }

    speak(`Navigating to ${amenity.name}. Switching to Map view.`);
    announceToScreenReader(`Navigating to ${amenity.name}`);
    router.push(`/map?filter=${amenity.type}&end=${mapMarkerId}`);
  };

  const getAmenityBadgeColor = (type: string) => {
    switch (type) {
      case 'restroom': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'food': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'first_aid': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'elevator':
      case 'ramp': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'sensory_room': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getAmenityIcon = (type: string) => {
    switch (type) {
      case 'restroom': return '🚻';
      case 'food': return '🍔';
      case 'first_aid': return '🚑';
      case 'elevator': return '🛗';
      case 'ramp': return '🪜';
      case 'sensory_room': return '🧩';
      case 'relief_area': return '🐕';
      default: return '📍';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" aria-live="polite">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm font-semibold">Loading amenities & wait times...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <section className="space-y-3">
        <div>
          <h1 className="text-sm font-bold text-foreground">Stadium Amenities Directory</h1>
          <p className="text-[11px] text-muted-foreground font-semibold">Real-time status updates and estimated wait queues.</p>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search food, toilets, elevators, sections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-xs font-semibold focus:ring-1 focus:ring-primary outline-none shadow-sm placeholder:text-muted-foreground/60"
            aria-label="Search Amenities Directory"
          />
        </div>
      </section>

      {/* Filter and Quick Settings bar */}
      <section className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Amenity Types Filter">
          {[
            { id: 'all', label: 'All', emoji: '🔍' },
            { id: 'restroom', label: 'Toilets', emoji: '🚻' },
            { id: 'food', label: 'Food', emoji: '🍔' },
            { id: 'elevator', label: 'Elevators', emoji: '🛗' },
            { id: 'sensory_room', label: 'Sensory', emoji: '🧩' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setCategoryFilter(cat.id);
                announceToScreenReader(`Category filter set to ${cat.label}`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                categoryFilter === cat.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'hover:bg-muted bg-card border-border'
              }`}
              aria-pressed={categoryFilter === cat.id}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer select-none bg-card px-3 py-2 rounded-lg border border-border">
          <input
            type="checkbox"
            checked={accessibleOnly}
            onChange={(e) => {
              setAccessibleOnly(e.target.checked);
              announceToScreenReader(`Accessibility filter ${e.target.checked ? 'activated' : 'disabled'}`);
            }}
            className="rounded text-primary border-border focus:ring-primary h-3.5 w-3.5"
          />
          <Accessibility className="h-4 w-4 text-primary" />
          <span>ADA Primary</span>
        </label>
      </section>

      {/* Amenities Cards List */}
      <section className="space-y-3" role="region" aria-label="Amenities List Output">
        {filteredAmenities.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-2xl text-xs text-muted-foreground font-semibold">
            No amenities match your search criteria. Try a different query.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAmenities.map((item) => {
              const isMaintenance = item.status === 'maintenance';
              const hasWaitTime = item.waitTimeMinutes !== null;
              
              // Determine wait time color coding
              let waitColor = 'bg-success/15 text-success border-success/30';
              if (item.waitTimeMinutes && item.waitTimeMinutes > 20) {
                waitColor = 'bg-danger/15 text-danger border-danger/30';
              } else if (item.waitTimeMinutes && item.waitTimeMinutes >= 10) {
                waitColor = 'bg-warning/15 text-warning border-warning/30';
              }

              return (
                <div
                  key={item.amenityId}
                  className={`p-4 rounded-xl border bg-card transition-all flex items-center justify-between gap-4 shadow-sm ${
                    isMaintenance ? 'border-danger/35 bg-danger/5' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="space-y-1.5 max-w-[70%]">
                    {/* Title with category icon and type badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg">{getAmenityIcon(item.type)}</span>
                      <h3 className="text-xs font-bold text-foreground truncate">{item.name}</h3>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${getAmenityBadgeColor(item.type)}`}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Location detail */}
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      📍 {item.location}
                    </div>

                    {/* Accessibility tags / details */}
                    <div className="text-[10px] text-foreground/80 leading-normal font-medium max-w-sm">
                      {item.name.toLowerCase().includes('accessible') && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded mr-1.5">
                          ♿ Wheelchair ADA
                        </span>
                      )}
                      {item.type === 'sensory_room' && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-info bg-info/10 px-1.5 py-0.5 rounded mr-1.5">
                          🤫 Sensory Friendly
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 text-right">
                    {/* Status Badge */}
                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                      isMaintenance 
                        ? 'bg-danger/20 text-danger border-danger/30 animate-pulse-live' 
                        : 'bg-secondary/15 text-secondary border-secondary/30'
                    }`}>
                      {item.status}
                    </span>

                    {/* Live Wait Time Indicator */}
                    {hasWaitTime && !isMaintenance && (
                      <div className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${waitColor}`}>
                        <Clock className="h-3.5 w-3.5" />
                        <span>Wait: ~{item.waitTimeMinutes}m</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!isMaintenance && (
                      <button
                        onClick={() => handleGetDirections(item)}
                        className="text-[10px] font-bold text-primary hover:text-primary/80 flex items-center gap-0.5 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-lg transition-all"
                        aria-label={`Get step-free directions to ${item.name}`}
                      >
                        Map Route
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
