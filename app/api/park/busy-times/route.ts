import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/db/client';
import { getSunWindow } from '@/lib/sun';
import type { BusyTimesResponse } from '@/lib/api/types';

const LAT = 43.6772;
const LON = -79.3919;
const TZ = 'America/Toronto';

const VALID_BOARD_IDS = new Set(['ramsden-a', 'ramsden-b', 'ramsden-c']);

const DAY_NAME_TO_DOW: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

// Aggregate raw reports by hour in JS.
// We can't express EXTRACT(DOW AT TIME ZONE ...) through the Supabase JS
// query builder, so we fetch recent rows and group client-side. The 7-day
// window keeps the row count small (hundreds, not millions).
function aggregateByHour(
  reports: { queue_count: number; created_at: string }[],
  dow: number,
): Array<{ hour: number; avgQueue: number; sampleSize: number }> {
  const buckets: Map<number, { sum: number; count: number }> = new Map();

  for (const r of reports) {
    const d = new Date(r.created_at);
    const localDow = Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: TZ, weekday: 'narrow' })
        .formatToParts(d)
        .find((p) => p.type === 'weekday')?.value
        ? new Intl.DateTimeFormat('en-CA', { timeZone: TZ })
            .formatToParts(d)
            .find((p) => p.type === 'weekday')?.value
        : '-1',
    );
    // Use Intl to get the local day-of-week as a number (0=Sun)
    const localDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);
    const [year, month, day] = localDateStr.split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    const reportDow = localDate.getDay(); // 0=Sun in local date

    if (reportDow !== dow) continue;

    const hour = Number(
      new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hour: 'numeric', hour12: false })
        .format(d),
    );
    const existing = buckets.get(hour) ?? { sum: 0, count: 0 };
    buckets.set(hour, { sum: existing.sum + r.queue_count, count: existing.count + 1 });
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, { sum, count }]) => ({
      hour,
      avgQueue: Math.round((sum / count) * 10) / 10,
      sampleSize: count,
    }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const boardId = searchParams.get('boardId') ?? '';
  const day = (searchParams.get('day') ?? '').toLowerCase();

  if (!VALID_BOARD_IDS.has(boardId)) {
    return Response.json(
      { error: { code: 'validation_failed', message: `boardId must be one of: ${[...VALID_BOARD_IDS].join(', ')}` } },
      { status: 400 },
    );
  }
  if (!(day in DAY_NAME_TO_DOW)) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'day must be one of: monday, tuesday, wednesday, thursday, friday, saturday, sunday' } },
      { status: 400 },
    );
  }

  const dow = DAY_NAME_TO_DOW[day];
  const db = createServerClient();

  // Try the pre-aggregated table first (populated nightly by cron)
  const { data: cached } = await db
    .from('busy_times_hourly')
    .select('hour_of_day, avg_queue, sample_size, computed_at')
    .eq('board_id', boardId)
    .eq('day_of_week', dow)
    .order('hour_of_day');

  let hourly: BusyTimesResponse['hourly'];
  let computedAt: string;

  if (cached && cached.length > 0) {
    hourly = cached.map((r) => ({
      hour: r.hour_of_day,
      avgQueue: Number(r.avg_queue),
      sampleSize: r.sample_size,
    }));
    computedAt = cached[0].computed_at;
  } else {
    // Fallback: aggregate raw reports from the last 7 days in JavaScript
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: reports } = await db
      .from('reports')
      .select('queue_count, created_at')
      .eq('board_id', boardId)
      .gte('created_at', sevenDaysAgo);

    hourly = aggregateByHour(reports ?? [], dow);
    computedAt = new Date().toISOString();
  }

  // Compute today's sunrise/sunset hours for the x-axis clip
  const sun = getSunWindow(LAT, LON);
  const sunriseHour = sun.sunrise.getHours();
  const sunsetHour = sun.sunset.getHours();

  const response: BusyTimesResponse = {
    boardId,
    day,
    hourly,
    sunriseHour,
    sunsetHour,
    computedAt,
  };

  return Response.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  });
}
