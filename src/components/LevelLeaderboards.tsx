'use client';

import { useEffect, useMemo, useState } from 'react';
import { Medal } from 'lucide-react';
import { PlayerLevel, PlayerRating } from '@/types';

interface LevelLeaderboardsProps {
  levelLeaderboards: {
    [key in PlayerLevel]?: PlayerRating[];
  };
}

const LEVEL_META: Record<
  PlayerLevel,
  {
    label: string;
    accent: string;
    activeClass: string;
    valueClass: string;
  }
> = {
  ADV: {
    label: 'ADV',
    accent: 'text-amber-300',
    activeClass: 'border-amber-300/60 bg-amber-300/18 text-amber-100',
    valueClass: 'text-amber-300',
  },
  INT: {
    label: 'INT',
    accent: 'text-cyan-300',
    activeClass: 'border-cyan-300/60 bg-cyan-300/16 text-cyan-100',
    valueClass: 'text-cyan-300',
  },
  PLUS: {
    label: 'PLUS',
    accent: 'text-violet-300',
    activeClass: 'border-violet-300/60 bg-violet-300/18 text-violet-100',
    valueClass: 'text-violet-300',
  },
};

export default function LevelLeaderboards({ levelLeaderboards }: LevelLeaderboardsProps) {
  const availableLevels = useMemo(
    () =>
      (['ADV', 'INT', 'PLUS'] as PlayerLevel[]).filter(
        (level) => (levelLeaderboards[level] ?? []).length > 0
      ),
    [levelLeaderboards]
  );

  const [selectedLevel, setSelectedLevel] = useState<PlayerLevel | null>(availableLevels[0] ?? null);

  useEffect(() => {
    if (!selectedLevel || !availableLevels.includes(selectedLevel)) {
      setSelectedLevel(availableLevels[0] ?? null);
    }
  }, [availableLevels, selectedLevel]);

  if (availableLevels.length === 0 || !selectedLevel) {
    return null;
  }

  const players = (levelLeaderboards[selectedLevel] ?? []).slice(0, 5);
  const meta = LEVEL_META[selectedLevel];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-electric-200">
        <Medal className={`h-3.5 w-3.5 ${meta.accent}`} />
        <span>Today&apos;s Top Players</span>
      </div>

      <div className="mb-3 flex gap-2">
        {availableLevels.map((level) => {
          const buttonMeta = LEVEL_META[level];
          const active = level === selectedLevel;

          return (
            <button
              key={level}
              type="button"
              onClick={() => setSelectedLevel(level)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
                active
                  ? buttonMeta.activeClass
                  : 'border-white/10 bg-white/5 text-electric-200 hover:bg-white/10'
              }`}
            >
              {buttonMeta.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-[10px] border-0 border-[#1b1b1b] bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01))] p-4 shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-[10px]">
        <div className="space-y-2">
          {players.map((player, index) => (
            <div
              key={player.playerName}
              className="flex items-center justify-between gap-3 border-b border-white/8 pb-2 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  <span className="mr-1 text-electric-300">{index + 1}.</span>
                  {player.playerName}
                </p>
              </div>
              <p className={`shrink-0 text-sm font-semibold ${meta.valueClass}`}>
                {player.ratingGain !== undefined
                  ? `${player.ratingGain >= 0 ? '+' : ''}${player.ratingGain.toFixed(1)}`
                  : player.mu.toFixed(1)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
