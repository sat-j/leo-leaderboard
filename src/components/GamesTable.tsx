'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Match } from '@/types';

interface GamesTableProps {
  matches: Match[];
}

export default function GamesTable({ matches }: GamesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const surfaceClass =
    'rounded-[10px] border-0 border-[#1b1b1b] bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-[10px]';

  if (matches.length === 0) {
    return (
      <div className={`${surfaceClass} p-4 sm:p-5`}>
        <h2 className="mb-3 text-xl font-bold text-white">Matches</h2>
        <p className="text-sm text-electric-200/80">No matches found for this play date.</p>
      </div>
    );
  }

  // Filter matches based on search query
  const filteredMatches = matches
    .map((match, index) => ({ match, originalIndex: index }))
    .filter(({ match }) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        match.player1.toLowerCase().includes(query) ||
        match.player2.toLowerCase().includes(query) ||
        match.player3.toLowerCase().includes(query) ||
        match.player4.toLowerCase().includes(query)
      );
    });

  return (
    <div className={`${surfaceClass} p-4 sm:p-5`}>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">Matches</h2>
        
        {/* Search Input */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="text-xs font-medium text-electric-200 sm:text-sm">Search:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Player name..."
            className="w-full rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,44,0.88),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-3 py-1.5 text-sm text-white placeholder:text-electric-200/45 focus:outline-none focus:ring-2 focus:ring-electric-500 sm:w-48"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/6">
            <tr>
              <th className="py-3 text-left text-[11px] font-medium uppercase tracking-wider text-electric-200/80">
                #
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-electric-200/80">
                Team 1
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-electric-200/80">
                Team 2
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 bg-transparent">
            {filteredMatches.map(({ match, originalIndex }) => {
              const team1Won = match.score1 > match.score2;
              
              return (
                <tr key={originalIndex} className="hover:bg-white/5">
                  <td className="whitespace-nowrap text-xs text-electric-100 sm:text-sm">
                    {originalIndex + 1}
                  </td>
                  <td className={`px-1 py-2.5 text-xs ${team1Won ? 'font-semibold text-emerald-300' : 'text-electric-100'}`}>
                    <div className="flex flex-col">
                      <span>{match.player1} / </span>
                      <span>{match.player2}</span>
                    </div>
                  </td>
                  <td className={`px-1 py-2.5 text-xs ${!team1Won ? 'font-semibold text-emerald-300' : 'text-electric-100'}`}>
                    <div className="flex flex-col">
                      <span>{match.player3} / </span>
                      <span>{match.player4}</span>
                    </div>
                  </td>
                  <td className="px-1 py-2.5 whitespace-nowrap text-xs text-center">
                    <span className={team1Won ? 'font-bold text-emerald-300' : 'text-electric-200/70'}>{match.score1}</span>
                    <span className="text-electric-200/50"> - </span>
                    <span className={!team1Won ? 'font-bold text-emerald-300' : 'text-electric-200/70'}>{match.score2}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredMatches.length === 0 && searchQuery.trim() && (
        <p className="py-4 text-center text-sm text-electric-200/70">No matches found for "{searchQuery}"</p>
      )}
    </div>
  );
}
