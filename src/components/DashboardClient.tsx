'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getMatchesByVenue, 
  reportIssue, 
  getRecentFeedback 
} from '@/app/actions';
import { 
  Compass, 
  MapPin, 
  Users, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Activity,
  Volume2,
  VolumeX,
  CloudRain,
  Sun,
  CloudSun,
  Accessibility,
  Signal,
  BellRing,
  HelpCircle,
  TrendingUp,
  Sliders,
  Check,
  ChevronRight,
  Send,
  Eye,
  Type,
  Info
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';
import confetti from 'canvas-confetti';
import WeatherCard from '@/components/WeatherCard';
import MatchTable from '@/components/MatchTable';
import IncidentReportModal from '@/components/IncidentReportModal';

interface Venue {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity: number;
  image: string | null;
  accessibilitySummary: string | null;
  gates: string | null;
}

interface Match {
  id: number;
  venueId: string;
  homeTeam: string;
  awayTeam: string;
  datetime: Date;
  status: string;
  score: string | null;
}

interface Feedback {
  id: number;
  venueId: string;
  category: string;
  description: string;
  location: string;
  status: string;
  reportedAt: Date;
}

interface DashboardClientProps {
  initialVenues: Venue[];
}

export default function DashboardClient({ initialVenues }: DashboardClientProps) {
  const router = useRouter();
  const { announceToScreenReader, speak } = useAccessibility();
  
  // State
  const [venuesList, setVenuesList] = useState<Venue[]>(initialVenues);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [activeVenue, setActiveVenue] = useState<Venue | null>(null);
  const [matchesList, setMatchesList] = useState<Match[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Interactive Form State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Status Check Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Mock Operations Data (based on selected venue)
  const [weatherInfo, setWeatherInfo] = useState({ temp: '79°F', condition: 'Sunny & Clear', humidity: '38%', icon: Sun });
  const [gateTraffic, setGateTraffic] = useState([
    { name: 'Entry 7 (ADA Priority)', waitMinutes: 1, wait: '1 MIN', badge: '7', color: 'text-success border-success/35 bg-success/10' },
    { name: 'Entry 2 (General Gate)', waitMinutes: 10, wait: '10 MINS', badge: '2', color: 'text-warning border-warning/35 bg-warning/10' },
    { name: 'Entry 9 (General Gate)', waitMinutes: 22, wait: '22 MINS', badge: '9', color: 'text-danger border-danger/35 bg-danger/10' },
    { name: 'Entry 12 (ADA Priority)', waitMinutes: 3, wait: '3 MINS', badge: '12', color: 'text-success border-success/35 bg-success/10' },
  ]);
  const [occupancyRates, setOccupancyRates] = useState({ general: 80, ada: 58, sensory: 75 });
  const [trafficFlow, setTrafficFlow] = useState('Moderate');
  const [safetyStatus, setSafetyStatus] = useState('All Clear');

  // Load Venues and default selection
  useEffect(() => {
    setVenuesList(initialVenues);
    
    // Restore previous selection or default to first
    const savedVenue = localStorage.getItem('selectedVenueId');
    const defaultVenueId = savedVenue && initialVenues.some((v: any) => v.id === savedVenue) 
      ? savedVenue 
      : (initialVenues[0]?.id || '');
    
    setSelectedVenueId(defaultVenueId);
    setLoading(false);
  }, [initialVenues]);

  // Load venue specific data when venue changes
  useEffect(() => {
    if (!selectedVenueId) return;

    const venueObj = venuesList.find((v: any) => v.id === selectedVenueId) || null;
    setActiveVenue(venueObj);
    localStorage.setItem('selectedVenueId', selectedVenueId);

    // Dynamic Weather, Traffic & Seating based on selected venue
    if (selectedVenueId === 'metlife-stadium') {
      setWeatherInfo({ temp: '74°F', condition: 'Partly Cloudy', humidity: '55%', icon: CloudSun });
      setGateTraffic([
        { name: 'Gate A (ADA [Americans with Disabilities Act] Priority)', waitMinutes: 2, wait: '2 MINS', badge: 'A', color: 'text-success border-success/35 bg-success/10' },
        { name: 'Gate B (General Entrance)', waitMinutes: 25, wait: '25 MINS', badge: 'B', color: 'text-danger border-danger/35 bg-danger/10' },
        { name: 'Gate C (General Entrance)', waitMinutes: 12, wait: '12 MINS', badge: 'C', color: 'text-warning border-warning/35 bg-warning/10' },
        { name: 'Gate D (General Entrance)', waitMinutes: 4, wait: '4 MINS', badge: 'D', color: 'text-success border-success/35 bg-success/10' },
      ]);
      setOccupancyRates({ general: 82, ada: 58, sensory: 75 });
      setTrafficFlow('Moderate');
      setSafetyStatus('All Clear');
    } else if (selectedVenueId === 'sofi-stadium') {
      setWeatherInfo({ temp: '79°F', condition: 'Sunny & Clear', humidity: '38%', icon: Sun });
      setGateTraffic([
        { name: 'Entry 7 (ADA [Americans with Disabilities Act] Priority)', waitMinutes: 1, wait: '1 MIN', badge: '7', color: 'text-success border-success/35 bg-success/10' },
        { name: 'Entry 2 (General Gate)', waitMinutes: 10, wait: '10 MINS', badge: '2', color: 'text-warning border-warning/35 bg-warning/10' },
        { name: 'Entry 9 (General Gate)', waitMinutes: 22, wait: '22 MINS', badge: '9', color: 'text-danger border-danger/35 bg-danger/10' },
        { name: 'Entry 12 (ADA [Americans with Disabilities Act] Priority)', waitMinutes: 3, wait: '3 MINS', badge: '12', color: 'text-success border-success/35 bg-success/10' },
      ]);
      setOccupancyRates({ general: 80, ada: 62, sensory: 80 });
      setTrafficFlow('Moderate');
      setSafetyStatus('All Clear');
    } else if (selectedVenueId === 'estadio-azteca') {
      setWeatherInfo({ temp: '66°F', condition: 'Scattered Rain', humidity: '78%', icon: CloudRain });
      setGateTraffic([
        { name: 'Torniquetes Insurgentes (ADA)', waitMinutes: 3, wait: '3 MINS', badge: 'TI', color: 'text-success border-success/35 bg-success/10' },
        { name: 'Puerta Oriente (Calzada)', waitMinutes: 35, wait: '35 MINS', badge: 'PO', color: 'text-danger border-danger/35 bg-danger/10' },
        { name: 'Puerta Poniente (General)', waitMinutes: 18, wait: '18 MINS', badge: 'PP', color: 'text-warning border-warning/35 bg-warning/10' },
        { name: 'Túnel 8 de Acceso Especial', waitMinutes: 2, wait: '2 MINS', badge: 'T8', color: 'text-success border-success/35 bg-success/10' },
      ]);
      setOccupancyRates({ general: 91, ada: 74, sensory: 85 });
      setTrafficFlow('Heavy');
      setSafetyStatus('Tactile Aids Open');
    }

    async function loadVenueData() {
      try {
        const mList = await getMatchesByVenue(selectedVenueId);
        setMatchesList(mList);
        
        const fList = await getRecentFeedback(selectedVenueId);
        setFeedbackList(fList);
      } catch (err) {
        console.error('Error loading venue details:', err);
      }
    }
    loadVenueData();
  }, [selectedVenueId, venuesList]);

  const handleVenueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const venueId = e.target.value;
    setSelectedVenueId(venueId);
    announceToScreenReader(`Active stadium switched to ${venuesList.find(v => v.id === venueId)?.name}`);
  };

  const handleReportSubmit = async (category: string, location: string, description: string) => {
    setFormSubmitting(true);
    setFormMessage(null);

    try {
      const result = await reportIssue(
        selectedVenueId,
        category,
        location,
        description
      );

      if (result.success) {
        setFormMessage({ type: 'success', text: 'Operational dispatch request transmitted.' });
        
        announceToScreenReader('Assistance alert submitted successfully. Local dispatcher notified.');
        speak('Assistance alert logged.');

        confetti({
          particleCount: 80,
          spread: 50,
          origin: { y: 0.8 }
        });

        const fList = await getRecentFeedback(selectedVenueId);
        setFeedbackList(fList);
        
        setTimeout(() => {
          setIsReportModalOpen(false);
          setFormMessage(null);
        }, 2200);
      } else {
        setFormMessage({ type: 'error', text: result.error || 'Failed to submit report.' });
      }
    } catch (err: any) {
      setFormMessage({ type: 'error', text: err.message || 'Error occurred.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleQuickAction = (type: string) => {
    router.push(`/map?filter=${type}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" aria-live="polite">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-sm font-semibold">Syncing FIFA Operations Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Header Row Panel */}
      <section className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3.5">
        
        {/* Status Indicators list */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsStatusModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border text-[10px] font-bold text-foreground hover:border-primary/50 active:scale-98 transition-all"
            title="Operational System Syncing Details"
          >
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-live" />
            <span>Live Syncing: All systems operational</span>
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-[10px] font-bold text-foreground">
            <span>🎙️</span>
            <span>Audio Commentary: 88.5 FM</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border text-[10px] font-bold text-foreground">
            <span>🧩</span>
            <span>Sensory Rooms: Open on Level 2</span>
          </div>
        </div>

        {/* Stadium Selector dropdown switcher */}
        <div className="flex items-center gap-2">
          <label htmlFor="venue-switcher" className="sr-only">Switch Venue</label>
          <select
            id="venue-switcher"
            value={selectedVenueId}
            onChange={handleVenueChange}
            className="h-9 px-3 rounded-lg border border-border bg-card font-extrabold text-xs text-foreground cursor-pointer outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all"
          >
            {venuesList.map((v) => (
              <option key={v.id} value={v.id}>
                📍 {v.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Main Grid Layout: Left Column (70%) and Right Column (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Hero, Wait times, Finder, Matches */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Hero Banner Card with stadium background */}
          <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-slate-950 p-6 text-white shadow-lg min-h-[220px] flex items-center">
            <div 
              className="absolute inset-0 bg-cover bg-right bg-no-repeat opacity-40 mix-blend-screen pointer-events-none"
              style={{ backgroundImage: `url('/glowing_stadium_banner.png')`, backgroundSize: 'contain', backgroundPosition: 'right center' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-4 max-w-md">
              <span className="inline-block bg-primary/20 border border-primary/30 text-primary text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest">
                Smart Stadium Platform
              </span>
              
              <div className="space-y-1.5">
                <h1 className="font-display text-3xl font-black tracking-tight leading-none text-white">
                  StadiumSync <span className="text-primary">AI Assist</span>
                </h1>
                <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                  FIFA World Cup 2026
                </h2>
              </div>

              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Real-time accessibility routing, live queue wait-times, incident dispatching, and multilingual Gemini chat support.
              </p>

              <div className="flex flex-wrap gap-2.5 pt-2">
                <button
                  onClick={() => router.push('/map')}
                  className="px-4 h-10 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs shadow-md active:scale-98 transition-all flex items-center gap-1.5"
                >
                  <Compass className="h-4 w-4" />
                  Explore Stadium Map
                </button>
                <button
                  onClick={() => router.push('/chat')}
                  className="px-4 h-10 rounded-xl bg-transparent hover:bg-white/10 border border-white/20 text-white font-black text-xs active:scale-98 transition-all flex items-center gap-1.5"
                >
                  Ask AI Assistant
                </button>
              </div>
            </div>
          </section>

          {/* Live Entrance Wait Times grid */}
          <section className="space-y-3" aria-labelledby="wait-times-heading">
            <div className="flex justify-between items-center">
              <h3 id="wait-times-heading" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                Live Entrance Wait Times
              </h3>
              <button onClick={() => router.push('/map')} className="text-[10px] font-black text-primary uppercase hover:underline">
                View All
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {gateTraffic.map((gate, idx) => (
                <div key={idx} className="p-3 bg-card/45 border border-border rounded-xl flex items-center gap-3 relative shadow-sm hover:border-border/80 transition-all">
                  {/* Circular Badge Icon */}
                  <div className={`h-9 w-9 rounded-full border font-black text-xs flex items-center justify-center flex-shrink-0 ${gate.color}`}>
                    {gate.badge}
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground font-bold leading-tight truncate max-w-[90px]">{gate.name.split(' (')[0]}</div>
                    <div className={`text-xs font-black mt-0.5 ${
                      gate.waitMinutes <= 3 ? 'text-success' : gate.waitMinutes <= 12 ? 'text-warning' : 'text-danger'
                    }`}>
                      {gate.wait}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Assistance Finder colored grids */}
          <section className="space-y-3" aria-labelledby="finder-heading">
            <h3 id="finder-heading" className="text-xs font-black uppercase tracking-wider text-slate-400">
              Quick Assistance Finder
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'restroom', label: 'Accessible Restrooms', emoji: '♿🚻', style: 'border-blue-500/15 bg-blue-950/15 text-blue-400 hover:border-blue-500/40 hover:bg-blue-950/30' },
                { type: 'elevator', label: 'Elevators & Ramps', emoji: '🛗♿', style: 'border-purple-500/15 bg-purple-950/15 text-purple-400 hover:border-purple-500/40 hover:bg-purple-950/30' },
                { type: 'sensory_room', label: 'Sensory Quiet Rooms', emoji: '🧩🤫', style: 'border-emerald-500/15 bg-emerald-950/15 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-950/30' },
                { type: 'first_aid', label: 'First Aid & Medical', emoji: '🚑❤️', style: 'border-rose-500/15 bg-rose-950/15 text-rose-400 hover:border-rose-500/40 hover:bg-rose-950/30' },
              ].map((act) => (
                <button
                  key={act.type}
                  onClick={() => handleQuickAction(act.type)}
                  className={`p-4 rounded-xl border text-center flex flex-col items-center justify-center gap-2 shadow-sm transition-all duration-200 active:scale-95 group ${act.style}`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{act.emoji}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider">{act.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Matches List Subcomponent */}
          <MatchTable 
            matchesList={matchesList} 
            onViewAll={() => router.push('/schedule')} 
          />
        </div>

        {/* RIGHT COLUMN: Weather, Stats, Report Issues, Chat Assistant Widget */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Stadium Weather subcomponent */}
          {activeVenue && (
            <WeatherCard weatherInfo={weatherInfo} />
          )}

          {/* Stadium Status Card */}
          {activeVenue && (
            <div className="p-4 rounded-xl border border-border bg-card/45 space-y-3.5 shadow-sm">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Stadium Status</span>
                <span className="bg-primary/20 text-primary border border-primary/30 text-[8px] font-black px-2 py-0.5 rounded-full">
                  LIVE
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Capacity', val: activeVenue.capacity.toLocaleString(), color: 'text-foreground' },
                  { label: 'Attendance', val: Math.round(activeVenue.capacity * 0.8).toLocaleString(), color: 'text-foreground' },
                  { label: 'Occupancy', val: `${occupancyRates.general}%`, color: 'text-success', bar: true },
                  { label: 'Traffic Flow', val: trafficFlow, color: trafficFlow === 'Heavy' ? 'text-danger' : 'text-warning' },
                  { label: 'Safety', val: safetyStatus, color: 'text-success' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-black ${item.color}`}>{item.val}</span>
                    </div>
                    {item.bar && (
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-success rounded-full" style={{ width: `${occupancyRates.general}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Issue Card trigger button */}
          <section className="p-4 rounded-xl border border-border bg-card/45 space-y-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-warning" />
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Report the Issue</h4>
            </div>

            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
              Report blocked wheelchair routes, broken elevators, or other facility and access issues immediately to operations staff.
            </p>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="w-full h-10 rounded-xl bg-purple-600 hover:bg-purple-500 active:scale-98 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              Report Now <ChevronRight className="h-4 w-4" />
            </button>
          </section>

          {/* AI Assistant Chatbot widget */}
          <section className="p-4 rounded-xl border border-border bg-card/45 space-y-4 shadow-sm flex flex-col justify-between min-h-[170px]">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">AI Assistant</span>
              <span className="text-[8px] bg-primary/25 text-primary border border-primary/30 font-black px-1.5 py-0.5 rounded">SMART COMPANION</span>
            </div>

            <div className="flex items-start gap-3.5 py-1">
              <div 
                className="h-12 w-12 rounded-full border border-border bg-cover flex-shrink-0"
                style={{ backgroundImage: `url('/robot_chat_avatar.png')` }}
              />
              <div className="relative p-2.5 bg-muted rounded-xl border border-border/80 text-[10px] font-bold text-foreground leading-relaxed max-w-[170px]">
                {/* Speech Bubble Arrow */}
                <div className="absolute left-[-5px] top-4 border-t-4 border-t-transparent border-r-4 border-r-muted border-b-4 border-b-transparent" />
                Hi! I can help you find accessible routes, check elevator status, or look up match fixtures.
              </div>
            </div>

            <button
              onClick={() => router.push('/chat')}
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary/95 active:scale-98 text-primary-foreground font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              Chat with AI <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        </div>
      </div>

      {/* Incident Report Modal Dialog */}
      <IncidentReportModal 
        isOpen={isReportModalOpen}
        onClose={() => { setIsReportModalOpen(false); setFormMessage(null); }}
        onSubmit={handleReportSubmit}
        formSubmitting={formSubmitting}
        formMessage={formMessage}
      />

      {/* MODAL 2: Live Syncing Status Panel */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4 animate-scale-up">
            
            <div className="flex justify-between items-center border-b border-border/60 pb-3">
              <h2 className="text-xs font-black text-foreground uppercase tracking-widest">Platform Sync Status</h2>
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-muted border border-border/80 hover:border-border transition-all"
              >
                Dismiss
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: 'FIFA Operations DB Connector', val: 'Online (Connected)', icon: '🟢' },
                { name: 'Persistent JSON State Engine', val: 'Active (db-store.json)', icon: '🟢' },
                { name: 'Gemini Assist API Transport', val: 'Listening', icon: '🟢' },
                { name: 'PWA Service Worker offline sync', val: 'Operational (sw.js)', icon: '🟢' },
                { name: 'Audio Commentary FM Relay', val: 'Online (88.5 FM)', icon: '🟢' },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted border border-border/50 text-xs font-bold text-foreground">
                  <span>{stat.icon} {stat.name}</span>
                  <span className="text-[10px] text-muted-foreground font-extrabold">{stat.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
