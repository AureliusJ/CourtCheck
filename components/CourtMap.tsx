'use client';

import { CourtTile } from './CourtTile';
import type { BoardSummary } from '@/lib/api/types';

interface CourtMapProps {
  boards: BoardSummary[];
  isAfterSunset: boolean;
  onBoardSelect?: (boardId: string) => void;
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

function PickerTile({
  courtNumber,
  board,
  isAfterSunset,
  onBoardSelect,
}: {
  courtNumber: number;
  board: BoardSummary;
  isAfterSunset: boolean;
  onBoardSelect: (boardId: string) => void;
}) {
  return (
    <div className="relative">
      <CourtTile courtNumber={courtNumber} board={board} isAfterSunset={isAfterSunset} />
      {/* Overlay intercepts click so the inner Link never fires */}
      <button
        className="absolute inset-0 rounded-court"
        aria-label={`Select board ${board.label}`}
        onClick={() => onBoardSelect(board.id)}
      />
    </div>
  );
}

export function CourtMap({ boards, isAfterSunset, onBoardSelect }: CourtMapProps) {
  const Tile = onBoardSelect
    ? ({ courtNumber, boardIndex }: { courtNumber: number; boardIndex: number }) => (
        <PickerTile
          courtNumber={courtNumber}
          board={boards[boardIndex]}
          isAfterSunset={isAfterSunset}
          onBoardSelect={onBoardSelect}
        />
      )
    : ({ courtNumber, boardIndex }: { courtNumber: number; boardIndex: number }) => (
        <CourtTile
          courtNumber={courtNumber}
          board={boards[boardIndex]}
          isAfterSunset={isAfterSunset}
        />
      );

  return (
    <div className="flex gap-3 items-stretch">
      {/* West cluster: 2 columns × 2 rows */}
      <div className="grid grid-cols-2 grid-rows-2 gap-2 flex-1">
        {WEST_LAYOUT.map(({ courtNumber, boardIndex }) => (
          <Tile key={courtNumber} courtNumber={courtNumber} boardIndex={boardIndex} />
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
          <Tile key={courtNumber} courtNumber={courtNumber} boardIndex={boardIndex} />
        ))}
      </div>
    </div>
  );
}
