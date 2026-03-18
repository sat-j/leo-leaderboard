'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PlayDateOption } from '@/types';

interface DateNavigationProps {
  selectedDate: string;
  playDates: PlayDateOption[];
  previousDate: string | null;
  nextDate: string | null;
  onDateChange: (date: string) => void;
}

export default function DateNavigation({
  selectedDate,
  playDates,
  previousDate,
  nextDate,
  onDateChange,
}: DateNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 sm:gap-4 sm:py-6">
      <button
        onClick={() => previousDate && onDateChange(previousDate)}
        disabled={!previousDate}
        className="rounded-full bg-white p-2 shadow-md transition-all hover:bg-electric-100 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Previous play date"
      >
        <ChevronLeft className="w-6 h-6 text-electric-700" />
      </button>

      <select
        value={selectedDate}
        onChange={(event) => onDateChange(event.target.value)}
        className="cursor-pointer rounded-lg bg-white px-3 py-2 text-base font-bold text-electric-800 shadow-md transition-all hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-coral-500 sm:px-6 sm:py-3 sm:text-xl"
      >
        {playDates.map((playDate) => (
          <option key={playDate.id} value={playDate.date}>
            {playDate.labelShort}
          </option>
        ))}
      </select>

      <button
        onClick={() => nextDate && onDateChange(nextDate)}
        disabled={!nextDate}
        className="rounded-full bg-white p-2 shadow-md transition-all hover:bg-electric-100 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label="Next play date"
      >
        <ChevronRight className="w-6 h-6 text-electric-700" />
      </button>
    </div>
  );
}
