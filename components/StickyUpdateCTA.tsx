'use client';

import Link from 'next/link';

interface StickyUpdateCTAProps {
  isAfterSunset?: boolean;
}

export function StickyUpdateCTA({ isAfterSunset = false }: StickyUpdateCTAProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex flex-col items-center pt-6 px-4"
      style={{
        background: isAfterSunset
          ? 'linear-gradient(to top, #1a1530 55%, transparent)'
          : 'linear-gradient(to top, #EAE5DB 55%, transparent)',
      }}
    >
      <Link
        href="/update"
        className={`w-full max-w-sm font-sans font-medium text-[15px] rounded-full py-4 text-center hover:opacity-90 active:opacity-75 transition-opacity shadow-modal ${
          isAfterSunset
            ? 'bg-brand-cream text-brand-text'
            : 'bg-brand-text text-brand-cream'
        }`}
      >
        I&apos;m at the court — update{' '}
        <span className="font-light">+</span>
      </Link>
      <Link
        href="/busy-times"
        className={`mt-3 mb-4 text-[13px] font-sans underline underline-offset-2 transition-colors ${
          isAfterSunset
            ? 'text-brand-cream/50 hover:text-brand-cream'
            : 'text-brand-muted hover:text-brand-text'
        }`}
      >
        View busy times
      </Link>
    </div>
  );
}
