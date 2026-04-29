'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BoardSelector } from '@/components/BoardSelector';
import { DaySelector, getTodayInToronto } from '@/components/DaySelector';
import { BusyTimesChart } from '@/components/BusyTimesChart';
import { useBusyTimes } from '@/hooks/useBusyTimes';
import type { DayValue } from '@/components/DaySelector';

export default function BusyTimesPage() {
  const [boardId, setBoardId] = useState('ramsden-a');
  const [day, setDay] = useState<DayValue>(getTodayInToronto);

  const { data, isLoading } = useBusyTimes(boardId, day);

  const totalSampleSize = data?.hourly.reduce((sum, h) => sum + h.sampleSize, 0) ?? 0;

  return (
    <main className="max-w-sm mx-auto px-4 pt-5 pb-10 min-h-screen bg-brand-bg">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1 font-sans text-[11px] font-bold tracking-[0.15em] text-brand-muted uppercase hover:text-brand-text transition-colors"
      >
        <ChevronLeft size={14} />
        Back
      </Link>

      {/* Header */}
      <div className="mt-5">
        <p className="font-sans text-[10px] font-bold tracking-[0.15em] text-brand-muted uppercase">
          Historical
        </p>
        <h1 className="font-serif text-5xl font-semibold text-brand-text leading-tight mt-0.5">
          Busy Times
        </h1>
      </div>

      {/* Board selector */}
      <div className="mt-6">
        <BoardSelector selected={boardId} onChange={setBoardId} />
      </div>

      {/* Day selector */}
      <div className="mt-4">
        <DaySelector selected={day} onChange={setDay} />
      </div>

      {/* Chart area */}
      <div className="mt-6">
        {isLoading ? (
          <div className="py-16 text-center">
            <p className="font-sans text-[13px] text-brand-muted">Loading…</p>
          </div>
        ) : (
          <BusyTimesChart
            hourly={data?.hourly ?? []}
            sunriseHour={data?.sunriseHour ?? 6}
            sunsetHour={data?.sunsetHour ?? 20}
            boardId={boardId}
            totalSampleSize={totalSampleSize}
          />
        )}
      </div>
    </main>
  );
}
