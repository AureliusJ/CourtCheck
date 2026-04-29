'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useBusyTimes(boardId: string, day: string) {
  return useQuery({
    queryKey: ['busy-times', boardId, day],
    queryFn: () => api.getBusyTimes(boardId, day),
    staleTime: 60 * 60 * 1000, // 1 hour — matches the API cache TTL
    refetchOnWindowFocus: false,
  });
}
