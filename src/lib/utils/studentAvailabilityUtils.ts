import type { StudentProps } from '@/types/student';
import type { GameServer } from '@/types/server';

const RELEASE_INDEX: Record<GameServer, number> = { jp: 0, global: 1, cn: 2 };

/** Missing release metadata does not establish that a student is unavailable. */
export function isUpcomingOnServer(
  student: Pick<StudentProps, 'IsReleased'>,
  server: GameServer,
): boolean {
  return student.IsReleased?.[RELEASE_INDEX[server]] === false;
}
