import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/db/client';
import { hashDevice, hashIp } from '@/lib/hashing';
import { checkRateLimit } from '@/lib/ratelimit';
import { getSunWindow } from '@/lib/sun';
import type { CourtCondition } from '@/lib/api/types';

const LAT = 43.6772;
const LON = -79.3919;

const VALID_BOARD_IDS = new Set(['ramsden-a', 'ramsden-b', 'ramsden-c']);
const VALID_CONDITIONS = new Set<CourtCondition>(['dry', 'wet', 'unknown']);
const QUEUE_MIN = 0;
const QUEUE_MAX = 15;

export async function POST(request: NextRequest) {
  // ── 1. Parse and validate body ──────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Invalid JSON body' } },
      { status: 400 },
    );
  }

  const { boardId, queueCount, courtCondition, afterSunsetConfirmed } =
    body as Record<string, unknown>;

  if (typeof boardId !== 'string' || !VALID_BOARD_IDS.has(boardId)) {
    return Response.json(
      { error: { code: 'validation_failed', message: `boardId must be one of: ${[...VALID_BOARD_IDS].join(', ')}` } },
      { status: 400 },
    );
  }
  if (
    typeof queueCount !== 'number' ||
    !Number.isInteger(queueCount) ||
    queueCount < QUEUE_MIN ||
    queueCount > QUEUE_MAX
  ) {
    return Response.json(
      { error: { code: 'validation_failed', message: `queueCount must be an integer between ${QUEUE_MIN} and ${QUEUE_MAX}` } },
      { status: 400 },
    );
  }
  if (typeof courtCondition !== 'string' || !VALID_CONDITIONS.has(courtCondition as CourtCondition)) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'courtCondition must be one of: dry, wet, unknown' } },
      { status: 400 },
    );
  }

  // ── 2. Extract device token (generate random fallback if missing) ────────
  const rawDevice =
    request.headers.get('X-Device-Hash') ??
    Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  // ── 3. Extract IP ────────────────────────────────────────────────────────
  const rawIp =
    request.headers.get('X-Forwarded-For')?.split(',')[0].trim() ??
    '0.0.0.0';

  // ── 4. Hash both ─────────────────────────────────────────────────────────
  const hashedDevice = hashDevice(rawDevice);
  const hashedIp = hashIp(rawIp);

  // ── 5. Rate limit ─────────────────────────────────────────────────────────
  const rl = await checkRateLimit(hashedDevice, hashedIp, boardId);
  if (!rl.allowed) {
    return Response.json(
      { error: { code: 'rate_limited', message: 'Too many requests' }, retryAfter: rl.retryAfter },
      { status: 429 },
    );
  }

  // ── 6. Server-side sunset check ───────────────────────────────────────────
  const sun = getSunWindow(LAT, LON);
  if (sun.isAfterSunset && afterSunsetConfirmed !== true) {
    return Response.json(
      { error: { code: 'after_sunset_unconfirmed', message: 'Courts are likely closed. Confirm to submit anyway.' } },
      { status: 409 },
    );
  }

  // ── 7. Fetch park_id from the board record ────────────────────────────────
  const db = createServerClient();
  const { data: board, error: boardError } = await db
    .from('boards')
    .select('park_id')
    .eq('id', boardId)
    .single();

  if (boardError || !board) {
    return Response.json(
      { error: { code: 'board_not_found', message: 'Board not found' } },
      { status: 404 },
    );
  }

  // ── 8. Insert report ──────────────────────────────────────────────────────
  const { data: report, error: insertError } = await db
    .from('reports')
    .insert({
      park_id: board.park_id,
      board_id: boardId,
      queue_count: queueCount,
      court_condition: courtCondition,
      photo_url: null,
      photo_status: 'none',
      photo_expires_at: null,
      device_hash: hashedDevice,
      ip_hash: hashedIp,
    })
    .select('id')
    .single();

  if (insertError || !report) {
    console.error('[POST /api/reports] Insert failed:', insertError);
    return Response.json(
      { error: { code: 'insert_failed', message: 'Failed to save report' } },
      { status: 500 },
    );
  }

  // ── 9. Return 201 ──────────────────────────────────────────────────────────
  return Response.json(
    { reportId: report.id, photoStatus: 'none' },
    { status: 201 },
  );
}
