'use client';

const DAYS = [
  { label: 'Mo', value: 'monday' },
  { label: 'Tu', value: 'tuesday' },
  { label: 'We', value: 'wednesday' },
  { label: 'Th', value: 'thursday' },
  { label: 'Fr', value: 'friday' },
  { label: 'Sa', value: 'saturday' },
  { label: 'Su', value: 'sunday' },
] as const;

export type DayValue = (typeof DAYS)[number]['value'];

// Returns current day name in America/Toronto timezone (0=Sun offset to monday-first)
export function getTodayInToronto(): DayValue {
  const dayName = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
  })
    .format(new Date())
    .toLowerCase() as DayValue;
  return dayName;
}

interface DaySelectorProps {
  selected: DayValue;
  onChange: (day: DayValue) => void;
}

export function DaySelector({ selected, onChange }: DaySelectorProps) {
  return (
    <div className="flex justify-between">
      {DAYS.map((day) => {
        const isSelected = day.value === selected;
        return (
          <button
            key={day.value}
            onClick={() => onChange(day.value)}
            className={`w-10 h-10 rounded-full font-sans text-[13px] font-medium transition-colors ${
              isSelected
                ? 'bg-brand-text text-brand-cream'
                : 'text-brand-muted hover:text-brand-text'
            }`}
            aria-pressed={isSelected}
            aria-label={day.value}
          >
            {day.label}
          </button>
        );
      })}
    </div>
  );
}
