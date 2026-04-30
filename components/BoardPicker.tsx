'use client';

import Link from 'next/link';
import { CourtMap } from './CourtMap';
import type { BoardSummary } from '@/lib/api/types';

const LEGEND = [
  { color: 'bg-brand-sage', label: 'No wait' },
  { color: 'bg-brand-amber', label: 'Moderate' },
  { color: 'bg-brand-terracotta', label: 'Long wait' },
  { color: 'bg-[#A8A49C]', label: 'Stale' },
];

interface Props {
  boards: BoardSummary[];
  isAfterSunset: boolean;
  onBoardSelect: (boardId: string) => void;
}

export function BoardPicker({ boards, isAfterSunset, onBoardSelect }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-brand-gray font-medium mb-1">
          Select a board
        </p>
        <h1 className="font-serif text-2xl text-brand-text">Which courts are you at?</h1>
      </div>

      <CourtMap boards={boards} isAfterSunset={isAfterSunset} onBoardSelect={onBoardSelect} />

      <div className="flex gap-4 flex-wrap">
        {LEGEND.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${color}`} />
            <span className="text-xs text-brand-gray">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
