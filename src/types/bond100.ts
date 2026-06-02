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

/** A single published record: one player at bond 100 with one student. */
export interface Bond100Entry {
  id: string;
  studentId: number;
  serverRegion: Bond100ServerRegion;
  playerName: string;
}

export interface Bond100StudentEntriesResponse {
  studentId: number;
  entries: Bond100Entry[];
  isMock?: boolean;
}

/**
 * Create request — a player asking to be added to the wall.
 * Friend code / UID / proof are collected for moderator review only and are
 * never published; the public record shows name + server only.
 */
export interface Bond100SubmissionPayload {
  studentId: number;
  serverRegion: Bond100ServerRegion;
  playerName: string;
  /** Required: hashed server-side into the cross-source dedup identity. Never published. */
  friendCode: string;
  contactHandle?: string;
  proofUrl?: string;
}

/** Delete request — asking to remove a published entry, with a reason. */
export interface Bond100RemovalPayload {
  entryId: string;
  studentId: number;
  reason: string;
  contactHandle?: string;
}
