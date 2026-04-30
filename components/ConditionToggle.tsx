'use client';

import type { CourtCondition } from '@/lib/api/types';

const OPTIONS: { value: CourtCondition; label: string }[] = [
  { value: 'dry', label: 'Dry' },
  { value: 'wet', label: 'Wet' },
  { value: 'unknown', label: 'Unknown' },
];

interface Props {
  value: CourtCondition;
  onChange: (value: CourtCondition) => void;
}

export function ConditionToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={[
              'flex-1 py-2.5 px-3 rounded-full text-sm font-medium transition-colors',
              selected
                ? 'bg-brand-text text-[#F8F6F1]'
                : 'border border-brand-text text-brand-text bg-transparent',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
