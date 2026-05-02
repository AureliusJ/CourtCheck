import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/db/client';

const BUCKET = 'court-photos';
const BATCH_SIZE = 50;

function authOk(request: NextRequest): boolean {
  const auth = request.headers.get('Authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

function storagePath(photoUrl: string): string | null {
  // URL format: {supabaseUrl}/storage/v1/object/public/court-photos/{path}
  const marker = '/court-photos/';
  const idx = photoUrl.indexOf(marker);
  return idx === -1 ? null : photoUrl.slice(idx + marker.length);
}

export async function POST(request: NextRequest) {
  if (!authOk(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServerClient();
  let totalExpired = 0;

  // Process in batches to avoid timeouts on the free tier
  while (true) {
    const { data: rows, error } = await db
      .from('reports')
      .select('id, photo_url')
      .lt('photo_expires_at', new Date().toISOString())
      .not('photo_url', 'is', null)
      .eq('photo_status', 'approved')
      .limit(BATCH_SIZE);

    if (error) {
      console.error('[cron/expire-photos] Query error:', error);
      break;
    }
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const path = storagePath(row.photo_url as string);
      let storageSuccess = false;

      if (path) {
        const { error: delErr } = await db.storage.from(BUCKET).remove([path]);
        storageSuccess = !delErr;
        if (delErr) {
          console.error('[cron/expire-photos] Storage delete failed:', { reportId: row.id, path, error: delErr });
        }
      }

      const { error: updateErr } = await db
        .from('reports')
        .update({ photo_url: null, photo_status: 'expired' })
        .eq('id', row.id);

      console.log('[cron/expire-photos]', { reportId: row.id, path, storageSuccess, dbUpdated: !updateErr });
      if (!updateErr) totalExpired++;
    }

    if (rows.length < BATCH_SIZE) break;
  }

  return Response.json({ expired: totalExpired }, { status: 200 });
}
