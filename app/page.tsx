'use client';

import { useEffect } from 'react';
import { Sun } from 'lucide-react';
import { useCurrentPark } from '@/hooks/useCurrentPark';
import { CourtMap } from '@/components/CourtMap';
import { SunStatusStrip } from '@/components/SunStatusStrip';
import { BoardCard } from '@/components/BoardCard';
import { StickyUpdateCTA } from '@/components/StickyUpdateCTA';
import type { SunWindow } from '@/lib/sun';
import { useState } from 'react';

function BoardLegendRow({
  label,
  range,
  board,
  isAfterSunset,
}: {
  label: string;
  range: string;
  board: { queueCount: number | null; waitMinutes: number | null; isStale: boolean; minutesAgo: number | null } | undefined;
  isAfterSunset: boolean;
}) {
  let detail = 'No data yet';
  if (isAfterSunset) {
    detail = 'Closed';
  } else if (board) {
    if (board.isStale && board.minutesAgo !== null) {
      const hours = Math.floor(board.minutesAgo / 60);
      detail = `Last update ${hours}h ago`;
    } else if (board.queueCount === null) {
      detail = 'No data yet';
    } else if (board.queueCount === 0) {
      detail = '0 rackets · No wait';
    } else if (board.waitMinutes !== null) {
      const prefix = board.waitMinutes > 40 ? '>' : '~';
      detail = `${board.queueCount} rackets · ${prefix}${board.waitMinutes} min`;
    }
  }

  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-sans text-[13px] text-brand-text">
        <span className="font-bold">{label}</span>{' '}
        <span className="text-brand-muted">({range})</span>
      </span>
      <span className="font-sans text-[13px] text-brand-muted text-right">{detail}</span>
    </div>
  );
}

export default function HomePage() {
  const { data, isLoading, isError } = useCurrentPark();
  const [hueState, setHueState] = useState<SunWindow['hueState']>('day');

  // Apply sun-state to body for CSS gradient transitions
  useEffect(() => {
    document.body.setAttribute('data-sun-state', hueState);
    return () => document.body.removeAttribute('data-sun-state');
  }, [hueState]);

  const isAfterSunset = hueState === 'post-sunset';
  const boards = data?.boards ?? [];
  const allNoData = boards.length > 0 && boards.every((b) => b.current.queueCount === null);

  // Skeleton / error states
  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <p className="font-sans text-brand-muted text-sm">Loading courts…</p>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center px-6">
        <p className="font-sans text-brand-muted text-sm text-center">
          Could not load court data. Check your connection.
        </p>
      </div>
    );
  }

  return (
    <main className="max-w-sm mx-auto px-4 pt-6 pb-40 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-sans text-[10px] font-bold tracking-[0.15em] text-brand-muted uppercase">
            Ramsden Park
          </p>
          <h1 className="font-serif text-5xl font-semibold text-brand-text leading-tight mt-0.5">
            Tennis
            <br />
            Courts
          </h1>
        </div>
        <Sun
          size={22}
          className={`mt-1 shrink-0 ${
            isAfterSunset ? 'text-brand-dusk' : 'text-brand-amber'
          }`}
        />
      </div>

      {/* Sun status strip */}
      <div className="mt-4 mb-6">
        <SunStatusStrip onHueStateChange={setHueState} />
      </div>

      {/* Court map */}
      {boards.length > 0 && (
        <CourtMap boards={boards} isAfterSunset={isAfterSunset} />
      )}

      {/* Condensed legend */}
      {boards.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {boards.map((board) => {
            const parts = board.courtRangeLabel.match(/\d+/g) ?? [];
            const range = parts.join('-');
            return (
              <BoardLegendRow
                key={board.id}
                label={board.label}
                range={range}
                board={board.current}
                isAfterSunset={isAfterSunset}
              />
            );
          })}
        </div>
      )}

      {/* Empty state — shown when ALL boards have no data */}
      {allNoData && !isAfterSunset && (
        <div className="mt-6 rounded-card border border-brand-gray/30 bg-brand-cream/50 px-5 py-6">
          <h2 className="font-serif text-3xl font-semibold text-brand-text leading-tight">
            Be the first to
            <br />
            update
          </h2>
          <p className="mt-3 font-sans text-[14px] text-brand-muted leading-relaxed">
            No reports yet today. Tap a court to share what you see.
          </p>
          <p className="mt-4 font-sans text-[13px] text-brand-muted/60 italic text-center">
            Waiting for your report...
          </p>
        </div>
      )}

      {/* Board summary cards */}
      {boards.length > 0 && (
        <div className="mt-6 space-y-3">
          {boards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              isAfterSunset={isAfterSunset}
            />
          ))}
        </div>
      )}

      {/* Sticky CTA (positioned outside scroll flow) */}
      <StickyUpdateCTA />
    </main>
  );
}
