'use client';

import { CourtTile } from './CourtTile';
import type { BoardSummary } from '@/lib/api/types';

interface CourtMapProps {
  boards: BoardSummary[];
  isAfterSunset: boolean;
}

// Fixed court layout for Ramsden Park:
//   West cluster: Courts 1-2 (Board A, top row), Courts 3-4 (Board B, bottom row)
//   East cluster: Courts 5-6 (Board C, top row), Courts 7-8 (Board C, bottom row)
const WEST_LAYOUT = [
  { courtNumber: 1, boardIndex: 0 },
  { courtNumber: 2, boardIndex: 0 },
  { courtNumber: 3, boardIndex: 1 },
  { courtNumber: 4, boardIndex: 1 },
];

const EAST_LAYOUT = [
  { courtNumber: 5, boardIndex: 2 },
  { courtNumber: 6, boardIndex: 2 },
  { courtNumber: 7, boardIndex: 2 },
  { courtNumber: 8, boardIndex: 2 },
];

export function CourtMap({ boards, isAfterSunset }: CourtMapProps) {
  return (
    <div className="flex gap-3 items-stretch">
      {/* West cluster: 2 columns × 2 rows */}
      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1">
        {WEST_LAYOUT.map(({ courtNumber, boardIndex }) => (
          <CourtTile
            key={courtNumber}
            courtNumber={courtNumber}
            board={boards[boardIndex]}
            isAfterSunset={isAfterSunset}
          />
        ))}
      </div>

      {/* Walking path divider */}
      <div className="flex flex-col items-center justify-center gap-1 px-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="w-px h-3 bg-brand-muted/30" />
        ))}
      </div>

      {/* East cluster: 2 columns × 2 rows */}
      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1">
        {EAST_LAYOUT.map(({ courtNumber, boardIndex }) => (
          <CourtTile
            key={courtNumber}
            courtNumber={courtNumber}
            board={boards[boardIndex]}
            isAfterSunset={isAfterSunset}
          />
        ))}
      </div>
    </div>
  );
}
