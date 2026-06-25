import { $t } from '@/locales';

/**
 * Localized "updated N days ago" label for a Bond 100 tile/student.
 *
 * With the rolling /rank sweep each student refreshes on its own cadence, so the
 * wall carries a per-student `fetchedAt` (YYYY-MM-DD) instead of one global
 * snapshot. This turns that date into a short relative label for the tile tooltip
 * and the entries modal. Returns '' for a missing/invalid date (caller hides it).
 *
 * Uses `$t` so it re-resolves on language change when called inside a computed.
 */
export function formatBond100Freshness(iso?: string): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d.getTime()) / 86_400_000);

  if (days <= 0) return $t('bond100.updatedToday');
  if (days === 1) return $t('bond100.updatedYesterday');
  return $t('bond100.updatedDaysAgo', { days });
}
