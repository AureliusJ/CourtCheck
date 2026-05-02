import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/db/client';

function authOk(request: NextRequest): boolean {
  const auth = request.headers.get('Authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

const BOARD_IDS = ['ramsden-a', 'ramsden-b', 'ramsden-c'];

export async function POST(request: NextRequest) {
  if (!authOk(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServerClient();

  // Call the Postgres RPC function that uses EXTRACT ... AT TIME ZONE,
  // which cannot be expressed in the Supabase JS query builder.
  // SQL to create: see docs/sql/aggregate_busy_times.sql
  const { data: rows, error } = await db.rpc('aggregate_busy_times');

  if (error) {
    console.error('[cron/aggregate-busy-times] RPC error:', error);
    return Response.json({ error: 'Aggregation failed' }, { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return Response.json({ aggregated: 0 }, { status: 200 });
  }

  // Filter to known boards only, then upsert
  const upsertRows = (rows as Array<{
    board_id: string;
    day_of_week: number;
    hour_of_day: number;
    avg_queue: number;
    sample_size: number;
  }>)
    .filter((r) => BOARD_IDS.includes(r.board_id))
    .map((r) => ({
      board_id: r.board_id,
      day_of_week: r.day_of_week,
      hour_of_day: r.hour_of_day,
      avg_queue: r.avg_queue,
      sample_size: r.sample_size,
      computed_at: new Date().toISOString(),
    }));

  const { error: upsertError } = await db
    .from('busy_times_hourly')
    .upsert(upsertRows, { onConflict: 'board_id,day_of_week,hour_of_day' });

  if (upsertError) {
    console.error('[cron/aggregate-busy-times] Upsert error:', upsertError);
    return Response.json({ error: 'Upsert failed' }, { status: 500 });
  }

  return Response.json({ aggregated: upsertRows.length }, { status: 200 });
}
