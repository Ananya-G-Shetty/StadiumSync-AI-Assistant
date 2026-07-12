'use client';

import React, { useState, useEffect } from 'react';
import { getVenues, getMatchesByVenue } from '@/app/actions';
import { 
  Calendar, 
  MapPin, 
  Download, 
  CheckCircle, 
  WifiOff, 
  Sparkles,
  Info,
  Clock,
  Activity
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import confetti from 'canvas-confetti';

interface MatchItem {
  id: number;
  venueId: string;
  venueName: string;
  venueCity: string;
  homeTeam: string;
  awayTeam: string;
  datetime: Date;
  status: string;
  score: string | null;
}

interface VenueInfo {
  id: string;
  name: string;
}

export default function SchedulePage() {
  const { announceToScreenReader, speak } = useAccessibility();

  // Data states
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedVenueFilter, setSelectedVenueFilter] = useState('all');
  
  // Offline caching state
  const [isSavedOffline, setIsSavedOffline] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState(false);

  // Check if navigator is offline
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOfflineAvailable(!navigator.onLine);
      const handleOnline = () => setOfflineAvailable(false);
      const handleOffline = () => setOfflineAvailable(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check if already cached
      const offlineCache = localStorage.getItem('stadiumsync_offline_schedule');
      if (offlineCache) {
        setIsSavedOffline(true);
      }

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // Load matches
  useEffect(() => {
    async function loadData() {
      try {
        const vList = await getVenues();
        setVenues(vList.map((v: any) => ({ id: v.id, name: v.name })));

        // Pull fixtures for all venues in parallel
        const allMatchesPromises = vList.map(async (v: any) => {
          const raw = await getMatchesByVenue(v.id);
          return raw.map((m: any) => ({
            ...m,
            datetime: new Date(m.datetime),
            venueName: v.name,
            venueCity: v.city
          }));
        });

        const nestedMatches = await Promise.all(allMatchesPromises);
        const flattened = nestedMatches.flat().sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
        
        setMatches(flattened);
        setFilteredMatches(flattened);

        // Backup to localStorage for offline access
        localStorage.setItem('stadiumsync_matches_backup', JSON.stringify(flattened));
      } catch (err) {
        console.warn('Network request failed. Loading matches from offline cache.', err);
        // Fallback to localStorage backup
        const backup = localStorage.getItem('stadiumsync_matches_backup');
        if (backup) {
          const parsed = JSON.parse(backup).map((m: any) => ({
            ...m,
            datetime: new Date(m.datetime)
          }));
          setMatches(parsed);
          setFilteredMatches(parsed);
          setOfflineAvailable(true);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Apply filters
  useEffect(() => {
    if (selectedVenueFilter === 'all') {
      setFilteredMatches(matches);
    } else {
      setFilteredMatches(matches.filter((m: any) => m.venueId === selectedVenueFilter));
    }
  }, [selectedVenueFilter, matches]);

  // Trigger Save for Offline action
  const handleSaveOffline = async () => {
    setSavingOffline(true);
    announceToScreenReader('Downloading schedule data for offline use...');

    // Simulate downloading files/caching assets
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      localStorage.setItem('stadiumsync_offline_schedule', 'true');
      localStorage.setItem('stadiumsync_matches_backup', JSON.stringify(matches));
      
      setIsSavedOffline(true);
      setSavingOffline(false);
      
      // Visual feedback
      confetti({
        particleCount: 60,
        spread: 40,
        origin: { y: 0.8 }
      });

      announceToScreenReader('Schedule successfully saved to your device. Accessible offline.');
      speak('Schedule saved offline.');
    } catch (err) {
      console.error('Offline caching error:', err);
      setSavingOffline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" aria-live="polite">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm font-semibold">Loading tournament schedule...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with offline warning */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">FIFA 2026 Match Schedule</h1>
            <p className="text-[11px] text-muted-foreground font-semibold">Full tournament fixtures and accessibility broadcast details.</p>
          </div>
          
          {offlineAvailable && (
            <span className="flex items-center gap-1 bg-danger/10 text-danger border border-danger/20 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse-live">
              <WifiOff className="h-3 w-3" /> Offline Mode
            </span>
          )}
        </div>

        {/* Offline sync widget */}
        <div className="p-3.5 bg-card border border-border rounded-xl shadow-sm flex items-center justify-between gap-3">
          <div className="space-y-0.5 max-w-[70%]">
            <h2 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              Save for Offline Use
            </h2>
            <p className="text-[10px] text-muted-foreground font-medium leading-normal">
              Network coverage can be congested in 80,000+ seat stadiums. Cache schedules and maps offline now.
            </p>
          </div>

          <button
            onClick={handleSaveOffline}
            disabled={isSavedOffline || savingOffline}
            className={`h-9 px-3.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all ${
              isSavedOffline 
                ? 'bg-secondary/15 text-secondary border border-secondary/30 cursor-default'
                : 'bg-primary hover:bg-primary/95 text-primary-foreground hover:scale-[1.02] active:scale-98'
            }`}
            aria-label={isSavedOffline ? 'Schedule saved offline' : 'Download schedule for offline use'}
          >
            {savingOffline ? (
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-primary-foreground border-t-transparent" />
            ) : isSavedOffline ? (
              <>
                <CheckCircle className="h-4.5 w-4.5" />
                Saved
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Cache
              </>
            )}
          </button>
        </div>
      </section>

      {/* Stadium Filtering Dropdown */}
      <section className="space-y-1.5">
        <label htmlFor="stadium-filter" className="block text-[10px] font-bold text-muted-foreground uppercase">
          Filter by Stadium
        </label>
        <select
          id="stadium-filter"
          value={selectedVenueFilter}
          onChange={(e) => setSelectedVenueFilter(e.target.value)}
          className="w-full h-11 px-3 rounded-xl border border-border bg-card text-xs font-bold focus:ring-1 focus:ring-primary outline-none cursor-pointer"
        >
          <option value="all">🌐 All Stadiums (Fixtures List)</option>
          {venues.map(v => (
            <option key={v.id} value={v.id}>📍 {v.name}</option>
          ))}
        </select>
      </section>

      {/* Matches fixtures lists */}
      <section className="space-y-3" role="region" aria-label="Fixtures List Output">
        {filteredMatches.length === 0 ? (
          <div className="text-center p-8 border border-dashed border-border rounded-xl text-xs text-muted-foreground font-semibold">
            No matches scheduled for this filter.
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMatches.map((m) => {
              const isLive = m.status === 'live';
              const isCompleted = m.status === 'completed';
              
              return (
                <div 
                  key={m.id}
                  className={`p-4 rounded-xl border bg-card shadow-sm flex flex-col gap-3 relative overflow-hidden ${
                    isLive ? 'border-secondary/45 ring-1 ring-secondary/20' : 'border-border'
                  }`}
                >
                  {/* Top bar with stadium and status */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <span className="text-[10px] text-muted-foreground font-bold truncate flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {m.venueName} ({m.venueCity})
                    </span>

                    {isLive ? (
                      <span className="bg-secondary/15 text-secondary text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5 animate-pulse-live">
                        <Activity className="h-2.5 w-2.5" /> LIVE
                      </span>
                    ) : isCompleted ? (
                      <span className="bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 rounded-full">
                        Completed
                      </span>
                    ) : (
                      <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full">
                        Scheduled
                      </span>
                    )}
                  </div>

                  {/* Center bar with match score/time */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-primary/45" />
                        {m.homeTeam}
                      </div>
                      <div className="text-xs font-black text-foreground flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-secondary/45" />
                        {m.awayTeam}
                      </div>
                    </div>

                    <div>
                      {m.score ? (
                        <div className="font-display font-black text-base tracking-widest text-foreground bg-muted/65 px-3 py-1 rounded-lg">
                          {m.score}
                        </div>
                      ) : (
                        <div className="text-right text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {m.datetime.toLocaleTimeString(undefined, { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom bar showing accessibility features */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/40 text-[9px] font-bold text-muted-foreground">
                    <span className="bg-info/10 text-info px-2 py-0.5 rounded flex items-center gap-0.5">
                      🎙️ Audio Described Commentary
                    </span>
                    <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded flex items-center gap-0.5">
                      📺 Open-captioned
                    </span>
                    <span className="bg-accent/15 text-accent-foreground px-2 py-0.5 rounded flex items-center gap-0.5">
                      🗣️ Multilingual Volunteers
                    </span>
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
