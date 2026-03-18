'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PlayerWeekStat, PlayerOverallStat, PlayerLevel } from '@/types';

type SortField = 'playerName' | 'level' | 'skillRating' | 'totalMatches' | 'matchesWon' | 'winRate' | 'totalPointsScored' | 'pointsDifference' | 'ratingChange' | 'currentRating' | 'totalRatingChange' | 'weeksPlayed';
type SortOrder = 'asc' | 'desc';

interface PlayerStatsTableProps {
  stats: PlayerWeekStat[] | PlayerOverallStat[];
  title: string;
  isOverall?: boolean;
}

export default function PlayerStatsTable({ stats, title, isOverall = false }: PlayerStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>(isOverall ? 'currentRating' : 'skillRating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [levelFilter, setLevelFilter] = useState<PlayerLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    let filtered = [...stats];
    
    // Apply level filter
    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(stat => stat.level === levelFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(stat => 
        stat.playerName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: string | number = a[sortField as keyof typeof a] as string | number;
      let bVal: string | number = b[sortField as keyof typeof b] as string | number;
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stats, sortField, sortOrder, levelFilter, searchQuery]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 text-electric-600" /> : 
      <ArrowDown className="w-4 h-4 ml-1 text-electric-600" />;
  };

  const formatRatingChange = (change: number) => {
    if (change === 0) return <span className="text-gray-500">0.0</span>;
    const prefix = change > 0 ? '+' : '';
    const color = change > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
    return <span className={color}>{prefix}{change.toFixed(1)}</span>;
  };

  const surfaceClass =
    'rounded-[10px] border-0 border-[#1b1b1b] bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-[10px]';
  const filterButtonClass =
    'rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.06em] transition';

  if (stats.length === 0) {
    return (
      <div className={`${surfaceClass} mb-8 p-4 sm:p-5`}>
        <h2 className="mb-3 text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-electric-200/80">No player statistics available.</p>
      </div>
    );
  }

  return (
    <div className={`${surfaceClass} mb-8 p-4 sm:p-5`}>
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        
        <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:flex-row sm:items-center">
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

          {/* Level Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-medium text-electric-200 sm:text-sm">Level:</label>
            {(['ALL', 'ADV', 'PLUS', 'INT'] as const).map((level) => {
              const active = levelFilter === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setLevelFilter(level)}
                  className={`${filterButtonClass} ${
                    active
                      ? 'border-electric-400/60 bg-electric-400/18 text-white'
                      : 'border-white/10 bg-[linear-gradient(180deg,rgba(10,22,44,0.88),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] text-electric-200 hover:bg-white/10'
                  }`}
                >
                  {level === 'ALL' ? 'All' : level}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10">
          <thead className="bg-white/6">
            <tr>
              <th 
                onClick={() => handleSort('playerName')}
                className="cursor-pointer px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center">
                  Player Name
                  <SortIcon field="playerName" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('level')}
                className="cursor-pointer px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center">
                  Level
                  <SortIcon field="level" />
                </div>
              </th>
              <th 
                onClick={() => handleSort(isOverall ? 'currentRating' : 'skillRating')}
                className="cursor-pointer px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center">
                  {isOverall ? 'Current Rating' : 'Skill Rating'}
                  <SortIcon field={isOverall ? 'currentRating' : 'skillRating'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort(isOverall ? 'totalRatingChange' : 'ratingChange')}
                className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center justify-center">
                  Rating Change
                  <SortIcon field={isOverall ? 'totalRatingChange' : 'ratingChange'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('totalMatches')}
                className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center justify-center">
                  Total Matches
                  <SortIcon field="totalMatches" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('matchesWon')}
                className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center justify-center">
                  Matches Won
                  <SortIcon field="matchesWon" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('winRate')}
                className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center justify-center">
                  Win Rate
                  <SortIcon field="winRate" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('totalPointsScored')}
                className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center justify-center">
                  Points Scored
                  <SortIcon field="totalPointsScored" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pointsDifference')}
                className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
              >
                <div className="flex items-center justify-center">
                  Points Diff
                  <SortIcon field="pointsDifference" />
                </div>
              </th>
              {isOverall && (
                <th 
                  onClick={() => handleSort('weeksPlayed')}
                  className="cursor-pointer px-3 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-electric-200/80 hover:bg-white/5"
                >
                  <div className="flex items-center justify-center">
                    Weeks Played
                    <SortIcon field="weeksPlayed" />
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8 bg-transparent">
            {filteredAndSortedStats.map((stat, idx) => {
              const isWeekStat = 'skillRating' in stat;
              const rating = isWeekStat ? stat.skillRating : (stat as PlayerOverallStat).currentRating;
              const ratingChange = isWeekStat ? stat.ratingChange : (stat as PlayerOverallStat).totalRatingChange;
              
              return (
                <tr key={idx} className="hover:bg-white/5">
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-medium text-white">
                    {stat.playerName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      stat.level === 'ADV' ? 'bg-amber-300/15 text-amber-200' :
                      stat.level === 'PLUS' ? 'bg-violet-300/15 text-violet-200' :
                      'bg-cyan-300/15 text-cyan-200'
                    }`}>
                      {stat.level}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-sm font-semibold text-electric-100">
                    {rating.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm">
                    {formatRatingChange(ratingChange)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm text-electric-100">
                    {stat.totalMatches}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm text-electric-100">
                    {stat.matchesWon}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm text-electric-100">
                    {stat.winRate.toFixed(1)}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm text-electric-100">
                    {stat.totalPointsScored}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm text-electric-100">
                    {stat.pointsDifference > 0 ? '+' : ''}{stat.pointsDifference}
                  </td>
                  {isOverall && (
                    <td className="whitespace-nowrap px-3 py-2.5 text-center text-sm text-electric-100">
                      {(stat as PlayerOverallStat).weeksPlayed}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredAndSortedStats.length === 0 && levelFilter !== 'ALL' && (
        <p className="py-4 text-center text-sm text-electric-200/70">No players found for level {levelFilter}</p>
      )}
    </div>
  );
}
