'use client';

import React from 'react';

interface Match {
  id: number;
  venueId: string;
  homeTeam: string;
  awayTeam: string;
  datetime: Date;
  status: string;
  score: string | null;
}

interface MatchTableProps {
  matchesList: Match[];
  onViewAll: () => void;
}

const flagMap: Record<string, string> = {
  'USA': '🇺🇸',
  'Italy': '🇮🇹',
  'Brazil': '🇧🇷',
  'Spain': '🇪🇸',
  'Canada': '🇨🇦',
  'Japan': '🇯🇵',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Morocco': '🇲🇦',
  'Mexico': '🇲🇽',
  'France': '🇫🇷',
  'Argentina': '🇦🇷',
  'Germany': '🇩🇪',
};

export default function MatchTable({ matchesList, onViewAll }: MatchTableProps) {
  return (
    <section className="space-y-3" aria-labelledby="matches-list-heading">
      <div className="flex justify-between items-center">
        <h3 id="matches-list-heading" className="text-xs font-black uppercase tracking-wider text-muted-foreground">
          Matches at this Venue
        </h3>
        <button 
          onClick={onViewAll} 
          className="text-[10px] font-black text-primary uppercase hover:underline"
        >
          View All
        </button>
      </div>

      {matchesList.length === 0 ? (
        <div className="text-center p-6 border border-border border-dashed rounded-xl text-xs text-muted-foreground font-bold bg-card/10">
          No matches scheduled at this stadium.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card/25 shadow-sm">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Date & Time</th>
                <th className="p-3">Matchup</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Result / RSVP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs font-semibold text-foreground">
              {matchesList.map((m) => {
                const isLive = m.status === 'live';
                const flagHome = flagMap[m.homeTeam] || '🏳️';
                const flagAway = flagMap[m.awayTeam] || '🏳️';
                const matchDate = new Date(m.datetime);
                
                return (
                  <tr 
                    key={m.id} 
                    className={`hover:bg-muted/15 transition-colors ${
                      isLive ? 'bg-primary/5 hover:bg-primary/10' : ''
                    }`}
                  >
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold">
                          {matchDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {matchDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl" role="img" aria-label={m.homeTeam}>{flagHome}</span>
                        <span className="font-black">{m.homeTeam}</span>
                        <span className="text-[9px] text-muted-foreground font-bold px-0.5">VS</span>
                        <span className="text-xl" role="img" aria-label={m.awayTeam}>{flagAway}</span>
                        <span className="font-black">{m.awayTeam}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {isLive ? (
                        <span className="inline-flex bg-primary/15 border border-primary/30 text-primary text-[8px] font-black px-2 py-0.5 rounded-full items-center gap-1 animate-pulse">
                          <span className="h-1.5 w-1.5 bg-primary rounded-full" /> LIVE
                        </span>
                      ) : m.status === 'completed' ? (
                        <span className="inline-flex text-[8px] bg-muted text-muted-foreground font-extrabold px-2 py-0.5 rounded border border-border/50">
                          COMPLETED
                        </span>
                      ) : (
                        <span className="inline-flex text-[8px] bg-muted text-muted-foreground font-extrabold px-2 py-0.5 rounded border border-border/50">
                          UPCOMING
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {m.score ? (
                        <span className="font-display font-black text-xs tracking-wider bg-muted text-foreground px-2.5 py-1 rounded-lg border border-border/70">
                          {m.score}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-primary uppercase bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
                          RSVP Open
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
