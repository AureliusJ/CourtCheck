'use client';

import Link from 'next/link';
import type { BoardSummary } from '@/lib/api/types';

interface CourtTileProps {
  courtNumber: number;
  board: BoardSummary;
  isAfterSunset: boolean;
}

function getTileClass(board: BoardSummary, isAfterSunset: boolean): string {
  if (isAfterSunset) return 'bg-brand-dusk text-brand-cream';
  if (board.current.queueCount === null) {
    return 'bg-brand-bg border border-brand-gray/40 text-brand-muted';
  }
  if (board.current.isStale) return 'bg-[#A8A49C] text-brand-cream';

  const wait = board.current.waitMinutes ?? 0;
  if (wait === 0) return 'bg-brand-sage text-brand-cream';
  if (wait <= 40) return 'bg-brand-amber text-brand-cream';
  return 'bg-brand-terracotta text-brand-cream';
}

function getStatusText(board: BoardSummary, isAfterSunset: boolean): string {
  if (isAfterSunset) return 'Closed';
  if (board.current.queueCount === null) return 'No data';
  if (board.current.isStale) return 'Stale';
  const wait = board.current.waitMinutes ?? 0;
  if (wait === 0) return 'No wait';
  if (wait <= 40) return 'Moderate wait';
  return 'Long wait';
}

export function CourtTile({ courtNumber, board, isAfterSunset }: CourtTileProps) {
  const tileClass = getTileClass(board, isAfterSunset);
  const statusText = getStatusText(board, isAfterSunset);
  const ariaLabel = `Court ${courtNumber}, ${board.label}, ${statusText}`;

  return (
    <Link
      href={`/update?board=${board.id}`}
      className={`
        flex items-center justify-center rounded-court aspect-[3/4]
        shadow-soft select-none transition-opacity hover:opacity-90 active:opacity-75
        ${tileClass}
      `}
      aria-label={ariaLabel}
    >
      <span className="font-serif text-3xl font-semibold opacity-80">
        {courtNumber}
      </span>
    </Link>
  );
}
