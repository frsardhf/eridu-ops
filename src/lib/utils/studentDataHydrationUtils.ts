import { ResourceProps } from '@/types/resource';
import { StudentProps } from '@/types/student';
import { GiftProps } from '@/types/gift';

export function toRecordById<T extends { Id: number | string }>(
  items: T[]
): Record<string, T> {
  return items.reduce((acc, item) => {
    acc[String(item.Id)] = item;
    return acc;
  }, {} as Record<string, T>);
}

export function attachElephIcons(
  students: Record<string, StudentProps>,
  items: Record<string, ResourceProps>
): Record<string, StudentProps> {
  const patched: Record<string, StudentProps> = { ...students };
  Object.entries(patched).forEach(([studentId, student]) => {
    const icon = items[studentId]?.Icon;
    if (icon) {
      patched[studentId] = {
        ...student,
        ElephIcon: icon
      };
    }
  });
  return patched;
}

/**
 * Attaches the student's favored Gifts and Boxes (from the per-student maps
 * built by buildGiftsByStudent) onto a StudentProps clone. Used wherever a
 * student object is handed off to a downstream consumer that reads
 * `student.Gifts` / `student.Boxes` directly (StudentModal, BondsStudentEditor).
 *
 * The Array.isArray fallback handles the case where the source map has
 * accidentally been serialized as an object — defensive for legacy data.
 */
export function enrichStudentWithGifts(
  student: StudentProps,
  favoredGiftByStudent: Record<string, GiftProps[]>,
  giftBoxByStudent: Record<string, GiftProps[]>,
): StudentProps {
  const gifts = favoredGiftByStudent[student.Id] ?? [];
  const boxes = giftBoxByStudent[student.Id] ?? [];
  return {
    ...student,
    Gifts: Array.isArray(gifts) ? gifts : Object.values(gifts),
    Boxes: Array.isArray(boxes) ? boxes : Object.values(boxes),
    ElephIcon: student.ElephIcon || '',
  };
}
