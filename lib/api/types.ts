export type CourtCondition = 'dry' | 'wet' | 'unknown';
export type PhotoStatus = 'none' | 'pending' | 'approved' | 'rejected' | 'expired';

export const QUEUE_MIN = 0;
export const QUEUE_MAX = 15;

export interface Park {
  id: string;
  name: string;
  timezone: string;
  latitude: number;
  longitude: number;
  hasLights: boolean;
}

export interface BoardCurrent {
  queueCount: number | null;
  courtCondition: CourtCondition;
  photoUrl: string | null;
  lastUpdatedAt: string | null;
  minutesAgo: number | null;
  isStale: boolean;
  confirmationCount: number;
  waitMinutes: number | null;
  waitDisplayLow: number | null;
  waitDisplayHigh: number | null;
}

export interface BoardSummary {
  id: string;
  label: string;
  courtRangeLabel: string;
  courtsOnBoard: number;
  displayOrder: number;
  current: BoardCurrent;
}

export interface WeatherHint {
  lastRainMinutesAgo: number | null;
  currentlyRaining: boolean;
  summary: string;
}

export interface CurrentParkState {
  park: Park;
  boards: BoardSummary[];
  weatherHint: WeatherHint | null;
}

export interface SubmitReportInput {
  boardId: string;
  queueCount: number;
  courtCondition: CourtCondition;
  photo?: string;
  afterSunsetConfirmed?: boolean;
}

export interface BusyTimesResponse {
  boardId: string;
  day: string;
  hourly: Array<{ hour: number; avgQueue: number; sampleSize: number }>;
  computedAt: string;
}
