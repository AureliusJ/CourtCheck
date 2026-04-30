import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazy-initialise so the module can be imported without crashing
// in environments where the env vars aren't present (e.g. build time).
let _redis: Redis | null = null;
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

// 1 submission per device per board per 90 seconds
const perBoardDevice = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(1, '90 s'),
  prefix: 'report:device',
});

// 30 submissions per IP per hour (any board)
const perIpGlobal = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(30, '1 h'),
  prefix: 'report:ip',
});

export async function checkRateLimit(
  hashedDevice: string,
  hashedIp: string,
  boardId: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    // Key includes boardId so users can submit to different boards back-to-back
    const deviceKey = `${hashedDevice}:${boardId}`;
    const [deviceResult, ipResult] = await Promise.all([
      perBoardDevice.limit(deviceKey),
      perIpGlobal.limit(hashedIp),
    ]);

    if (!deviceResult.success) {
      const retryAfter = Math.ceil((deviceResult.reset - Date.now()) / 1000);
      return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
    }
    if (!ipResult.success) {
      const retryAfter = Math.ceil((ipResult.reset - Date.now()) / 1000);
      return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
    }

    return { allowed: true };
  } catch (err) {
    // Upstash unreachable — fail closed: better to block one write than
    // allow an unlimited flood through a degraded connection
    console.error('[ratelimit] Upstash error, failing closed:', err);
    return { allowed: false, retryAfter: 30 };
  }
}
