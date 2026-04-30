'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api/client';

export function useCurrentPark() {
  const pathname = usePathname();
  const isOnUpdatePage = pathname?.startsWith('/update');

  return useQuery({
    queryKey: ['current-park'],
    queryFn: () => api.getCurrent(),
    staleTime: 30_000,
    refetchInterval: isOnUpdatePage ? false : 60_000,
    refetchOnWindowFocus: true,
  });
}
