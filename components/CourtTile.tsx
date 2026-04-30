'use client';

import Link from 'next/link';
import type { BoardSummary } from '@/lib/api/types';

interface CourtTileProps {
  courtNumber: number;
  board: BoardSummary;
  isAfterSunset: boolean;
}

function getTileColor(
  waitMinutes: number | null,
  isStale: boolean,
  isAfterSunset: boolean,
  hasNoData: boolean,
): string {
  if (isAfterSunset) return '#4A5D70';
  if (hasNoData) return '#E8E4DC';
  if (isStale) return '#A8A49C';
  if (waitMinutes === 0) return '#7C8B70';
  if ((waitMinutes ?? 0) <= 30) return '#A8B86B';
  if ((waitMinutes ?? 0) <= 60) return '#D49A4C';
  return '#BC5F48';
}

function getStatusText(board: BoardSummary, isAfterSunset: boolean): string {
  if (isAfterSunset) return 'Closed';
  if (board.current.queueCount === null) return 'No data';
  if (board.current.isStale) return 'Stale';
  const wait = board.current.waitMinutes ?? 0;
  if (wait === 0) return 'No wait';
  if (wait <= 30) return 'Short wait';
  if (wait <= 60) return 'Moderate wait';
  return 'Long wait';
}

export function CourtTile({ courtNumber, board, isAfterSunset }: CourtTileProps) {
  const hasNoData = board.current.queueCount === null;
  const bgColor = getTileColor(
    board.current.waitMinutes,
    board.current.isStale,
    isAfterSunset,
    hasNoData,
  );
  const statusText = getStatusText(board, isAfterSunset);
  const ariaLabel = `Court ${courtNumber}, ${board.label}, ${statusText}`;
  const textClass = hasNoData && !isAfterSunset ? 'text-brand-muted' : 'text-white';

  return (
    <Link
      href={`/update?board=${board.id}`}
      className={`flex items-center justify-center rounded-court aspect-[3/4] shadow-soft select-none transition-opacity hover:opacity-90 active:opacity-75 ${textClass}`}
      style={{ backgroundColor: bgColor }}
      aria-label={ariaLabel}
    >
      <span className="font-serif text-3xl font-semibold opacity-80">
        {courtNumber}
      </span>
    </Link>
  );
}
