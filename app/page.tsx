'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicScoreEntry from '@/components/PublicScoreEntry';
import DateNavigation from '@/components/DateNavigation';
import StatsGrid from '@/components/StatsGrid';
import LevelLeaderboards from '@/components/LevelLeaderboards';
import FunStats from '@/components/FunStats';
import GamesTable from '@/components/GamesTable';
import PlayerStatsTable from '@/components/PlayerStatsTable';
import { PublicLeaderboardData } from '@/types';

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [data, setData] = useState<PublicLeaderboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDesktopDrawerOpen, setIsDesktopDrawerOpen] = useState<boolean>(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(false);
  const [isPlayerStatsOpen, setIsPlayerStatsOpen] = useState<boolean>(false);
  const [isMatchesOpen, setIsMatchesOpen] = useState<boolean>(false);

  const fetchLeaderboardData = async (date?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = date ? `/api/public/leaderboard?date=${date}` : '/api/public/leaderboard';
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch leaderboard data');
      }

      setData(result.data);
      setSelectedDate(result.data.selectedDate);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');

    const syncViewport = (event?: MediaQueryListEvent) => {
      const matches = event ? event.matches : mediaQuery.matches;
      setIsDesktopViewport(matches);
      if (!matches) {
        setIsDesktopDrawerOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);

    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isDesktopDrawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDesktopDrawerOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesktopDrawerOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-coral-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchLeaderboardData(selectedDate ?? undefined)}
            className="bg-electric-600 text-white px-6 py-2 rounded-lg hover:bg-electric-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700">
      <div className="container mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-8">
        <div className="mb-4 text-center sm:mb-8">
          <h1 className="mb-2 text-2xl font-bold text-white sm:text-4xl md:text-5xl">
            Leo Badminton Club - Leaderboard
          </h1>
          <p className="text-sm text-electric-200 sm:text-base">
            {data.selectedDateLabel} leaderboard powered by processed match history
          </p>
          <div className="mt-4 flex justify-center sm:mt-5">
            {isDesktopViewport ? (
              <button
                type="button"
                onClick={() => setIsDesktopDrawerOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-900/30 transition-transform hover:-translate-y-0.5 hover:bg-coral-400 sm:px-6 sm:py-3"
              >
                <span>Enter Score</span>
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <Link
                href="/submit-score"
                className="inline-flex items-center gap-2 rounded-full bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-coral-900/30 transition-transform hover:-translate-y-0.5 hover:bg-coral-400 sm:px-6 sm:py-3"
              >
                <span>Enter Score</span>
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>

        <DateNavigation
          selectedDate={data.selectedDate}
          playDates={data.playDates}
          previousDate={data.previousDate}
          nextDate={data.nextDate}
          onDateChange={(date) => fetchLeaderboardData(date)}
        />

        <div className="mb-4 text-center sm:mb-6">
          <p className="text-sm font-medium text-electric-100">
            # {data.matches.length} {data.matches.length === 1 ? 'match' : 'matches'} on this date
          </p>
        </div>

        <StatsGrid weekStats={data.weekStats} />

        <LevelLeaderboards levelLeaderboards={data.levelLeaderboards} />

        <FunStats
          rockstars={data.rockstars}
          closeBuddies={data.closeBuddies}
          rivalries={data.rivalries}
        />

        {data.playerWeekStats && data.playerWeekStats.length > 0 ? (
          <section className="mb-8">
            <div className="mb-3 flex items-center justify-between sm:hidden">
              <div>
                <h2 className="text-lg font-bold text-white">Player Statistics</h2>
                <p className="text-xs text-electric-200">Expanded table, hidden by default on mobile.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPlayerStatsOpen((current) => !current)}
                className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,44,0.88),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-3 py-1.5 text-xs font-semibold text-electric-100"
              >
                {isPlayerStatsOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className={`${isPlayerStatsOpen ? 'block' : 'hidden'} sm:block`}>
              <PlayerStatsTable stats={data.playerWeekStats} title="Player Statistics" isOverall={false} />
            </div>
          </section>
        ) : null}

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between sm:hidden">
            <div>
              <h2 className="text-lg font-bold text-white">Matches</h2>
              <p className="text-xs text-electric-200">{data.matches.length} matches for this play date.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsMatchesOpen((current) => !current)}
              className="rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(10,22,44,0.88),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-3 py-1.5 text-xs font-semibold text-electric-100"
            >
              {isMatchesOpen ? 'Hide' : 'Show'}
            </button>
          </div>
          <div className={`${isMatchesOpen ? 'block' : 'hidden'} sm:block`}>
            <GamesTable matches={data.matches} />
          </div>
        </section>

        <div className="mt-8 text-center text-sm text-electric-200 sm:mt-12">
          <p>Powered by TrueSkill Rating System</p>
        </div>
      </div>

      {isDesktopViewport && isDesktopDrawerOpen ? (
        <div className="fixed inset-0 z-50 hidden lg:block">
          <button
            type="button"
            aria-label="Close score entry"
            className="absolute inset-0 bg-electric-950/75 backdrop-blur-sm"
            onClick={() => setIsDesktopDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col overflow-y-auto border-l border-electric-600 bg-[#071225] shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-electric-700 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Score Entry</h2>
                <p className="text-sm text-electric-200">Enter scores without leaving the leaderboard.</p>
              </div>
              <button
                type="button"
                className="rounded-full border border-electric-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-electric-700"
                onClick={() => setIsDesktopDrawerOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <PublicScoreEntry mode="drawer" />
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
