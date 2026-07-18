export type Bond100ServerRegion =
  'global_na' | 'global_asia' | 'global_eu' | 'global_kr' | 'global_tw';

export type Bond100ServerFilter = Bond100ServerRegion | 'all';
/** School filter: a raw SchaleDB School value, or 'all' for no filter. */
export type Bond100SchoolFilter = string;
export type Bond100SortMode = 'default' | 'name' | 'bond100' | 'recent';
/** /hall view: the per-student wall grid, or the player-centric leaderboard. */
export type Bond100View = 'wall' | 'players';

export interface Bond100ServerOption {
  code: Bond100ServerRegion;
  labelKey: string;
  shortLabel: string;
}

/**
 * One student's bond-100 player count, broken down by server.
 * A single merged count: community submissions and the public ranking
 * snapshot are pooled into one number (no verified/observed split).
 */
export interface Bond100StudentSummary {
  studentId: number;
  count: number;
  byServer: Partial<Record<Bond100ServerRegion, number>>;
  /** When this student's bond-100 data was last fetched (YYYY-MM-DD). The
   * rolling /rank sweep refreshes students independently, so freshness is
   * per-student rather than one wall-wide snapshot. */
  fetchedAt?: string;
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
  /** When this student's entries were last fetched (YYYY-MM-DD). */
  fetchedAt?: string;
  entries: Bond100Entry[];
  isMock?: boolean;
}

/**
 * One player on the /players leaderboard: the player-centric inversion of the
 * wall. studentIds are the (primary, deduped) students this player has at
 * bond 100. arona exposes no stable player id, so identity is (serverRegion,
 * playerName); same-name players on one server merge (accepted rarity).
 */
export interface Bond100Player {
  playerName: string;
  serverRegion: Bond100ServerRegion;
  count: number;
  studentIds: number[];
}

export interface Bond100PlayersResponse {
  snapshotDate?: string;
  players: Bond100Player[];
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
