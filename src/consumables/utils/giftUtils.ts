import { GiftProps } from '@/types/gift';
import {
  GENERIC_GIFT_TAGS,
  GIFT_BOX_EXP_VALUES,
  GiftRarity,
  ResourceProps
} from '@/types/resource';
import { StudentProps } from '@/types/student';

const GENERIC_GIFT_TAGS_SET = new Set(GENERIC_GIFT_TAGS);

function getAllStudentTags(student: StudentProps): Set<string> {
  return new Set([...student.FavorItemUniqueTags, ...student.FavorItemTags, ...GENERIC_GIFT_TAGS]);
}

function countGenericTags(item: ResourceProps): number {
  return item.Tags.filter((tag: string) => GENERIC_GIFT_TAGS_SET.has(tag)).length;
}

function calculateGiftExp(item: ResourceProps, tags: string[]): number {
  return (item.ExpValue ?? 0) * (1 + Math.min(tags.length, 3));
}

function evaluateRegularGift(
  item: ResourceProps,
  allTagsSet: Set<string>
): { shouldGift: boolean; expValue: number; favorGrade: number } {
  const commonTags = item.Tags.filter((tag: string) => allTagsSet.has(tag));
  const favorGrade = Math.min(commonTags.length, 3);
  const genericTagCount = countGenericTags(item);
  const expValue = calculateGiftExp(item, commonTags);

  const shouldGift =
    (favorGrade - genericTagCount > 0) || (favorGrade >= 2 && item.Tags.length <= 3);

  return { shouldGift, expValue, favorGrade };
}

function evaluateGiftBoxItem(
  item: ResourceProps,
  allTagsSet: Set<string>,
  highestExpGift: number,
  highestGradeGift: number,
  isCollabStudent: boolean
): { shouldGift: boolean; expValue: number; newFavorGrade: number } {
  const commonTags = item.Tags.filter((tag: string) => allTagsSet.has(tag));
  const favorGrade = Math.min(commonTags.length, 3);
  const genericTagCount = countGenericTags(item);
  const shouldGift = favorGrade + genericTagCount >= 0;

  let expValue = 0;
  let newFavorGrade = 0;

  if (item.Category === 'Consumable') {
    expValue = GIFT_BOX_EXP_VALUES[item.Rarity as GiftRarity];
    newFavorGrade = favorGrade + genericTagCount + item.Quality - 2;

    if (item.Tags.includes('DW')) {
      expValue = highestExpGift || 20;
      newFavorGrade = highestGradeGift;
    }

    if (isCollabStudent) {
      newFavorGrade = item.Rarity === 'SR' ? 1 : 2;
    }
  }

  return { shouldGift, expValue, newFavorGrade };
}

function getStudentGiftBoxInfo(
  studentId: string,
  favoredGiftByStudent: Record<string, GiftProps[]>
): { highestExpGift: number; highestGradeGift: number; isCollabStudent: boolean } {
  let highestExpGift = 0;
  let highestGradeGift = 0;
  let isCollabStudent = false;

  const studentFavoredGifts = favoredGiftByStudent[studentId] || [];
  if (studentFavoredGifts.length === 4) {
    isCollabStudent = true;
  }

  studentFavoredGifts.forEach(gift => {
    if (gift.gift.Rarity === 'SR' && gift.exp > highestExpGift) {
      highestExpGift = gift.exp;
      highestGradeGift = gift.grade;
    }
  });

  return { highestExpGift, highestGradeGift, isCollabStudent };
}

function processRegularGiftItems(
  items: Record<string, ResourceProps>,
  allTagsSet: Set<string>
): GiftProps[] {
  const studentGifts: GiftProps[] = [];

  for (const itemId in items) {
    const item = items[itemId];
    const giftDetails = evaluateRegularGift(item, allTagsSet);

    if (giftDetails.shouldGift) {
      studentGifts.push({
        gift: item,
        exp: giftDetails.expValue,
        grade: giftDetails.favorGrade + 1
      });
    }
  }

  return studentGifts;
}

function processGiftBoxItems(
  studentId: string,
  items: Record<string, ResourceProps>,
  allTagsSet: Set<string>,
  favoredGiftByStudent: Record<string, GiftProps[]>
): GiftProps[] {
  const studentGifts: GiftProps[] = [];
  const { highestExpGift, highestGradeGift, isCollabStudent } = getStudentGiftBoxInfo(
    studentId,
    favoredGiftByStudent
  );

  for (const itemId in items) {
    const item = items[itemId];
    const giftDetails = evaluateGiftBoxItem(
      item,
      allTagsSet,
      highestExpGift,
      highestGradeGift,
      isCollabStudent
    );

    if (giftDetails.shouldGift) {
      studentGifts.push({
        gift: item,
        exp: giftDetails.expValue,
        grade: giftDetails.newFavorGrade
      });
    }
  }

  return studentGifts;
}

interface BuildGiftsByStudentOptions {
  isGiftBox?: boolean;
  favoredGiftByStudent?: Record<string, GiftProps[]>;
}

export function buildGiftsByStudent(
  students: Record<string, StudentProps>,
  items: Record<string, ResourceProps>,
  options: BuildGiftsByStudentOptions = {}
): Record<string, GiftProps[]> {
  const result: Record<string, GiftProps[]> = {};
  const isGiftBox = options.isGiftBox === true;
  const favoredGiftByStudent = options.favoredGiftByStudent ?? {};

  for (const studentId in students) {
    const student = students[studentId];
    const allTagsSet = getAllStudentTags(student);
    result[studentId] = isGiftBox
      ? processGiftBoxItems(studentId, items, allTagsSet, favoredGiftByStudent)
      : processRegularGiftItems(items, allTagsSet);
  }

  return result;
}
