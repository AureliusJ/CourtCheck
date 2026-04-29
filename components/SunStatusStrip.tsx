'use client';

import { useEffect, useState } from 'react';
import { CircleAlert, Sunrise } from 'lucide-react';
import { getSunWindow } from '@/lib/sun';
import type { SunWindow } from '@/lib/sun';

const LAT = 43.6772;
const LON = -79.3919;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Toronto',
  });
}

interface SunStatusStripProps {
  onHueStateChange?: (state: SunWindow['hueState']) => void;
}

export function SunStatusStrip({ onHueStateChange }: SunStatusStripProps) {
  const [sunWindow, setSunWindow] = useState<SunWindow | null>(null);

  useEffect(() => {
    function update() {
      const sw = getSunWindow(LAT, LON);
      setSunWindow(sw);
      onHueStateChange?.(sw.hueState);
    }
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [onHueStateChange]);

  if (!sunWindow) return null;

  const { sunrise, sunset, isAfterSunset, minutesUntilSunset, hueState } = sunWindow;

  if (isAfterSunset) {
    return (
      <div className="inline-flex items-center gap-2 bg-brand-text/50 rounded-full px-4 py-2 text-sm font-sans text-brand-cream">
        <CircleAlert size={15} className="shrink-0 text-brand-amber" />
        <span>Courts likely closed — sunset was at {formatTime(sunset)}</span>
      </div>
    );
  }

  if (hueState === 'pre-sunset') {
    return (
      <div className="flex items-center gap-2 text-sm font-sans text-brand-amber">
        <Sunrise size={14} className="shrink-0" />
        <span>Sunset in {minutesUntilSunset} minutes · Courts are unlit after dark</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm font-sans text-brand-muted">
      <Sunrise size={14} className="shrink-0" />
      <span>Sunrise {formatTime(sunrise)} · Sunset {formatTime(sunset)}</span>
    </div>
  );
}
