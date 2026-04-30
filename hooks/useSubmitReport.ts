'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrCreateDeviceHash } from '@/lib/device';
import type { CurrentParkState } from '@/lib/api/types';

interface SubmitReportInput {
  boardId: string;
  queueCount: number;
  courtCondition: 'dry' | 'wet' | 'unknown';
  afterSunsetConfirmed?: boolean;
}

interface SubmitReportResult {
  reportId: string;
  photoStatus: 'none';
}

export function useSubmitReport() {
  const queryClient = useQueryClient();
  const [isAfterSunsetConflict, setIsAfterSunsetConflict] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation<SubmitReportResult, Error, SubmitReportInput>({
    mutationFn: async (input) => {
      setIsAfterSunsetConflict(false);
      setRetryAfter(undefined);
      setError(null);

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Hash': getOrCreateDeviceHash(),
        },
        body: JSON.stringify(input),
      });

      if (res.status === 201) {
        return res.json() as Promise<SubmitReportResult>;
      }

      const body = await res.json().catch(() => ({})) as Record<string, unknown>;

      if (res.status === 409) {
        const code = (body.error as Record<string, unknown> | undefined)?.code;
        if (code === 'after_sunset_unconfirmed') {
          setIsAfterSunsetConflict(true);
          throw new Error('after_sunset_unconfirmed');
        }
      }

      if (res.status === 429) {
        const after = typeof body.retryAfter === 'number' ? body.retryAfter : undefined;
        setRetryAfter(after);
        throw new Error(`rate_limited:${after ?? ''}`);
      }

      throw new Error('request_failed');
    },
    onSuccess: (_result, input) => {
      // Patch the cache immediately so the home screen reflects the new values
      // without waiting for the CDN-cached GET to expire (s-maxage=30).
      queryClient.setQueryData<CurrentParkState>(['current-park'], (prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          boards: prev.boards.map((board) => {
            if (board.id !== input.boardId) return board;
            const { queueCount, courtCondition } = input;
            const base = queueCount === 0 ? 0 : (queueCount / board.courtsOnBoard) * 30;
            return {
              ...board,
              current: {
                ...board.current,
                queueCount,
                courtCondition,
                lastUpdatedAt: now,
                minutesAgo: 0,
                isStale: false,
                confirmationCount: 1,
                waitMinutes: Math.round(base),
                waitDisplayLow: Math.round(base * 0.83),
                waitDisplayHigh: Math.round(base * 1.33),
              },
            };
          }),
        };
      });
      // Background refetch to eventually sync with server truth
      queryClient.invalidateQueries({ queryKey: ['current-park'] });
    },
    onError: (err) => {
      if (err.message === 'after_sunset_unconfirmed') return;
      if (err.message.startsWith('rate_limited:')) return;
      setError('Something went wrong. Please try again.');
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    error,
    isAfterSunsetConflict,
    retryAfter,
    resetSunsetConflict: () => setIsAfterSunsetConflict(false),
  };
}
