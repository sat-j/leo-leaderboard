'use client';

import { Star, Heart, Swords } from 'lucide-react';
import { RockstarPlayer, PlayerPair } from '@/types';

interface FunStatsProps {
  rockstars: RockstarPlayer[];
  closeBuddies: PlayerPair[];
  rivalries: PlayerPair[];
}

function FunStatList({
  title,
  subtitle,
  accentClass,
  surfaceClass,
  icon,
  rows,
}: {
  title: string;
  subtitle: string;
  accentClass: string;
  surfaceClass: string;
  icon: React.ReactNode;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <article
      className={`rounded-[10px] border-0 border-[#1b1b1b] p-3.5 shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-[10px] ${surfaceClass}`}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${accentClass}`}>{icon}</span>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[11px] text-electric-200/80">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        {rows.length > 0 ? (
          rows.map((row, index) => (
            <div
              key={`${title}-${row.label}-${index}`}
              className="flex items-center justify-between gap-3 border-b border-white/8 pb-1.5 last:border-b-0 last:pb-0"
            >
              <p className="truncate text-xs text-electric-100">
                <span className="mr-1 text-electric-300">{index + 1}.</span>
                {row.label}
              </p>
              <p
                className={`shrink-0 text-xs font-semibold ${
                  accentClass.includes('yellow')
                    ? 'text-yellow-300'
                    : accentClass.includes('pink')
                      ? 'text-pink-300'
                      : 'text-red-300'
                }`}
              >
                {row.value}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-electric-200/70">No data available</p>
        )}
      </div>
    </article>
  );
}

export default function FunStats({ rockstars, closeBuddies, rivalries }: FunStatsProps) {
  const rockstarRows = rockstars.slice(0, 3).map((player) => ({
    label: player.playerName,
    value: `+${player.improvement.toFixed(1)}`,
  }));

  const buddyRows = closeBuddies.slice(0, 3).map((pair) => ({
    label: `${pair.player1} & ${pair.player2}`,
    value: `${pair.count} together`,
  }));

  const rivalryRows = rivalries.slice(0, 3).map((pair) => ({
    label: `${pair.player1} vs ${pair.player2}`,
    value: `${pair.count} matches`,
  }));

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-electric-200">Fun Statistics</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <FunStatList
          title="Rockstars"
          subtitle="Most improved"
          accentClass="bg-yellow-400/15 text-yellow-300"
          surfaceClass="bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(250,204,21,0.10),rgba(250,204,21,0.02))]"
          icon={<Star className="h-4 w-4" />}
          rows={rockstarRows}
        />
        <FunStatList
          title="Close Buddies"
          subtitle="Best teammate volume"
          accentClass="bg-pink-400/15 text-pink-300"
          surfaceClass="bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(244,114,182,0.10),rgba(244,114,182,0.02))]"
          icon={<Heart className="h-4 w-4" />}
          rows={buddyRows}
        />
        <FunStatList
          title="Rivalries"
          subtitle="Most repeated matchups"
          accentClass="bg-red-400/15 text-red-300"
          surfaceClass="bg-[linear-gradient(180deg,rgba(10,22,44,0.9),rgba(6,16,32,0.94)),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.01)),linear-gradient(135deg,rgba(248,113,113,0.10),rgba(248,113,113,0.02))]"
          icon={<Swords className="h-4 w-4" />}
          rows={rivalryRows}
        />
      </div>
    </section>
  );
}
