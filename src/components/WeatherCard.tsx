'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface WeatherCardProps {
  weatherInfo: {
    temp: string;
    condition: string;
    humidity: string;
    icon: LucideIcon;
  };
}

export default function WeatherCard({ weatherInfo }: WeatherCardProps) {
  const WeatherIcon = weatherInfo.icon;

  return (
    <div className="p-4 rounded-xl border border-border bg-card/45 space-y-3.5 shadow-sm">
      <div className="flex justify-between items-center border-b border-border/50 pb-2">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Stadium Weather</span>
        <span className="text-[10px] font-bold text-success flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-muted rounded-xl text-primary border border-border">
            <WeatherIcon className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="text-lg font-black text-foreground">{weatherInfo.temp}</div>
            <div className="text-[10px] text-muted-foreground font-bold">{weatherInfo.condition}</div>
          </div>
        </div>

        <div className="text-right text-[10px] font-bold text-muted-foreground space-y-0.5">
          <div>Humidity: {weatherInfo.humidity}</div>
          <div>Wind: 8 mph</div>
        </div>
      </div>
    </div>
  );
}
