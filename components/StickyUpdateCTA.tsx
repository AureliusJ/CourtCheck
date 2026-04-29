'use client';

import Link from 'next/link';

export function StickyUpdateCTA() {
  return (
    <div className="fixed bottom-0 left-0 right-0 flex flex-col items-center pb-safe-area-inset-bottom bg-gradient-to-t from-brand-bg via-brand-bg/90 to-transparent pt-6 px-4">
      <Link
        href="/update"
        className="w-full max-w-sm bg-brand-text text-brand-cream font-sans font-medium text-[15px] rounded-full py-4 text-center hover:opacity-90 active:opacity-75 transition-opacity shadow-modal"
      >
        I&apos;m at the court — update{' '}
        <span className="font-light">+</span>
      </Link>
      <Link
        href="/busy-times"
        className="mt-3 mb-4 text-brand-muted text-[13px] font-sans underline underline-offset-2 hover:text-brand-text transition-colors"
      >
        View busy times
      </Link>
    </div>
  );
}
