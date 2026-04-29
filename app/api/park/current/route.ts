import { createServerClient } from '@/lib/db/client';
import { getWeatherSnapshot } from '@/lib/weather';
import type {
  BoardCurrent,
  BoardSummary,
  CourtCondition,
  CurrentParkState,
  WeatherHint,
} from '@/lib/api/types';

const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const RECENT_WINDOW_MS = 30 * 60 * 1000;        // 30 minutes
const CONFIRMATION_TOLERANCE = 1;                // ±1 of displayed count

function computeWait(queueCount: number, courtsOnBoard: number) {
  if (queueCount === 0) {
    return { waitMinutes: 0, waitDisplayLow: 0, waitDisplayHigh: 0 };
  }
  const base = (queueCount / courtsOnBoard) * 30;
  return {
    waitMinutes: Math.round(base),
    waitDisplayLow: Math.round(base * 0.83),
    waitDisplayHigh: Math.round(base * 1.33),
  };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function GET() {
  const db = createServerClient();

  // Fetch the park (single row for v1)
  const { data: park, error: parkError } = await db
    .from('parks')
    .select('id, name, address, latitude, longitude, timezone, has_lights')
    .eq('id', 'ramsden')
    .single();

  if (parkError || !park) {
    return Response.json(
      { error: { code: 'park_not_found', message: 'Park not found' } },
      { status: 404 },
    );
  }

  // Fetch boards ordered by display_order
  const { data: boards, error: boardsError } = await db
    .from('boards')
    .select('id, label, courts_on_board, court_range_label, display_order')
    .eq('park_id', 'ramsden')
    .order('display_order');

  if (boardsError || !boards) {
    return Response.json(
      { error: { code: 'boards_not_found', message: 'Boards not found' } },
      { status: 500 },
    );
  }

  // Fetch all reports from the last 2 hours for the whole park (covers both
  // the recent 30-min window and the staleness check in one query)
  const twoHoursAgo = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString();
  const { data: reports } = await db
    .from('reports')
    .select('board_id, queue_count, court_condition, photo_url, photo_status, created_at')
    .eq('park_id', 'ramsden')
    .gte('created_at', twoHoursAgo)
    .order('created_at', { ascending: false });

  const recentCutoff = new Date(Date.now() - RECENT_WINDOW_MS);

  const boardSummaries: BoardSummary[] = boards.map((board) => {
    const boardReports = (reports ?? []).filter((r) => r.board_id === board.id);
    const recentReports = boardReports.filter(
      (r) => new Date(r.created_at) >= recentCutoff,
    );

    if (boardReports.length === 0) {
      // No reports at all in the last 2h
      const current: BoardCurrent = {
        queueCount: null,
        courtCondition: 'unknown',
        photoUrl: null,
        lastUpdatedAt: null,
        minutesAgo: null,
        isStale: false,
        confirmationCount: 0,
        waitMinutes: null,
        waitDisplayLow: null,
        waitDisplayHigh: null,
      };
      return {
        id: board.id,
        label: board.label,
        courtRangeLabel: board.court_range_label,
        courtsOnBoard: board.courts_on_board,
        displayOrder: board.display_order,
        current,
      };
    }

    const mostRecent = boardReports[0];
    const lastUpdatedAt = mostRecent.created_at;
    const minutesAgo = Math.floor(
      (Date.now() - new Date(lastUpdatedAt).getTime()) / 60_000,
    );
    const isStale = recentReports.length === 0;

    // Displayed count: median of recent reports (or most recent if stale)
    const countsToUse = isStale
      ? [mostRecent.queue_count]
      : recentReports.map((r) => r.queue_count);
    const queueCount = Math.round(median(countsToUse));

    // Condition: mode of recent reports, fallback to most recent
    const conditionSource = isStale ? [mostRecent] : recentReports;
    const conditionCounts: Record<string, number> = {};
    for (const r of conditionSource) {
      conditionCounts[r.court_condition] = (conditionCounts[r.court_condition] ?? 0) + 1;
    }
    const courtCondition = Object.entries(conditionCounts).sort(
      (a, b) => b[1] - a[1],
    )[0][0] as CourtCondition;

    // Confirmation count: recent reports within ±1 of displayed count
    const confirmationCount = recentReports.filter(
      (r) => Math.abs(r.queue_count - queueCount) <= CONFIRMATION_TOLERANCE,
    ).length;

    // Latest approved photo
    const latestPhoto = boardReports.find(
      (r) => r.photo_url && r.photo_status === 'approved',
    );
    const photoUrl = latestPhoto?.photo_url ?? null;

    const wait = computeWait(queueCount, board.courts_on_board);

    const current: BoardCurrent = {
      queueCount,
      courtCondition,
      photoUrl,
      lastUpdatedAt,
      minutesAgo,
      isStale,
      confirmationCount,
      ...wait,
    };

    return {
      id: board.id,
      label: board.label,
      courtRangeLabel: board.court_range_label,
      courtsOnBoard: board.courts_on_board,
      displayOrder: board.display_order,
      current,
    };
  });

  // Fetch weather hint when any board lacks fresh data.
  // Skip the call when all boards are live — avoids a pointless external request.
  const needsWeather = boardSummaries.some(
    (b) => b.current.isStale || b.current.queueCount === null,
  );
  let weatherHint: WeatherHint | null = null;
  if (needsWeather) {
    const snapshot = await getWeatherSnapshot(
      Number(park.latitude),
      Number(park.longitude),
    );
    if (snapshot) {
      weatherHint = {
        currentlyRaining: snapshot.currentlyRaining,
        lastRainMinutesAgo: snapshot.lastRainMinutesAgo,
        summary: snapshot.summary,
      };
    }
  }

  const response: CurrentParkState = {
    park: {
      id: park.id,
      name: park.name,
      timezone: park.timezone,
      latitude: Number(park.latitude),
      longitude: Number(park.longitude),
      hasLights: park.has_lights,
    },
    boards: boardSummaries,
    weatherHint,
  };

  return Response.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
