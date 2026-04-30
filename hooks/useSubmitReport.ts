'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrCreateDeviceHash } from '@/lib/device';
import { api } from '@/lib/api/client';

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['current-park'] });
      const freshData = await queryClient.fetchQuery({
        queryKey: ['current-park', 'fresh'],
        queryFn: () => api.getCurrent(true),
        staleTime: 0,
      });
      queryClient.setQueryData(['current-park'], freshData);
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
