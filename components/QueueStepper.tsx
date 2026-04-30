'use client';

interface Props {
  value: number;
  onChange: (value: number) => void;
  brandColor: string;
  brandColorDark: string;
  min?: number;
  max?: number;
}

export function QueueStepper({
  value,
  onChange,
  brandColor,
  brandColorDark,
  min = 0,
  max = 15,
}: Props) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className="flex items-center justify-center gap-8">
      <button
        onClick={decrement}
        disabled={value <= min}
        aria-label="Decrease queue count"
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-opacity disabled:opacity-30"
        style={{ border: `2px solid ${brandColor}`, color: brandColor }}
      >
        −
      </button>

      <div className="flex flex-col items-center gap-1 w-20">
        <span className="font-serif text-6xl text-brand-text leading-none">{value}</span>
        <span className="text-xs text-brand-gray uppercase tracking-widest">
          rackets in queue
        </span>
      </div>

      <button
        onClick={increment}
        disabled={value >= max}
        aria-label="Increase queue count"
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white transition-opacity disabled:opacity-30"
        style={{ backgroundColor: brandColor }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = brandColorDark)}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = brandColor)}
      >
        +
      </button>
    </div>
  );
}
