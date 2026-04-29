import type { WeatherSnapshot } from '@/lib/api/types';

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cache: { ts: number; data: WeatherSnapshot } | null = null;

interface OpenMeteoResponse {
  current: {
    precipitation: number;
    rain: number;
  };
  hourly: {
    time: string[];
    precipitation: number[];
  };
}

function buildSummary(snapshot: Omit<WeatherSnapshot, 'summary' | 'fetchedAt'>): string {
  if (snapshot.currentlyRaining) {
    return 'Currently raining — courts likely wet';
  }
  if (snapshot.lastRainMinutesAgo !== null) {
    if (snapshot.lastRainMinutesAgo <= 120) {
      return `Last rain ~${snapshot.lastRainMinutesAgo} min ago — possibly still wet`;
    }
    const hours = Math.round(snapshot.lastRainMinutesAgo / 60);
    return `Last rain ~${hours}h ago — likely dry by now`;
  }
  return '';
}

export async function getWeatherSnapshot(
  lat: number,
  lon: number,
): Promise<WeatherSnapshot | null> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) return cache.data;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=precipitation,rain` +
      `&hourly=precipitation` +
      `&past_hours=6&forecast_hours=0` +
      `&timezone=America%2FToronto`;

    const res = await fetch(url, { next: { revalidate: 900 } });
    if (!res.ok) return null;

    const json: OpenMeteoResponse = await res.json();

    const currentlyRaining = (json.current?.precipitation ?? 0) > 0;

    // Find the most recent hour with precipitation > 0
    let lastRainMinutesAgo: number | null = null;
    const now = Date.now();
    const times = json.hourly?.time ?? [];
    const precips = json.hourly?.precipitation ?? [];

    for (let i = times.length - 1; i >= 0; i--) {
      if ((precips[i] ?? 0) > 0) {
        const hourMs = new Date(times[i]).getTime();
        lastRainMinutesAgo = Math.round((now - hourMs) / 60_000);
        break;
      }
    }

    const partial = { currentlyRaining, lastRainMinutesAgo };
    const data: WeatherSnapshot = {
      ...partial,
      summary: buildSummary(partial),
      fetchedAt: new Date().toISOString(),
    };

    cache = { ts: Date.now(), data };
    return data;
  } catch {
    return null; // weather is non-critical — fail silently
  }
}
