'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface HourlyEntry {
  hour: number;
  avgQueue: number;
  sampleSize: number;
}

interface BusyTimesChartProps {
  hourly: HourlyEntry[];
  sunriseHour: number;
  sunsetHour: number;
  boardId: string;
  totalSampleSize: number;
}

// Board → bar color
const BAR_COLOR: Record<string, string> = {
  'ramsden-a': '#BC5F48',
  'ramsden-b': '#D49A4C',
  'ramsden-c': '#7C8B70',
};

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

export function BusyTimesChart({
  hourly,
  sunriseHour,
  sunsetHour,
  boardId,
  totalSampleSize,
}: BusyTimesChartProps) {
  const barColor = BAR_COLOR[boardId] ?? '#A8A49C';

  // Clip data to daylight window
  const data = hourly
    .filter((d) => d.hour >= sunriseHour && d.hour <= sunsetHour)
    .map((d) => ({ ...d, label: formatHour(d.hour) }));

  if (data.length === 0) {
    return (
      <div className="mt-4">
        <p className="font-sans text-[10px] font-bold tracking-[0.15em] text-brand-muted uppercase text-right mb-4">
          Queue Size
        </p>
        <div className="py-12 text-center">
          <h3 className="font-serif text-2xl font-semibold text-brand-text">No data yet</h3>
          <p className="mt-2 font-sans text-[13px] text-brand-muted">
            Reports will appear here after the first week of use.
          </p>
        </div>
        <p className="mt-4 font-sans text-[12px] text-brand-muted text-center">
          No reports yet — be the first to update!
        </p>
      </div>
    );
  }

  const maxQueue = Math.max(...data.map((d) => d.avgQueue), 1);

  return (
    <div className="mt-4">
      <p className="font-sans text-[10px] font-bold tracking-[0.15em] text-brand-muted uppercase text-right mb-3">
        Queue Size
      </p>

      <ResponsiveContainer width="100%" height={data.length * 56}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 0, bottom: 0, left: 40 }}
          barSize={20}
        >
          <XAxis type="number" domain={[0, maxQueue]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={40}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#7A766F', fontFamily: 'Inter, sans-serif' }}
          />
          {/* Background track — full-width gray bar behind each data bar */}
          <Bar
            dataKey={() => maxQueue}
            fill="#D8D4CC"
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          />
          {/* Data bar */}
          <Bar
            dataKey="avgQueue"
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={barColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Sunrise / Sunset labels */}
      <div className="flex justify-between mt-2 px-10">
        <span className="font-sans text-[11px] font-bold tracking-[0.12em] text-brand-muted uppercase">
          Sunrise
        </span>
        <span className="font-sans text-[11px] font-bold tracking-[0.12em] text-brand-muted uppercase">
          Sunset
        </span>
      </div>

      {/* Sample size note */}
      <p className="mt-4 font-sans text-[12px] text-brand-muted text-center leading-relaxed">
        Based on {totalSampleSize} report{totalSampleSize !== 1 ? 's' : ''} over the last 7 days.
        <br />
        Courts unlit — daylight hours only.
      </p>
    </div>
  );
}
