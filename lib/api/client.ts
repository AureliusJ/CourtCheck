import type {
  BusyTimesResponse,
  CurrentParkState,
  SubmitReportInput,
} from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'unknown',
      body?.error?.message ?? res.statusText,
      body?.retryAfter,
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  getCurrent: (bust?: boolean) =>
    request<CurrentParkState>(
      `/api/park/current${bust ? `?t=${Date.now()}` : ''}`,
    ),

  submitReport: (input: SubmitReportInput) =>
    request<{ reportId: string; photoStatus: string }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  getBusyTimes: (boardId: string, day: string) =>
    request<BusyTimesResponse>(
      `/api/park/busy-times?boardId=${encodeURIComponent(boardId)}&day=${encodeURIComponent(day)}`,
    ),
};
