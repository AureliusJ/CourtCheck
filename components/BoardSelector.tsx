'use client';

interface BoardOption {
  id: string;
  label: string;
}

const BOARDS: BoardOption[] = [
  { id: 'ramsden-a', label: 'A' },
  { id: 'ramsden-b', label: 'B' },
  { id: 'ramsden-c', label: 'C' },
];

const SELECTED_BG: Record<string, string> = {
  'ramsden-a': 'bg-brand-terracotta text-brand-cream',
  'ramsden-b': 'bg-brand-amber text-brand-cream',
  'ramsden-c': 'bg-brand-sage text-brand-cream',
};

interface BoardSelectorProps {
  selected: string;
  onChange: (boardId: string) => void;
}

export function BoardSelector({ selected, onChange }: BoardSelectorProps) {
  return (
    <div className="flex gap-3">
      {BOARDS.map((board) => {
        const isSelected = board.id === selected;
        return (
          <button
            key={board.id}
            onClick={() => onChange(board.id)}
            className={`w-16 h-12 rounded-full font-sans font-semibold text-[15px] transition-colors ${
              isSelected
                ? (SELECTED_BG[board.id] ?? 'bg-brand-text text-brand-cream')
                : 'border border-brand-text/20 text-brand-text hover:border-brand-text/40'
            }`}
            aria-pressed={isSelected}
            aria-label={`Board ${board.label}`}
          >
            {board.label}
          </button>
        );
      })}
    </div>
  );
}
