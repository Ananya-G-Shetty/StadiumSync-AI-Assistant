'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Layers,
  Compass,
  MapPin,
  Check,
  AlertCircle,
  CornerDownRight,
  Eye,
  Info,
  ChevronDown,
  Activity,
  Flame,
  Users,
  Accessibility,
  Heart,
  Volume2
} from 'lucide-react';
import { useAccessibility } from '@/context/AccessibilityContext';

interface AmenityMarker {
  id: string;
  name: string;
  type: 'restroom' | 'elevator' | 'sensory_room' | 'first_aid' | 'food' | 'transit';
  level: number;
  cx: number;
  cy: number;
  details: string;
  status: 'operational' | 'maintenance';
}

interface SeatingSection {
  id: string;
  name: string;
  points: string;
  startAngle: number;
  endAngle: number;
  r1: number;
  r2: number;
  density: 'low' | 'moderate' | 'high';
  occupancy: number;
  accessibility: string;
  capacity: number;
  label: string;
}

function MapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { announceToScreenReader, speak } = useAccessibility();

  // Stadium context
  const [venueName, setVenueName] = useState('MetLife Stadium (NY/NJ)');

  // UI states
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [heatmapActive, setHeatmapActive] = useState<boolean>(true);
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    restroom: true,
    elevator: true,
    sensory_room: true,
    first_aid: true,
    food: true,
    transit: true,
  });

  // Selected seating section or transit hub details
  const [selectedSection, setSelectedSection] = useState<SeatingSection | null>(null);
  const [selectedTransit, setSelectedTransit] = useState<AmenityMarker | null>(null);

  // Routing states
  const [routeStart, setRouteStart] = useState<string>('');
  const [routeEnd, setRouteEnd] = useState<string>('');
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(true);
  const [computedRoute, setComputedRoute] = useState<{
    path: string;
    instructions: string[];
    hasElevatorTransition: boolean;
  } | null>(null);

  // Programmatic circular seating stands wedges generator (viewBox 0 0 500 500)
  const [seatingSections, setSeatingSections] = useState<SeatingSection[]>([]);

  useEffect(() => {
    // Generate circular stand wedges centered at (250, 250)
    const sections: SeatingSection[] = [];
    const rings = [
      { level: 1, name: 'Lower Level (100s)', r1: 85, r2: 115, labels: ['103', '108', '108', '108', '108', '103', '113', '123', '128', '128', '128', '128'] },
      { level: 2, name: 'Club Level (200s)', r1: 120, r2: 150, labels: ['203', '208', '211', '206', '218', '208', '218', '228', '228', '228', '228', '218'] },
      { level: 3, name: 'Upper Level (300s)', r1: 155, r2: 190, labels: ['303', '308', '311', '319', '303', '308', '328', '323', '328', '313', '328', '319'] },
    ];

    rings.forEach((ring) => {
      for (let i = 0; i < 12; i++) {
        const startAngle = (i * 30 * Math.PI) / 180 - Math.PI / 2; // start top (-90deg)
        const endAngle = ((i + 1) * 30 * Math.PI) / 180 - Math.PI / 2;
        const label = ring.labels[i];

        let density: 'low' | 'moderate' | 'high' = 'low';
        if (ring.level === 3) {
          // North stands are highly crowded (Red)
          density = (i >= 9 || i <= 2) ? 'high' : 'moderate';
        } else if (ring.level === 2) {
          density = (i >= 3 && i <= 8) ? 'moderate' : 'high';
        } else {
          density = 'low';
        }

        sections.push({
          id: `sec-${ring.level}-${i}`,
          name: `${ring.name} - Section ${label}`,
          points: '', // Path string will be computed in SVG render helper
          startAngle,
          endAngle,
          r1: ring.r1,
          r2: ring.r2,
          density,
          occupancy: density === 'high' ? 88 + (i % 5) : density === 'moderate' ? 62 + (i % 8) : 21 + (i % 10),
          accessibility: ring.level === 1
            ? `Direct step-free concourse access, 12 wheelchair companion spaces on deck ${label}.`
            : `Elevator lift access required via Elevator Bank A. Braille signage equipped.`,
          capacity: ring.level === 1 ? 1200 : ring.level === 2 ? 1500 : 2000,
          label
        });
      }
    });
    setSeatingSections(sections);

    // Initialize venue details from localstorage
    const savedVenueId = localStorage.getItem('selectedVenueId') || 'metlife-stadium';
    const names: Record<string, string> = {
      'metlife-stadium': 'MetLife Stadium (NY/NJ)',
      'sofi-stadium': 'SoFi Stadium (LA)',
      'estadio-azteca': 'Estadio Azteca (Mexico City)'
    };
    setVenueName(names[savedVenueId] || 'FIFA Stadium');

    // Parse filters & parameters
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      const nextFilters = { restroom: false, elevator: false, sensory_room: false, first_aid: false, food: false, transit: false };
      if (filterParam in nextFilters) {
        nextFilters[filterParam as keyof typeof nextFilters] = true;
        setActiveFilters(nextFilters);
      }
    }

    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (endParam) {
      setRouteEnd(endParam);
      setRouteStart(startParam || 'gate-a');
    } else if (startParam) {
      setRouteStart(startParam);
    }
  }, [searchParams]);

  // Center coordinates (500x500 viewport)
  const cx = 250;
  const cy = 250;

  // Static Markers (centered dynamically around walkway circle r=208)
  const markers: AmenityMarker[] = [
    { id: 'm1', name: 'Section 109 Accessible Toilet', type: 'restroom', level: 1, cx: cx + 208 * Math.cos(225 * Math.PI / 180), cy: cy + 208 * Math.sin(225 * Math.PI / 180), details: 'All-gender single occupant, braille signage, helper pull chord.', status: 'operational' },
    { id: 'm2', name: 'Section 124 Companion Toilet', type: 'restroom', level: 1, cx: cx + 208 * Math.cos(45 * Math.PI / 180), cy: cy + 208 * Math.sin(45 * Math.PI / 180), details: 'Adult diaper changing table, low sinks.', status: 'operational' },
    { id: 'm3', name: 'West Plaza Elevator Bank A', type: 'elevator', level: 1, cx: cx + 208 * Math.cos(175 * Math.PI / 180), cy: cy + 208 * Math.sin(175 * Math.PI / 180), details: 'Voice announcements, connecting levels 1-3.', status: 'operational' },
    { id: 'm4', name: 'East Section 228 Escalator', type: 'elevator', level: 2, cx: cx + 208 * Math.cos(355 * Math.PI / 180), cy: cy + 208 * Math.sin(355 * Math.PI / 180), details: 'Maintenance in progress. Rerouting active.', status: 'maintenance' },
    { id: 'm5', name: 'KultureCity Sensory Room', type: 'sensory_room', level: 2, cx: cx + 208 * Math.cos(285 * Math.PI / 180), cy: cy + 208 * Math.sin(285 * Math.PI / 180), details: 'Acoustics muffled, soft lights, weighted lap pads.', status: 'operational' },
    { id: 'm6', name: 'Section 143 Medical Aid Station', type: 'first_aid', level: 1, cx: cx + 208 * Math.cos(135 * Math.PI / 180), cy: cy + 208 * Math.sin(135 * Math.PI / 180), details: 'First aid dispatch base, oxygen storage.', status: 'operational' },
    { id: 'm7', name: 'Kickoff Eats (Low Counter)', type: 'food', level: 1, cx: cx + 208 * Math.cos(315 * Math.PI / 180), cy: cy + 208 * Math.sin(315 * Math.PI / 180), details: 'Lowered pickup counter (32"), visual menu boards.', status: 'operational' },
    { id: 'm8', name: 'Corner Cafe (Upper Concourse)', type: 'food', level: 3, cx: cx + 208 * Math.cos(215 * Math.PI / 180), cy: cy + 208 * Math.sin(215 * Math.PI / 180), details: 'Accessible pathways, companion helper buttons.', status: 'operational' },
    { id: 'm9', name: 'Section 215 Family Restroom', type: 'restroom', level: 2, cx: cx + 208 * Math.cos(255 * Math.PI / 180), cy: cy + 208 * Math.sin(255 * Math.PI / 180), details: 'All-gender baby changing table, grab rails.', status: 'operational' },
    { id: 'm10', name: 'Section 328 Accessible Restroom', type: 'restroom', level: 3, cx: cx + 208 * Math.cos(75 * Math.PI / 180), cy: cy + 208 * Math.sin(75 * Math.PI / 180), details: 'Wide wheelchair companion spaces, low wash basin.', status: 'operational' },
    { id: 't1', name: 'Metro Link (West Station)', type: 'transit', level: 1, cx: cx + 245 * Math.cos(195 * Math.PI / 180), cy: cy + 245 * Math.sin(195 * Math.PI / 180), details: 'Metro Line 4 - Direct connection to downtown. Train arrivals every 5 mins. Fully step-free accessibility with platform screen gates.', status: 'operational' },
    { id: 't2', name: 'North Bus Rapid Transit', type: 'transit', level: 1, cx: cx + 245 * Math.cos(250 * Math.PI / 180), cy: cy + 245 * Math.sin(250 * Math.PI / 180), details: 'Bus Lines 72 & 108. Buses arrive every 10 mins. Equipped with low-floor boarding ramps and tactile direction paths.', status: 'operational' },
    { id: 't3', name: 'East Rideshare / ADA Taxi Hub', type: 'transit', level: 1, cx: cx + 245 * Math.cos(15 * Math.PI / 180), cy: cy + 245 * Math.sin(15 * Math.PI / 180), details: 'Dedicated rideshare loading zone for priority wheelchair accessible vehicles. Helper assistants stationed on-site.', status: 'operational' },
    { id: 't4', name: 'South Accessible Parking Shuttle', type: 'transit', level: 1, cx: cx + 245 * Math.cos(80 * Math.PI / 180), cy: cy + 245 * Math.sin(80 * Math.PI / 180), details: 'Free low-floor electric shuttle bus from accessible parking Lot C directly to Gate D.', status: 'operational' },
  ];

  // Routing locations selector points (coordinates mapping)
  const routePoints = [
    { id: 'gate-a', name: 'Gate A (ADA Priority Gate)', level: 1, cx: cx + 230 * Math.cos(180 * Math.PI / 180), cy: cy + 230 * Math.sin(180 * Math.PI / 180) },
    { id: 'gate-b', name: 'Gate B (North Gate)', level: 1, cx: cx + 230 * Math.cos(270 * Math.PI / 180), cy: cy + 230 * Math.sin(270 * Math.PI / 180) },
    { id: 'gate-c', name: 'Gate C (East Gate)', level: 1, cx: cx + 230 * Math.cos(0 * Math.PI / 180), cy: cy + 230 * Math.sin(0 * Math.PI / 180) },
    { id: 'gate-d', name: 'Gate D (South Gate)', level: 1, cx: cx + 230 * Math.cos(90 * Math.PI / 180), cy: cy + 230 * Math.sin(90 * Math.PI / 180) },
    { id: 'm1', name: 'Restroom (Section 109 - L1)', level: 1, cx: cx + 208 * Math.cos(225 * Math.PI / 180), cy: cy + 208 * Math.sin(225 * Math.PI / 180) },
    { id: 'm2', name: 'Restroom (Section 124 - L1)', level: 1, cx: cx + 208 * Math.cos(45 * Math.PI / 180), cy: cy + 208 * Math.sin(45 * Math.PI / 180) },
    { id: 'm9', name: 'Restroom (Section 215 - L2)', level: 2, cx: cx + 208 * Math.cos(255 * Math.PI / 180), cy: cy + 208 * Math.sin(255 * Math.PI / 180) },
    { id: 'm10', name: 'Restroom (Section 328 - L3)', level: 3, cx: cx + 208 * Math.cos(75 * Math.PI / 180), cy: cy + 208 * Math.sin(75 * Math.PI / 180) },
    { id: 'm3', name: 'Elevator Bank A (West)', level: 1, cx: cx + 208 * Math.cos(175 * Math.PI / 180), cy: cy + 208 * Math.sin(175 * Math.PI / 180) },
    { id: 'm5', name: 'Sensory Room (Level 2)', level: 2, cx: cx + 208 * Math.cos(285 * Math.PI / 180), cy: cy + 208 * Math.sin(285 * Math.PI / 180) },
    { id: 'm6', name: 'First Aid (Section 143 - L1)', level: 1, cx: cx + 208 * Math.cos(135 * Math.PI / 180), cy: cy + 208 * Math.sin(135 * Math.PI / 180) },
    { id: 'm7', name: 'Food (Kickoff Eats - L1)', level: 1, cx: cx + 208 * Math.cos(315 * Math.PI / 180), cy: cy + 208 * Math.sin(315 * Math.PI / 180) },
    { id: 'm8', name: 'Food (Corner Cafe - L3)', level: 3, cx: cx + 208 * Math.cos(215 * Math.PI / 180), cy: cy + 208 * Math.sin(215 * Math.PI / 180) },
    { id: 't1', name: 'Metro Link (West Station)', level: 1, cx: cx + 245 * Math.cos(195 * Math.PI / 180), cy: cy + 245 * Math.sin(195 * Math.PI / 180) },
    { id: 't2', name: 'North Bus Rapid Transit', level: 1, cx: cx + 245 * Math.cos(250 * Math.PI / 180), cy: cy + 245 * Math.sin(250 * Math.PI / 180) },
    { id: 't3', name: 'East Rideshare / ADA Taxi Hub', level: 1, cx: cx + 245 * Math.cos(15 * Math.PI / 180), cy: cy + 245 * Math.sin(15 * Math.PI / 180) },
    { id: 't4', name: 'South Accessible Parking Shuttle', level: 1, cx: cx + 245 * Math.cos(80 * Math.PI / 180), cy: cy + 245 * Math.sin(80 * Math.PI / 180) },
  ];

  // Helper to compute SVG arc wedge paths
  const getWedgePath = (r1: number, r2: number, startAngle: number, endAngle: number): string => {
    const x1_in = cx + r1 * Math.cos(startAngle);
    const y1_in = cy + r1 * Math.sin(startAngle);
    const x2_in = cx + r1 * Math.cos(endAngle);
    const y2_in = cy + r1 * Math.sin(endAngle);

    const x1_out = cx + r2 * Math.cos(startAngle);
    const y1_out = cy + r2 * Math.sin(startAngle);
    const x2_out = cx + r2 * Math.cos(endAngle);
    const y2_out = cy + r2 * Math.sin(endAngle);

    return `
      M ${x1_in} ${y1_in}
      L ${x1_out} ${y1_out}
      A ${r2} ${r2} 0 0 1 ${x2_out} ${y2_out}
      L ${x2_in} ${y2_in}
      A ${r1} ${r1} 0 0 0 ${x1_in} ${y1_in}
      Z
    `;
  };

  // Compute curved concourse routing paths
  useEffect(() => {
    if (!routeStart || !routeEnd) {
      setComputedRoute(null);
      return;
    }

    const start = routePoints.find(p => p.id === routeStart);
    const end = routePoints.find(p => p.id === routeEnd);

    if (!start || !end) return;

    // Calculate angles of start/end relative to center to construct circular route path
    const angleStart = Math.atan2(start.cy - cy, start.cx - cx);
    const angleEnd = Math.atan2(end.cy - cy, end.cx - cx);

    // Build curved pathway along the concourse ring (radius 208)
    const arcRadius = 208;
    const startConcourseX = cx + arcRadius * Math.cos(angleStart);
    const startConcourseY = cy + arcRadius * Math.sin(angleStart);
    const endConcourseX = cx + arcRadius * Math.cos(angleEnd);
    const endConcourseY = cy + arcRadius * Math.sin(angleEnd);

    // Differentiate elevator transitions
    let path = `M ${start.cx} ${start.cy} L ${startConcourseX} ${startConcourseY} `;

    // Choose shortest circular direction (0 or 1 for sweep flag in SVG arc)
    const angleDiff = angleEnd - angleStart;
    const sweepFlag = (angleDiff > 0 ? (angleDiff <= Math.PI ? 1 : 0) : (angleDiff >= -Math.PI ? 0 : 1));

    path += `A ${arcRadius} ${arcRadius} 0 0 ${sweepFlag} ${endConcourseX} ${endConcourseY} L ${end.cx} ${end.cy}`;

    const instructions: string[] = [];
    let hasElevatorTransition = false;

    if (start.level !== end.level) {
      hasElevatorTransition = true;
      if (accessibleOnly) {
        instructions.push(`Head to the West Concourse wheelchair ramp.`);
        instructions.push(`Take Elevator Bank A to Level ${end.level} (voice guided).`);
        instructions.push(`Exit the lift and follow level tactile guides directly to ${end.name}.`);
      } else {
        instructions.push(`Take the nearest stairs/escalators near Section 228.`);
        instructions.push(`Transition to Level ${end.level} and proceed to your destination.`);
      }
    } else {
      instructions.push(`Follow the circular concourse pathway towards your target destination.`);
      instructions.push(`Arrive safely at ${end.name} on Level ${end.level}.`);
    }

    setComputedRoute({ path, instructions, hasElevatorTransition });
    announceToScreenReader(`Route mapped successfully from ${start.name} to ${end.name}.`);
    speak(`Route calculated.`);
  }, [routeStart, routeEnd, accessibleOnly]);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleLevelChange = (level: number) => {
    setSelectedLevel(level);
    speak(`Level ${level}`);
  };

  const handleSectionClick = (sec: SeatingSection) => {
    setSelectedSection(sec);
    setSelectedTransit(null);
    speak(`${sec.name}. ${sec.occupancy} percent filled.`);
  };

  const getWedgeColor = (density: string, id: string) => {
    const isSelected = selectedSection?.id === id;
    if (!heatmapActive) {
      return isSelected
        ? 'fill-primary/45 stroke-primary stroke-[1.5px]'
        : 'fill-slate-900/60 stroke-slate-800 hover:fill-slate-800/80';
    }

    switch (density) {
      case 'high':
        return isSelected
          ? 'fill-danger/60 stroke-danger stroke-[1.5px]'
          : 'fill-danger/45 stroke-danger/60 hover:fill-danger/55';
      case 'moderate':
        return isSelected
          ? 'fill-warning/60 stroke-warning stroke-[1.5px]'
          : 'fill-warning/45 stroke-warning/60 hover:fill-warning/55';
      case 'low':
        return isSelected
          ? 'fill-success/60 stroke-success stroke-[1.5px]'
          : 'fill-success/45 stroke-success/60 hover:fill-success/55';
      default:
        return 'fill-slate-900/60 stroke-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-black text-white flex items-center gap-2">
            <Compass className="h-5.5 w-5.5 text-primary" />
            Interactive Crowd Map
          </h1>
          <span className="text-xs text-muted-foreground font-semibold">Venue: {venueName}</span>
        </div>

        {/* Level Controls & Live status */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right text-[10px] text-muted-foreground font-bold mr-2 hidden md:block">
            <div className="text-success flex items-center gap-1 justify-end">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Live Update
            </div>
            <span>May 11, 2026 • 07:45 PM</span>
          </div>

          <div className="flex gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl" role="group">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleLevelChange(lvl)}
                className={`w-9 h-8 rounded-lg text-xs font-black transition-all border ${selectedLevel === lvl
                    ? lvl === 1
                      ? 'bg-success/20 text-success border-success'
                      : lvl === 2
                        ? 'bg-warning/20 text-warning border-warning'
                        : 'bg-danger/20 text-danger border-danger'
                    : 'bg-slate-900 text-slate-400 border-transparent hover:text-white'
                  }`}
                aria-pressed={selectedLevel === lvl}
              >
                L{lvl}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid Layout: Legends Left, Map Middle, Filters Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: Crowd Level Guide & Summary */}
        <div className="lg:col-span-3 space-y-4">

          {/* Legend Panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2">
              Crowd Level Guide
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full bg-success/80 border border-success animate-pulse-live" />
                <div>
                  <div className="text-xs font-bold text-white uppercase">Level 1</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Low Crowd (0-40%)</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full bg-warning/80 border border-warning" />
                <div>
                  <div className="text-xs font-bold text-white uppercase">Level 2</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">Moderate Crowd (41-75%)</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-4 w-4 rounded-full bg-danger/80 border border-danger" />
                <div>
                  <div className="text-xs font-bold text-white uppercase">Level 3</div>
                  <div className="text-[10px] text-muted-foreground font-semibold">High Crowd (76-100%)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Crowd Stats Summary panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2">
              Crowd Summary
            </h3>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-success uppercase">Level 1 (100s)</span>
                  <span className="text-white">42%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full" style={{ width: '42%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-warning uppercase">Level 2 (200s)</span>
                  <span className="text-white">33%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: '33%' }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-danger uppercase">Level 3 (300s)</span>
                  <span className="text-white">25%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-danger rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60 flex justify-between text-[11px] font-bold">
                <span className="text-slate-400">Total Capacity:</span>
                <span className="text-white font-black">82,500</span>
              </div>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: The Circular Stadium Map & Route inputs */}
        <div className="lg:col-span-6 space-y-4">

          {/* Circular Stadium Map Canvas (500x500 square viewport) */}
          <div className="relative aspect-square w-full rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md shadow-lg overflow-hidden flex items-center justify-center p-3">
            <svg
              viewBox="0 0 500 500"
              className="w-full h-full text-card-foreground select-none"
              aria-label="Concentric Stadium Seating Map Layout"
              role="img"
            >
              {/* Outer circular walkway outlines */}
              <circle cx={cx} cy={cy} r="230" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={cx} cy={cy} r="208" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="6 4" />

              {/* Programmable seating Stand wedges */}
              <g id="concentric-stands" className="cursor-pointer transition-all">
                {seatingSections.map((sec) => (
                  <path
                    key={sec.id}
                    d={getWedgePath(sec.r1, sec.r2, sec.startAngle, sec.endAngle)}
                    className={`transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary ${getWedgeColor(sec.density, sec.id)}`}
                    onClick={() => handleSectionClick(sec)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Section ${sec.label}, Level ${sec.level}. Occupancy: ${sec.occupancy}%. ${sec.accessibility}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSectionClick(sec);
                      }
                    }}
                  />
                ))}
              </g>

              {/* Seating labels overlays */}
              <g id="stand-labels" className="pointer-events-none fill-slate-400 font-display font-extrabold text-[9px]">
                {seatingSections.map((sec) => {
                  const r_mid = (sec.r1 + sec.r2) / 2;
                  const a_mid = (sec.startAngle + sec.endAngle) / 2;
                  const tx = cx + r_mid * Math.cos(a_mid);
                  const ty = cy + r_mid * Math.sin(a_mid) + 3; // center offset
                  return (
                    <text key={`lbl-${sec.id}`} x={tx} y={ty} textAnchor="middle">
                      {sec.label}
                    </text>
                  );
                })}
              </g>

              {/* Inner Soccer Pitch */}
              <g transform="translate(185, 205)">
                {/* Field Grass */}
                <rect x="0" y="0" width="130" height="90" rx="8" fill="rgba(16,185,129,0.18)" stroke="rgba(16,185,129,0.4)" strokeWidth="1.5" />
                {/* Center Circle */}
                <circle cx="65" cy="45" r="16" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                <line x1="65" y1="0" x2="65" y2="90" stroke="rgba(16,185,129,0.3)" strokeWidth="1" />
                {/* Grid Lines */}
                {[13, 26, 39, 52, 78, 91, 104, 117].map((xOffset) => (
                  <line key={xOffset} x1={xOffset} y1="0" x2={xOffset} y2="90" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
                ))}
                {/* Yard texts */}
                <text x="39" y="24" fill="rgba(255,255,255,0.2)" fontSize="6" textAnchor="middle">10</text>
                <text x="39" y="70" fill="rgba(255,255,255,0.2)" fontSize="6" textAnchor="middle" transform="rotate(180 39 70)">10</text>
                <text x="65" y="24" fill="rgba(255,255,255,0.2)" fontSize="6" textAnchor="middle">50</text>
              </g>

              {/* Stadium Entrance Gates Badges */}
              <g className="text-[10px] font-black text-center">
                {/* Gate A (West) */}
                <circle cx={cx + 230 * Math.cos(180 * Math.PI / 180)} cy={cy + 230 * Math.sin(180 * Math.PI / 180)} r="11" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                <text x={cx + 230 * Math.cos(180 * Math.PI / 180)} y={cy + 230 * Math.sin(180 * Math.PI / 180) + 3.5} textAnchor="middle" fill="#10b981">A</text>
                <text x={cx + 258 * Math.cos(180 * Math.PI / 180)} y={cy + 258 * Math.sin(180 * Math.PI / 180) + 3} textAnchor="middle" className="text-[7px] font-bold fill-slate-400">GATE A</text>

                {/* Gate B (North) */}
                <circle cx={cx + 230 * Math.cos(270 * Math.PI / 180)} cy={cy + 230 * Math.sin(270 * Math.PI / 180)} r="11" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                <text x={cx + 230 * Math.cos(270 * Math.PI / 180)} y={cy + 230 * Math.sin(270 * Math.PI / 180) + 3.5} textAnchor="middle" fill="#10b981">B</text>
                <text x={cx + 230 * Math.cos(270 * Math.PI / 180)} y={cy + 248 * Math.sin(270 * Math.PI / 180) + 3} textAnchor="middle" className="text-[7px] font-bold fill-slate-400">GATE B</text>

                {/* Gate C (East) */}
                <circle cx={cx + 230 * Math.cos(0 * Math.PI / 180)} cy={cy + 230 * Math.sin(0 * Math.PI / 180)} r="11" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                <text x={cx + 230 * Math.cos(0 * Math.PI / 180)} y={cy + 230 * Math.sin(0 * Math.PI / 180) + 3.5} textAnchor="middle" fill="#10b981">C</text>
                <text x={cx + 262 * Math.cos(0 * Math.PI / 180)} y={cy + 262 * Math.sin(0 * Math.PI / 180) + 3} textAnchor="middle" className="text-[7px] font-bold fill-slate-400">GATE C</text>

                {/* Gate D (South) */}
                <circle cx={cx + 230 * Math.cos(90 * Math.PI / 180)} cy={cy + 230 * Math.sin(90 * Math.PI / 180)} r="11" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth="1.5" />
                <text x={cx + 230 * Math.cos(90 * Math.PI / 180)} y={cy + 230 * Math.sin(90 * Math.PI / 180) + 3.5} textAnchor="middle" fill="#10b981">D</text>
                <text x={cx + 230 * Math.cos(90 * Math.PI / 180)} y={cy + 252 * Math.sin(90 * Math.PI / 180) + 3} textAnchor="middle" className="text-[7px] font-bold fill-slate-400">GATE D</text>
              </g>

              {/* Render computed curved route paths */}
              {computedRoute && (
                <path
                  d={computedRoute.path}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-pulse"
                  style={{
                    strokeDasharray: '8, 6',
                    filter: 'drop-shadow(0px 3px 6px rgba(56,189,248,0.5))'
                  }}
                />
              )}

              {/* Render dynamic markers on selection */}
              {markers
                .filter(m => m.level === selectedLevel && activeFilters[m.type])
                .map((m) => {
                  const isMaintenance = m.status === 'maintenance';
                  const isTransit = m.type === 'transit';
                  return (
                    <g 
                      key={m.id} 
                      className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary" 
                      tabIndex={0}
                      role="button"
                      aria-label={`${m.name}: ${m.details}. Status: ${m.status}`}
                      onClick={() => {
                        if (isTransit) {
                          setSelectedTransit(m);
                          setSelectedSection(null);
                        } else {
                          setSelectedTransit(null);
                        }
                        speak(`${m.name}. ${m.details}`);
                        announceToScreenReader(`${m.name}: ${m.details}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          if (isTransit) {
                            setSelectedTransit(m);
                            setSelectedSection(null);
                          } else {
                            setSelectedTransit(null);
                          }
                          speak(`${m.name}. ${m.details}`);
                          announceToScreenReader(`${m.name}: ${m.details}`);
                        }
                      }}
                    >
                      <circle cx={m.cx} cy={m.cy} r="14" fill={isMaintenance ? 'rgba(239,68,68,0.25)' : isTransit ? 'rgba(79,70,229,0.25)' : 'rgba(14,165,233,0.2)'} className="animate-pulse" />
                      <circle cx={m.cx} cy={m.cy} r="10" fill={isMaintenance ? 'var(--danger)' : 'var(--card)'} stroke={isMaintenance ? '#f43f5e' : isTransit ? '#4f46e5' : '#0ea5e9'} strokeWidth="1.5" />
                      <text x={m.cx} y={m.cy + 3} textAnchor="middle" className="text-[10px]">
                        {isMaintenance ? '⚠️' : m.type === 'restroom' ? '🚻' : m.type === 'elevator' ? '🛗' : m.type === 'sensory_room' ? '🧩' : m.type === 'first_aid' ? '🚑' : m.type === 'food' ? '🍔' : '🚌'}
                      </text>
                    </g>
                  );
                })
              }
            </svg>

            {/* Float HUD overlay */}
            <div className="absolute top-4 left-4 bg-slate-950/95 border border-slate-800 px-3 py-1.5 rounded-xl shadow-md text-[10px] font-black text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary animate-spin-slow" />
              <span>FLOOR LEVEL {selectedLevel} ACTIVE</span>
            </div>
          </div>

          {/* Section details display panel */}
          {selectedSection && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md space-y-3 animate-fade-in" role="region" aria-live="polite">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  {selectedSection.name}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${selectedSection.density === 'high'
                    ? 'text-danger bg-danger/10 border-danger/25'
                    : selectedSection.density === 'moderate'
                      ? 'text-warning bg-warning/10 border-warning/25'
                      : 'text-success bg-success/10 border-success/25'
                  }`}>
                  Occupancy: {selectedSection.occupancy}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                Capacity: <strong>{selectedSection.capacity.toLocaleString()} seats</strong> | Current Crowd: <strong>{Math.round(selectedSection.capacity * selectedSection.occupancy / 100).toLocaleString()}</strong>
              </p>
              <div className="text-[10px] bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-muted-foreground flex gap-2">
                <Accessibility className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                <span><strong>Access Guide:</strong> {selectedSection.accessibility}</span>
              </div>
            </div>
          )}

          {/* Transit Hub details display panel */}
          {selectedTransit && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md space-y-3 animate-fade-in" role="region" aria-live="polite">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="text-sm">🚌</span>
                  {selectedTransit.name}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black border border-indigo-500/25 bg-indigo-500/10 text-indigo-400 uppercase tracking-wider">
                  Transit Hub
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed">
                {selectedTransit.details}
              </p>

              {/* Distance and departure timers */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-center">
                  <span className="block text-[8px] font-black text-slate-500 uppercase">Distance to Stadium</span>
                  <span className="text-xs font-black text-white">
                    {selectedTransit.id === 't1' ? '350 meters' : selectedTransit.id === 't2' ? '120 meters' : selectedTransit.id === 't3' ? '250 meters' : '50 meters'}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-center">
                  <span className="block text-[8px] font-black text-slate-500 uppercase">Next Departure</span>
                  <span className="text-xs font-black text-primary animate-pulse">
                    {selectedTransit.id === 't1' ? 'In 3 mins' : selectedTransit.id === 't2' ? 'In 2 mins' : selectedTransit.id === 't3' ? 'In 6 mins' : 'In 1 min'}
                  </span>
                </div>
              </div>

              {/* Draw Route Directions Button */}
              <button
                onClick={() => {
                  setRouteStart(selectedTransit.id);
                  const nearestGateMap: Record<string, string> = {
                    t1: 'gate-a',
                    t2: 'gate-b',
                    t3: 'gate-c',
                    t4: 'gate-d'
                  };
                  setRouteEnd(nearestGateMap[selectedTransit.id] || 'gate-a');
                }}
                className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/95 text-[10px] font-black text-center text-white flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <span>🗺️</span> Find Best Accessible Route to Entrance
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Layer Filter Toggles & Quick Navigations */}
        <div className="lg:col-span-3 space-y-4">

          {/* Layer toggles panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-800/60 pb-2">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Facilities
              </h3>
              <label className="flex items-center gap-1.5 text-[10px] font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={heatmapActive}
                  onChange={(e) => setHeatmapActive(e.target.checked)}
                  className="rounded text-primary border-slate-800 bg-slate-900 h-3.5 w-3.5 focus:ring-transparent"
                />
                <span>Heatmap</span>
              </label>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { type: 'restroom', name: 'Restrooms', emoji: '🚻', color: 'border-blue-500/20 text-blue-400' },
                { type: 'food', name: 'Food & Beverages', emoji: '🍔', color: 'border-amber-500/20 text-amber-400' },
                { type: 'elevator', name: 'Elevators & Ramps', emoji: '🛗', color: 'border-emerald-500/20 text-emerald-400' },
                { type: 'first_aid', name: 'First Aid', emoji: '🚑', color: 'border-rose-500/20 text-rose-400' },
                { type: 'sensory_room', name: 'Information Desks', emoji: '🧩', color: 'border-cyan-500/20 text-cyan-400' },
                { type: 'transit', name: 'Public Transit & Shuttle', emoji: '🚌', color: 'border-indigo-500/20 text-indigo-400' },
              ].map((layer) => (
                <button
                  key={layer.type}
                  onClick={() => toggleFilter(layer.type)}
                  className={`w-full p-2.5 rounded-lg border text-xs font-bold text-left flex items-center justify-between transition-all ${activeFilters[layer.type]
                      ? 'bg-slate-900/60 border-primary text-white ring-1 ring-primary/10'
                      : 'bg-transparent border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{layer.emoji}</span>
                    <span>{layer.name}</span>
                  </span>
                  {activeFilters[layer.type] && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Nav Panel */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 backdrop-blur-md space-y-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800/60 pb-2">
              Quick Navigation
            </h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setRouteEnd('m1'); setRouteStart('gate-a'); }}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-left flex items-center gap-2 text-white"
              >
                <span>🚻</span> Find Restrooms
              </button>
              <button
                onClick={() => { setRouteEnd('m7'); setRouteStart('gate-a'); }}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-left flex items-center gap-2 text-white"
              >
                <span>🍔</span> Find Food Concessions
              </button>
              <button
                onClick={() => { setRouteEnd('m3'); setRouteStart('gate-a'); }}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-left flex items-center gap-2 text-white"
              >
                <span>🛗</span> Find Elevators
              </button>
              <button
                onClick={() => { setRouteEnd('m6'); setRouteStart('gate-a'); }}
                className="w-full py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-bold text-left flex items-center gap-2 text-white"
              >
                <span>🚑</span> Find First Aid
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Route Navigator panel (Bottom center) */}
      <section className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4 shadow-sm" aria-labelledby="routing-panel-heading">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            <h2 id="routing-panel-heading" className="text-xs font-black text-white uppercase tracking-widest">
              Step-Free Route Navigator
            </h2>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accessibleOnly}
              onChange={(e) => setAccessibleOnly(e.target.checked)}
              className="rounded text-primary border-slate-800 bg-slate-900 h-3.5 w-3.5 focus:ring-transparent"
            />
            <span>Accessible Routes (Elevators/Ramps)</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="route-start" className="block text-[9px] font-black text-slate-400 uppercase mb-1">
              Start Location
            </label>
            <select
              id="route-start"
              value={routeStart}
              onChange={(e) => setRouteStart(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-800 bg-slate-900/60 font-bold text-xs text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="">Choose Start Location...</option>
              {routePoints.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-950">{p.name} (Floor {p.level})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="route-end" className="block text-[9px] font-black text-slate-400 uppercase mb-1">
              Destination Node
            </label>
            <select
              id="route-end"
              value={routeEnd}
              onChange={(e) => setRouteEnd(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-800 bg-slate-900/60 font-bold text-xs text-white focus:ring-1 focus:ring-primary outline-none cursor-pointer"
            >
              <option value="">Choose Destination...</option>
              {routePoints.map(p => (
                <option key={p.id} value={p.id} className="bg-slate-950">{p.name} (Floor {p.level})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Route Instructions List */}
        {computedRoute ? (
          <div className="bg-slate-900/35 p-3 rounded-lg border border-slate-800/80 space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5">
              <CornerDownRight className="h-4 w-4 text-primary" />
              Tactile Navigation Instructions
            </h4>

            <ol className="space-y-2">
              {computedRoute.instructions.map((inst, idx) => (
                <li key={idx} className="text-xs text-slate-300 font-medium leading-relaxed flex gap-2">
                  <span className="text-primary font-black">{idx + 1}.</span>
                  <span>{inst}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="text-center p-3 text-xs text-slate-500 font-bold border border-dashed border-slate-800 rounded-lg">
            Choose start & destination points in dropdowns or select landmarks on map.
          </div>
        )}
      </section>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground text-xs font-semibold">Loading map navigation...</p>
      </div>
    }>
      <MapContent />
    </Suspense>
  );
}
