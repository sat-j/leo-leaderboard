'use client';

import { Trophy, Users, Target } from 'lucide-react';
import { WeekStats } from '@/types';

interface StatsGridProps {
  weekStats: WeekStats;
}

const SECTION_LABEL_CLASS = 'mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-200';
const METALLIC_SURFACE_CLASS =
  'rounded-[10px] border-0 border-[#1b1b1b] bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-[10px]';

const TOP_MOVER_ACCENTS = [
  'border-t-4 border-amber-400',
  'border-t-4 border-slate-300',
  'border-t-4 border-orange-400',
];

export default function StatsGrid({ weekStats }: StatsGridProps) {
  const topMovers = weekStats.topPlayers.slice(0, 3);
  const mostGames = weekStats.mostGamesPlayed.slice(0, 3);
  const bestWinRate = weekStats.bestWinPercentage.slice(0, 3);

  return (
    <section className="mb-6 space-y-5">
      <div>
        <div className={SECTION_LABEL_CLASS}>
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          <span>Top Movers</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {topMovers.map((player, index) => (
            <article
              key={player.playerName}
              className={`rounded-[5px] border-b-0 border-l-0 border-r-0 ${TOP_MOVER_ACCENTS[index] ?? TOP_MOVER_ACCENTS[TOP_MOVER_ACCENTS.length - 1]} bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-[10px] flex min-h-[104px] flex-col items-center justify-between px-2 py-3 text-center sm:min-h-[120px] sm:px-3`}
            >
              <div className="text-lg font-black tracking-tight text-amber-300 sm:text-xl">#{index + 1}</div>
              <div className="line-clamp-2 text-[11px] font-semibold leading-4 text-white sm:text-sm">
                {player.playerName}
              </div>
              <div className="text-sm font-bold text-emerald-300 sm:text-base">
                {player.ratingGain >= 0 ? '+' : ''}
                {player.ratingGain.toFixed(1)}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div>
        <div className={SECTION_LABEL_CLASS}>
          <span className="text-pink-300">▥</span>
          <span>Today&apos;s Stats</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <article className={`${METALLIC_SURFACE_CLASS} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-electric-200">
              <Users className="h-3.5 w-3.5 text-violet-300" />
              <span>Knees of Steel</span>
            </div>
            <p className="mb-3 text-[11px] text-electric-300/80">Most games</p>
            <div className="space-y-2">
              {mostGames.length > 0 ? (
                mostGames.map((player, index) => (
                  <div key={player.playerName} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-electric-100">
                      <span className="mr-1 text-electric-300">{index + 1}.</span>
                      {player.playerName}
                    </span>
                    <span className="shrink-0 font-semibold text-sky-300">{player.gamesPlayed}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-electric-200/70">No data</p>
              )}
            </div>
          </article>

          <article className={`${METALLIC_SURFACE_CLASS} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-electric-200">
              <Target className="h-3.5 w-3.5 text-pink-300" />
              <span>Sniper Club</span>
            </div>
            <p className="mb-3 text-[11px] text-electric-300/80">Best win rate</p>
            <div className="space-y-2">
              {bestWinRate.length > 0 ? (
                bestWinRate.map((player, index) => (
                  <div key={player.playerName} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-electric-100">
                      <span className="mr-1 text-electric-300">{index + 1}.</span>
                      {player.playerName}
                    </span>
                    <span className="shrink-0 font-semibold text-fuchsia-300">
                      {player.winPercentage.toFixed(0)}%
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-electric-200/70">No data</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
