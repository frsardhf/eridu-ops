import { getPrimaryStudentId } from '@/lib/constants/linkedStudents';
import type {
  Bond100RemovalPayload,
  Bond100ServerRegion,
  Bond100StudentEntriesResponse,
  Bond100StudentSummary,
  Bond100SubmissionPayload,
  Bond100SummaryResponse,
} from '@/types/bond100';

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  (import.meta.env.VITE_PARSER_URL as string | undefined) ||
  '/api';

const MOCK_SUMMARY: Bond100SummaryResponse = {
  snapshotDate: '2026-05-26',
  total: 71,
  isMock: true,
  students: [
    {
      studentId: 20039,
      count: 14,
      byServer: { global_na: 2, global_eu: 2, global_asia: 2, global_tw: 2, global_kr: 2 },
    },
    {
      studentId: 10098,
      count: 8,
      byServer: { global_asia: 5, global_kr: 3 },
    },
    {
      studentId: 10099,
      count: 5,
      byServer: { global_kr: 5 },
    },
    {
      studentId: 20040,
      count: 21,
      byServer: { global_na: 7, global_eu: 5, global_tw: 9 },
    },
    {
      studentId: 20041,
      count: 23,
      byServer: { global_na: 12, global_asia: 8, global_tw: 3 },
    },
  ],
};

const MOCK_ENTRIES: Record<number, Bond100StudentEntriesResponse> = {
  20039: {
    studentId: 20039,
    isMock: true,
    entries: [
      { id: 'mock-rio-na-1',   studentId: 20039, serverRegion: 'global_na',   playerName: 'DemoSensei' },
      { id: 'mock-rio-na-2',   studentId: 20039, serverRegion: 'global_na',   playerName: 'ArchiveRunner' },
      { id: 'mock-rio-eu',     studentId: 20039, serverRegion: 'global_eu',   playerName: 'Eunere' },
      { id: 'mock-rio-eu-2',   studentId: 20039, serverRegion: 'global_eu',   playerName: 'Ryzaki' },
      { id: 'mock-rio-asia',   studentId: 20039, serverRegion: 'global_asia', playerName: 'ミドクニ' },
      { id: 'mock-rio-asia-2', studentId: 20039, serverRegion: 'global_asia', playerName: '先生の夢' },
      { id: 'mock-rio-tw',     studentId: 20039, serverRegion: 'global_tw',   playerName: '三遇還素琴' },
      { id: 'mock-rio-tw-2',   studentId: 20039, serverRegion: 'global_tw',   playerName: '全陽奈百羈絆' },
      { id: 'mock-rio-kr',     studentId: 20039, serverRegion: 'global_kr',   playerName: '히나머리냄새디퓨저' },
      { id: 'mock-rio-kr-2',   studentId: 20039, serverRegion: 'global_kr',   playerName: '선도부팬' },
    ],
  },
  10098: {
    studentId: 10098,
    isMock: true,
    entries: [
      { id: 'mock-hoshino-asia', studentId: 10098, serverRegion: 'global_asia', playerName: 'SleepyVeteran' },
      { id: 'mock-hoshino-kr',   studentId: 10098, serverRegion: 'global_kr',   playerName: '악한선물' },
      { id: 'mock-hoshino-tw',   studentId: 10098, serverRegion: 'global_tw',   playerName: '我真的好喜欢hoshino啊' },
    ],
  },
};

class Bond100ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Bond100ApiError';
  }
}

function buildApiUrl(path: string): string {
  return `${API_BASE.replace(/\/$/, '')}${path}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildApiUrl(path), init);

  if (!response.ok) {
    throw new Bond100ApiError(`Bond100 API returned ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getBond100Summary(): Promise<Bond100SummaryResponse> {
  try {
    const raw = await fetchJson<Bond100SummaryResponse>('/bond100/summary');
    return normalizeSummary(raw);
  } catch {
    return normalizeSummary(MOCK_SUMMARY);
  }
}

export async function getBond100StudentEntries(studentId: number): Promise<Bond100StudentEntriesResponse> {
  const primaryId = getPrimaryStudentId(studentId);
  try {
    const raw = await fetchJson<Bond100StudentEntriesResponse>(`/bond100/students/${primaryId}/entries`);
    return { ...raw, studentId: primaryId, entries: raw.entries ?? [] };
  } catch {
    return MOCK_ENTRIES[primaryId] ?? {
      studentId: primaryId,
      entries: [],
      isMock: true,
    };
  }
}

// Linked-pair styles (e.g. Hoshino Armed 10098 + 10099) share one in-game
// student — collapse the secondary's counts into the primary so the Hall
// shows one tile per unit, not one per style. Source of truth: linkedStudents.ts.
function normalizeSummary(response: Bond100SummaryResponse): Bond100SummaryResponse {
  const merged = new Map<number, Bond100StudentSummary>();

  for (const item of response.students) {
    const primaryId = getPrimaryStudentId(item.studentId);
    const existing = merged.get(primaryId);
    if (!existing) {
      merged.set(primaryId, { ...item, studentId: primaryId, byServer: { ...item.byServer } });
      continue;
    }
    existing.count += item.count;
    for (const [region, count] of Object.entries(item.byServer) as Array<[Bond100ServerRegion, number | undefined]>) {
      if (!count) continue;
      existing.byServer[region] = (existing.byServer[region] ?? 0) + count;
    }
  }

  const students = Array.from(merged.values());
  const total = response.total ?? students.reduce((sum, item) => sum + item.count, 0);
  return { ...response, students, total };
}

/** Submit a create request (player reached bond 100). Enters the moderation queue. */
export async function submitBond100Submission(payload: Bond100SubmissionPayload): Promise<void> {
  try {
    await fetchJson('/bond100/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Bond100ApiError('Bond100 submissions are not available yet.');
  }
}

/** Request removal of a published entry. Enters the moderation queue as a delete request. */
export async function submitBond100Removal(payload: Bond100RemovalPayload): Promise<void> {
  try {
    await fetchJson('/bond100/removals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Bond100ApiError('Bond100 removal requests are not available yet.');
  }
}
