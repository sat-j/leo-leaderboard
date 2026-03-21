'use client';

import type { SeasonOption } from '@/types';

interface SeasonNavigationProps {
  seasons: SeasonOption[];
  selectedSeason: string;
  currentSeason: string | null;
  onSeasonChange: (season: string) => void;
}

export default function SeasonNavigation({
  seasons,
  selectedSeason,
  currentSeason,
  onSeasonChange,
}: SeasonNavigationProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-center gap-2 sm:mb-4 sm:gap-3">
      <select
        value={selectedSeason}
        onChange={(event) => onSeasonChange(event.target.value)}
        className="cursor-pointer rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,44,0.88),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-4 py-2 text-sm font-semibold text-electric-100 shadow-md outline-none transition hover:shadow-lg focus:ring-2 focus:ring-coral-500 sm:px-5"
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.slug}>
            {season.name}
          </option>
        ))}
      </select>

      {currentSeason && selectedSeason === currentSeason ? (
        <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-400/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
          Current Season
        </span>
      ) : null}
    </div>
  );
}
