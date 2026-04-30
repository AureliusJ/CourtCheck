'use client';

import { Moon } from 'lucide-react';

interface Props {
  sunsetTime: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AfterSunsetModal({ sunsetTime, onConfirm, onCancel }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(34,34,32,0.6)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-[24px] p-6 flex flex-col items-center gap-4"
        style={{
          backgroundColor: '#F8F6F1',
          boxShadow: '0 20px 60px rgba(34,34,32,0.15)',
          animation: 'slideUp 200ms ease-out both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Moon size={36} className="text-brand-amber" />
        <h2 className="font-serif text-2xl text-brand-text text-center">Courts likely closed</h2>
        <p className="text-sm text-brand-text/70 text-center leading-relaxed">
          Sunset was at {sunsetTime}. The courts are unlit.{' '}
          Are you sure you want to submit an update?
        </p>
        <div className="flex flex-col gap-3 w-full mt-2">
          <button
            onClick={onConfirm}
            className="w-full py-3 rounded-full bg-brand-text text-[#F8F6F1] text-sm font-medium"
          >
            Yes, update anyway
          </button>
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-full border border-brand-text text-brand-text text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
