'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import SunCalc from 'suncalc';
import { toast } from 'sonner';
import { Camera } from 'lucide-react';
import { useCurrentPark } from '@/hooks/useCurrentPark';
import { useSubmitReport } from '@/hooks/useSubmitReport';
import { BoardPicker } from '@/components/BoardPicker';
import { QueueStepper } from '@/components/QueueStepper';
import { ConditionToggle } from '@/components/ConditionToggle';
import { AfterSunsetModal } from '@/components/AfterSunsetModal';
import type { CourtCondition } from '@/lib/api/types';

const LAT = 43.6772;
const LON = -79.3919;

const BOARD_CONFIG: Record<
  string,
  { label: string; firstCourt: number; color: string; colorDark: string }
> = {
  'ramsden-a': { label: 'Board A', firstCourt: 1, color: '#BC5F48', colorDark: '#A64F3A' },
  'ramsden-b': { label: 'Board B', firstCourt: 3, color: '#D49A4C', colorDark: '#C4893C' },
  'ramsden-c': { label: 'Board C', firstCourt: 5, color: '#7C8B70', colorDark: '#6A795F' },
};

const VALID_BOARDS = new Set(Object.keys(BOARD_CONFIG));

function clientIsAfterSunset(): boolean {
  return new Date() > SunCalc.getTimes(new Date(), LAT, LON).sunset;
}

function getSunsetTimeString(): string {
  const times = SunCalc.getTimes(new Date(), LAT, LON);
  return times.sunset.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface UpdateFormProps {
  boardId: string;
  onBack: () => void;
  backIsHome: boolean;
}

function UpdateForm({ boardId, onBack, backIsHome }: UpdateFormProps) {
  const router = useRouter();
  const { data } = useCurrentPark();
  const { mutate, isPending, error, isAfterSunsetConflict, retryAfter, resetSunsetConflict } =
    useSubmitReport();

  const config = BOARD_CONFIG[boardId];
  const boardData = data?.boards.find((b) => b.id === boardId);

  const synced = useRef(false);
  const [queueCount, setQueueCount] = useState(0);
  const [courtCondition, setCourtCondition] = useState<CourtCondition>('unknown');
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync defaults from live data once it arrives
  useEffect(() => {
    if (!synced.current && boardData) {
      synced.current = true;
      setQueueCount(boardData.current.queueCount ?? 0);
      setCourtCondition(boardData.current.courtCondition ?? 'unknown');
    }
  }, [boardData]);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => router.push('/'), 2000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, router]);

  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 px-6 text-center">
        <h1 className="font-serif text-3xl text-brand-text">Thanks for updating!</h1>
        <p className="text-sm text-brand-text/70 leading-relaxed">
          {config.label} updated. Your report helps everyone at Ramsden.
        </p>
      </div>
    );
  }

  const handleSubmit = (afterSunsetConfirmed?: boolean) => {
    mutate(
      { boardId, queueCount, courtCondition, afterSunsetConfirmed },
      { onSuccess: () => setShowSuccess(true) },
    );
  };

  return (
    <>
      <div className="flex flex-col gap-8 px-5 py-6">
        {/* Back */}
        {backIsHome ? (
          <Link href="/" className="text-sm text-brand-gray self-start">
            &larr; Back
          </Link>
        ) : (
          <button onClick={onBack} className="text-sm text-brand-gray self-start">
            &larr; Back
          </button>
        )}

        {/* Header */}
        <div>
          <p className="text-xs uppercase tracking-widest text-brand-gray font-medium mb-1">
            Ramsden Park
          </p>
          <h1 className="font-serif text-2xl text-brand-text">
            Update {config.label}
          </h1>
        </div>

        {/* Queue stepper */}
        <QueueStepper
          value={queueCount}
          onChange={setQueueCount}
          brandColor={config.color}
          brandColorDark={config.colorDark}
        />

        {/* Condition toggle */}
        <ConditionToggle value={courtCondition} onChange={setCourtCondition} />

        {/* Photo placeholder */}
        <button
          onClick={() => toast('Photo upload coming soon')}
          className="w-full rounded-card border-2 border-dashed border-brand-gray/40 flex flex-col items-center justify-center gap-2 py-8 text-brand-gray"
        >
          <Camera size={24} />
          <span className="text-sm">Add a photo (optional)</span>
        </button>

        {/* Submit */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleSubmit()}
            disabled={isPending}
            className="w-full py-4 rounded-full bg-brand-text text-[#F8F6F1] text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isPending && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Submit update +
          </button>

          {retryAfter !== undefined && (
            <p className="text-xs text-brand-gray text-center">
              You just updated — please wait {retryAfter} seconds
            </p>
          )}
          {error && <p className="text-xs text-brand-gray text-center">{error}</p>}
        </div>
      </div>

      {isAfterSunsetConflict && (
        <AfterSunsetModal
          sunsetTime={getSunsetTimeString()}
          onConfirm={() => {
            resetSunsetConflict();
            handleSubmit(true);
          }}
          onCancel={resetSunsetConflict}
        />
      )}
    </>
  );
}

function UpdatePageContent() {
  const searchParams = useSearchParams();
  const rawBoard = searchParams.get('board');
  const preselectedBoard = rawBoard && VALID_BOARDS.has(rawBoard) ? rawBoard : null;

  const [selectedBoard, setSelectedBoard] = useState<string | null>(preselectedBoard);
  const { data } = useCurrentPark();
  const isAfterSunset = clientIsAfterSunset();

  if (!selectedBoard) {
    return (
      <div className="flex flex-col gap-6 px-5 py-6">
        <Link href="/" className="text-sm text-brand-gray self-start">
          &larr; Back
        </Link>
        <BoardPicker
          boards={data?.boards ?? []}
          isAfterSunset={isAfterSunset}
          onBoardSelect={setSelectedBoard}
        />
      </div>
    );
  }

  return (
    <UpdateForm
      boardId={selectedBoard}
      onBack={() => setSelectedBoard(null)}
      backIsHome={preselectedBoard !== null}
    />
  );
}

export default function UpdatePage() {
  return (
    <main className="min-h-screen max-w-sm mx-auto bg-brand-bg">
      <Suspense fallback={<div className="p-6 text-brand-gray text-sm">Loading…</div>}>
        <UpdatePageContent />
      </Suspense>
    </main>
  );
}
