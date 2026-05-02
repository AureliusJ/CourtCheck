import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/db/client';
import { screenWithSafeSearch } from '@/lib/moderation/safesearch';
import { v4 as uuidv4 } from 'uuid';

const VALID_BOARD_IDS = new Set(['ramsden-a', 'ramsden-b', 'ramsden-c']);
const MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png']);
const BUCKET = 'court-photos';

export async function POST(request: NextRequest) {
  // ── 1. Parse multipart/form-data ────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: { code: 'invalid_request', message: 'Expected multipart/form-data' } },
      { status: 400 },
    );
  }

  const photoField = formData.get('photo');
  const boardId = formData.get('boardId');

  if (!(photoField instanceof File)) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Missing photo field' } },
      { status: 400 },
    );
  }

  if (typeof boardId !== 'string' || !VALID_BOARD_IDS.has(boardId)) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Invalid boardId' } },
      { status: 400 },
    );
  }

  // ── 2. Validate file type and size ───────────────────────────────────────────
  if (!ALLOWED_TYPES.has(photoField.type)) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Photo must be JPEG or PNG' } },
      { status: 400 },
    );
  }

  const bytes = await photoField.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) {
    return Response.json(
      { error: { code: 'validation_failed', message: 'Photo must be under 1 MB' } },
      { status: 400 },
    );
  }

  // ── 3. Upload to Supabase Storage ────────────────────────────────────────────
  const db = createServerClient();
  const path = `${boardId}/${uuidv4()}.jpg`;

  const { error: uploadError } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('[POST /api/photos/upload] Storage upload failed:', uploadError);
    return Response.json(
      { error: { code: 'upload_failed', message: 'Could not upload photo' } },
      { status: 500 },
    );
  }

  // ── 4. Get public URL ─────────────────────────────────────────────────────────
  const { data: urlData } = db.storage.from(BUCKET).getPublicUrl(path);
  const photoUrl = urlData.publicUrl;

  // ── 5. SafeSearch moderation ──────────────────────────────────────────────────
  const verdict = await screenWithSafeSearch(photoUrl);

  if (!verdict.approved) {
    // Delete from storage before returning the error
    await db.storage.from(BUCKET).remove([path]);
    return Response.json(
      { error: { code: 'photo_rejected', message: 'Photo did not pass content review' } },
      { status: 422 },
    );
  }

  // ── 6. Return approved URL and expiry ─────────────────────────────────────────
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return Response.json({ photoUrl, expiresAt }, { status: 200 });
}
