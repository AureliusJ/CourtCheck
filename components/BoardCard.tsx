'use client';

import Link from 'next/link';
import { Droplets } from 'lucide-react';
import type { BoardSummary, WeatherHint } from '@/lib/api/types';

interface BoardCardProps {
  board: BoardSummary;
  isAfterSunset: boolean;
  weatherHint?: WeatherHint | null;
}

// Board index → background color token
const BOARD_BG: Record<string, string> = {
  'ramsden-a': 'bg-brand-terracotta',
  'ramsden-b': 'bg-brand-amber',
  'ramsden-c': 'bg-brand-sage',
};

const BOARD_BG_DARK: Record<string, string> = {
  'ramsden-a': 'bg-brand-terracotta-dark',
  'ramsden-b': 'bg-brand-amber',
  'ramsden-c': 'bg-brand-sage-dark',
};

function getPillLabel(board: BoardSummary, isAfterSunset: boolean): string {
  if (isAfterSunset) return 'CLOSED';
  if (board.current.queueCount === null) return 'NO DATA';
  if (board.current.isStale) return 'STALE';
  if (board.current.waitMinutes === 0) return 'FREE';
  return 'ACTIVE';
}

function getQueueLine(board: BoardSummary, isAfterSunset: boolean): string {
  if (isAfterSunset) return 'Courts are closed after sunset';
  const { queueCount, waitMinutes, waitDisplayLow, waitDisplayHigh } = board.current;
  if (queueCount === null) return 'No data yet';
  if (queueCount === 0) return 'No wait — courts likely open';
  if (waitMinutes === null) return `${queueCount} rackets`;
  return `${queueCount} rackets · ~${waitMinutes} min, typically ${waitDisplayLow}–${waitDisplayHigh}`;
}

function getUpdatedLine(board: BoardSummary): string {
  const { lastUpdatedAt, minutesAgo, confirmationCount } = board.current;
  if (!lastUpdatedAt) return 'No recent reports';
  const confirmed = confirmationCount > 0 ? ` · ${confirmationCount} confirmed` : '';
  return `Updated ${minutesAgo}m ago${confirmed}`;
}

export function BoardCard({ board, isAfterSunset, weatherHint }: BoardCardProps) {
  const bg = isAfterSunset ? 'bg-black/30' : (BOARD_BG[board.id] ?? 'bg-brand-gray');
  const bgDark = isAfterSunset ? 'bg-black/40' : (BOARD_BG_DARK[board.id] ?? 'bg-brand-gray');
  const pill = getPillLabel(board, isAfterSunset);
  const hasData = board.current.queueCount !== null;
  const isStale = board.current.isStale;

  return (
    <div className={`${bg} rounded-card overflow-hidden ${isAfterSunset ? 'border border-white/10' : 'shadow-soft'}`}>
      {/* Top row: status pill + courts label */}
      <div className="flex items-center justify-between px-5 pt-4">
        <span className="bg-white/20 text-brand-cream text-[10px] font-sans font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-full">
          {pill}
        </span>
        <span className="text-brand-cream/70 text-[10px] font-sans font-bold tracking-[0.15em] uppercase">
          {board.courtRangeLabel.toUpperCase().replace('–', '–')}
        </span>
      </div>

      {/* Board name */}
      <div className="px-5 pt-3">
        <h2
          className={`font-serif text-4xl font-semibold text-brand-cream ${
            (isStale || isAfterSunset) ? 'opacity-60' : ''
          }`}
        >
          {board.label}
        </h2>
      </div>

      {/* Queue line */}
      <div className="px-5 pt-1 pb-4">
        <p
          className={`font-sans text-brand-cream text-[15px] ${
            (isStale || isAfterSunset || !hasData) ? 'opacity-60' : ''
          }`}
        >
          {getQueueLine(board, isAfterSunset)}
        </p>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-white/15" />

      {/* Footer: updated time + condition badge + update button */}
      <div className="px-5 py-3 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="font-sans text-[13px] text-brand-cream/70 truncate">
            {getUpdatedLine(board)}
          </p>
          {/* Condition badge — only when user has actively reported dry/wet */}
          {hasData && board.current.courtCondition !== 'unknown' && (
            <span className="inline-flex items-center gap-1 bg-white/15 text-brand-cream text-[11px] font-sans font-medium px-2 py-0.5 rounded-full w-fit">
              <Droplets size={10} />
              {board.current.courtCondition === 'dry' ? 'Dry' : 'Wet'}
            </span>
          )}
          {/* Weather hint — shown when no active condition report and board has no fresh data */}
          {weatherHint &&
            weatherHint.summary &&
            !isAfterSunset &&
            (board.current.courtCondition === 'unknown' || !hasData || isStale) && (
              <p className="font-sans text-[11px] italic text-brand-cream/60">
                {weatherHint.summary}
              </p>
            )}
        </div>

        <Link
          href={`/update?board=${board.id}`}
          className={`${bgDark} text-brand-cream text-[13px] font-sans font-medium px-4 py-2 rounded-full shrink-0 hover:opacity-90 active:opacity-75 transition-opacity`}
        >
          Update +
        </Link>
      </div>
    </div>
  );
}
