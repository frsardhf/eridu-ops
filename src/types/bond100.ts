export type Bond100ServerRegion =
  | 'global_na'
  | 'global_asia'
  | 'global_eu'
  | 'global_kr'
  | 'global_tw';

export type Bond100ServerFilter = Bond100ServerRegion | 'all';
export type Bond100SortMode = 'default' | 'name' | 'bond100';

export interface Bond100ServerOption {
  code: Bond100ServerRegion;
  labelKey: string;
  shortLabel: string;
}

/**
 * One student's bond-100 player count, broken down by server.
 * A single merged count — community submissions and the public ranking
 * snapshot are pooled into one number (no verified/observed split).
 */
export interface Bond100StudentSummary {
  studentId: number;
  count: number;
  byServer: Partial<Record<Bond100ServerRegion, number>>;
}

export interface Bond100SummaryResponse {
  snapshotDate?: string;
  total: number;
  students: Bond100StudentSummary[];
  isMock?: boolean;
}

/** A single listed player at bond 100 for a student (display only). */
export interface Bond100Entry {
  serverRegion: Bond100ServerRegion;
  playerName: string;
}

export interface Bond100StudentEntriesResponse {
  studentId: number;
  entries: Bond100Entry[];
  isMock?: boolean;
}

/**
 * "Add me" request. Bridge model: only server + friend code. The backend
 * triggers an arona /refresh for that account (rate-limited); the player shows
 * up in the next sync. The friend code is never stored (only a salted hash for
 * rate limiting). Removal is handled on arona's side (the modal links out).
 */
export interface Bond100SubmissionPayload {
  serverRegion: Bond100ServerRegion;
  friendCode: string;
}
