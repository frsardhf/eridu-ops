/**
 * Per-card stat overlays the user can pin to always-display via the /students
 * view-controls "eye" menu. Unlisted ones still reveal on hover.
 */
export type CardOverlayId = 'level' | 'grade' | 'equipment' | 'skills' | 'potential';

export const CARD_OVERLAY_IDS: CardOverlayId[] = [
  'level', 'grade', 'equipment', 'skills', 'potential',
];
