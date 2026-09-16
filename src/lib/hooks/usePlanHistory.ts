import { ref } from 'vue';
import type { PlanHistoryChange, PlanHistoryRecord } from '../db/database';
import {
  clearPlanHistory as clearPlanHistoryRecords,
  getPlanHistory,
  PLAN_HISTORY_LIMIT,
  restorePlanHistoryChange,
} from '../services/planHistoryService';
import { setStudentDataDirect, studentDataStore } from '../stores/studentStore';
import { studentData } from '../stores/masterDataStore';
import { getResourceDataByIdSync } from '../stores/resourceCacheStore';
import { preloadAllStudentsData } from '../utils/materialUtils';
import {
  DEFAULT_CHARACTER_LEVELS,
  DEFAULT_POTENTIAL_LEVELS,
  DEFAULT_SKILL_LEVELS,
  type CharacterLevels,
  type PotentialLevels,
  type PotentialType,
  type SkillLevels,
  type SkillType,
} from '../../types/upgrade';
import { DEFAULT_BOND_DETAIL, DEFAULT_OTHER_EXP, type OtherExpDataProps } from '../../types/gift';
import type {
  EquipmentLevels,
  EquipmentType,
  ExclusiveGearLevel,
  GradeInfos,
  GradeLevels,
} from '../../types/gear';
import type { StudentProps } from '../../types/student';
import { $t } from '../../locales';

export type PlanHistoryField =
  | 'ownership'
  | 'level'
  | 'skills'
  | 'potential'
  | 'equipment'
  | 'grade'
  | 'exclusiveGear'
  | 'bond'
  | 'gifts'
  | 'otherExp';

export interface PlanHistoryDetailGroup {
  field: PlanHistoryField;
  changes: string[];
}

type LevelPair = { current?: number; target?: number };

const PLAN_HISTORY_GIFT_DETAIL_LIMIT = 6;

const FIELD_DEFAULTS: Partial<Record<keyof PlanHistoryChange['before'], unknown>> = {
  isOwned: true,
  characterLevels: DEFAULT_CHARACTER_LEVELS,
  skillLevels: DEFAULT_SKILL_LEVELS,
  potentialLevels: DEFAULT_POTENTIAL_LEVELS,
  gradeInfos: { owned: 0, price: 1, purchasable: 20 },
  exclusiveGearLevel: { current: 0, target: 0 },
  giftFormData: {},
  boxFormData: {},
  nonFavorGiftsMap: {},
  bondDetailData: DEFAULT_BOND_DETAIL,
  otherExpData: DEFAULT_OTHER_EXP,
};

function equipmentDefaultsFrom(
  value: unknown,
  student?: StudentProps,
): EquipmentLevels | undefined {
  const equipmentTypes = new Set<string>(student?.Equipment ?? []);
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    Object.keys(value).forEach((type) => equipmentTypes.add(type));
  }
  if (equipmentTypes.size === 0) return undefined;

  return Object.fromEntries(
    [...equipmentTypes].map((equipmentType) => [equipmentType, { current: 1, target: 1 }]),
  ) as EquipmentLevels;
}

function normalizedFieldValue(
  key: keyof PlanHistoryChange['before'],
  value: unknown,
  counterpart: unknown,
  student?: StudentProps,
): unknown {
  if (value !== undefined) return value;
  if (key === 'equipmentLevels') return equipmentDefaultsFrom(counterpart, student);
  if (key === 'gradeLevels') {
    const grade = student?.StarGrade ?? 1;
    return { current: grade, target: grade };
  }
  return FIELD_DEFAULTS[key];
}

function isSameFieldValue(
  key: keyof PlanHistoryChange['before'],
  left: unknown,
  right: unknown,
  student?: StudentProps,
): boolean {
  return (
    JSON.stringify(normalizedFieldValue(key, left, right, student)) ===
    JSON.stringify(normalizedFieldValue(key, right, left, student))
  );
}

function formatTransition(before: string | number, after: string | number, label?: string): string {
  const path = label ? 'planHistory.details.labeledTransition' : 'planHistory.details.transition';
  return $t(path, { label: label ?? '', before, after });
}

function formatPairChanges(
  before: LevelPair,
  after: LevelPair,
  formatValue: (value: number) => string,
  label?: string,
): string[] {
  const beforeCurrent = before.current ?? 0;
  const beforeTarget = before.target ?? beforeCurrent;
  const afterCurrent = after.current ?? 0;
  const afterTarget = after.target ?? afterCurrent;

  if (
    beforeCurrent === beforeTarget &&
    afterCurrent === afterTarget &&
    beforeCurrent !== afterCurrent
  ) {
    return [formatTransition(formatValue(beforeCurrent), formatValue(afterCurrent), label)];
  }

  const changes: string[] = [];
  if (beforeCurrent !== afterCurrent) {
    const currentLabel = label
      ? $t('planHistory.details.labelWithState', { label, state: $t('current') })
      : $t('current');
    changes.push(
      formatTransition(formatValue(beforeCurrent), formatValue(afterCurrent), currentLabel),
    );
  }
  if (beforeTarget !== afterTarget) {
    const targetLabel = label
      ? $t('planHistory.details.labelWithState', { label, state: $t('target') })
      : $t('target');
    changes.push(
      formatTransition(formatValue(beforeTarget), formatValue(afterTarget), targetLabel),
    );
  }
  return changes;
}

function normalizedPair<T extends LevelPair>(
  key: keyof PlanHistoryChange['before'],
  value: T | undefined,
  counterpart: T | undefined,
  student?: StudentProps,
): T {
  return normalizedFieldValue(key, value, counterpart, student) as T;
}

function skillLabel(type: SkillType): string {
  const keys: Record<SkillType, string> = {
    Ex: 'skillEx',
    Public: 'skillPublic',
    Passive: 'skillPassive',
    ExtraPassive: 'skillExtraPassive',
  };
  return $t(`bulkModify.fields.${keys[type]}`);
}

function potentialLabel(type: PotentialType): string {
  const keys: Record<PotentialType, string> = {
    attack: 'attack',
    maxhp: 'maxHp',
    healpower: 'healPower',
  };
  return $t(keys[type]);
}

function itemLabel(id: string): string {
  return (
    getResourceDataByIdSync(id)?.Name ?? $t('planHistory.details.unknownItem', { id: Number(id) })
  );
}

function recordQuantityChanges(
  before: Record<string, number> | undefined,
  after: Record<string, number> | undefined,
): string[] {
  const beforeRecord = before ?? {};
  const afterRecord = after ?? {};
  return [...new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])]
    .filter((id) => (beforeRecord[id] ?? 0) !== (afterRecord[id] ?? 0))
    .map((id) => formatTransition(beforeRecord[id] ?? 0, afterRecord[id] ?? 0, itemLabel(id)));
}

function limitedGiftChanges(changes: string[]): string[] {
  if (changes.length <= PLAN_HISTORY_GIFT_DETAIL_LIMIT) return changes;
  return [
    ...changes.slice(0, PLAN_HISTORY_GIFT_DETAIL_LIMIT),
    $t('planHistory.details.moreChanges', {
      count: changes.length - PLAN_HISTORY_GIFT_DETAIL_LIMIT,
    }),
  ];
}

/** Builds concise, localized before-to-after descriptions for one student edit. */
export function getPlanHistoryChangeDetails(
  change: PlanHistoryChange,
  student?: StudentProps,
): PlanHistoryDetailGroup[] {
  const groups: PlanHistoryDetailGroup[] = [];

  if (!isSameFieldValue('isOwned', change.before.isOwned, change.after.isOwned, student)) {
    groups.push({
      field: 'ownership',
      changes: [
        formatTransition(
          change.before.isOwned !== false
            ? $t('ownership.recruited')
            : $t('ownership.notRecruited'),
          change.after.isOwned !== false ? $t('ownership.recruited') : $t('ownership.notRecruited'),
        ),
      ],
    });
  }

  if (
    !isSameFieldValue(
      'characterLevels',
      change.before.characterLevels,
      change.after.characterLevels,
      student,
    )
  ) {
    groups.push({
      field: 'level',
      changes: formatPairChanges(
        normalizedPair<CharacterLevels>(
          'characterLevels',
          change.before.characterLevels,
          change.after.characterLevels,
          student,
        ),
        normalizedPair<CharacterLevels>(
          'characterLevels',
          change.after.characterLevels,
          change.before.characterLevels,
          student,
        ),
        String,
      ),
    });
  }

  if (
    !isSameFieldValue('skillLevels', change.before.skillLevels, change.after.skillLevels, student)
  ) {
    const before = normalizedFieldValue(
      'skillLevels',
      change.before.skillLevels,
      change.after.skillLevels,
      student,
    ) as SkillLevels;
    const after = normalizedFieldValue(
      'skillLevels',
      change.after.skillLevels,
      change.before.skillLevels,
      student,
    ) as SkillLevels;
    const changes = (Object.keys(DEFAULT_SKILL_LEVELS) as SkillType[]).flatMap((type) =>
      formatPairChanges(before[type], after[type], String, skillLabel(type)),
    );
    groups.push({ field: 'skills', changes });
  }

  if (
    !isSameFieldValue(
      'potentialLevels',
      change.before.potentialLevels,
      change.after.potentialLevels,
      student,
    )
  ) {
    const before = normalizedFieldValue(
      'potentialLevels',
      change.before.potentialLevels,
      change.after.potentialLevels,
      student,
    ) as PotentialLevels;
    const after = normalizedFieldValue(
      'potentialLevels',
      change.after.potentialLevels,
      change.before.potentialLevels,
      student,
    ) as PotentialLevels;
    const changes = (Object.keys(DEFAULT_POTENTIAL_LEVELS) as PotentialType[]).flatMap((type) =>
      formatPairChanges(before[type], after[type], String, potentialLabel(type)),
    );
    groups.push({ field: 'potential', changes });
  }

  if (
    !isSameFieldValue(
      'equipmentLevels',
      change.before.equipmentLevels,
      change.after.equipmentLevels,
      student,
    )
  ) {
    const before = normalizedFieldValue(
      'equipmentLevels',
      change.before.equipmentLevels,
      change.after.equipmentLevels,
      student,
    ) as EquipmentLevels;
    const after = normalizedFieldValue(
      'equipmentLevels',
      change.after.equipmentLevels,
      change.before.equipmentLevels,
      student,
    ) as EquipmentLevels;
    const types = [...new Set([...Object.keys(before), ...Object.keys(after)])] as EquipmentType[];
    const changes = types.flatMap((type) =>
      formatPairChanges(
        before[type] ?? { current: 1, target: 1 },
        after[type] ?? { current: 1, target: 1 },
        (value) => `${$t('tier')}${value}`,
        $t(`equipmentTypes.${type}`),
      ),
    );
    groups.push({ field: 'equipment', changes });
  }

  const gradeChanges: string[] = [];
  if (
    !isSameFieldValue('gradeLevels', change.before.gradeLevels, change.after.gradeLevels, student)
  ) {
    gradeChanges.push(
      ...formatPairChanges(
        normalizedPair<GradeLevels>(
          'gradeLevels',
          change.before.gradeLevels,
          change.after.gradeLevels,
          student,
        ),
        normalizedPair<GradeLevels>(
          'gradeLevels',
          change.after.gradeLevels,
          change.before.gradeLevels,
          student,
        ),
        (value) => `★${value}`,
      ),
    );
  }
  if (!isSameFieldValue('gradeInfos', change.before.gradeInfos, change.after.gradeInfos, student)) {
    const before = normalizedFieldValue(
      'gradeInfos',
      change.before.gradeInfos,
      change.after.gradeInfos,
      student,
    ) as GradeInfos;
    const after = normalizedFieldValue(
      'gradeInfos',
      change.after.gradeInfos,
      change.before.gradeInfos,
      student,
    ) as GradeInfos;
    const infoFields: Array<[keyof GradeInfos, string]> = [
      ['owned', $t('elephsOwned')],
      ['price', $t('price')],
      ['purchasable', $t('purchasable')],
    ];
    infoFields.forEach(([key, label]) => {
      if ((before[key] ?? 0) !== (after[key] ?? 0)) {
        gradeChanges.push(formatTransition(before[key] ?? 0, after[key] ?? 0, label));
      }
    });
  }
  if (gradeChanges.length > 0) groups.push({ field: 'grade', changes: gradeChanges });

  if (
    !isSameFieldValue(
      'exclusiveGearLevel',
      change.before.exclusiveGearLevel,
      change.after.exclusiveGearLevel,
      student,
    )
  ) {
    const displayTier = (value: number) =>
      value === 0 ? $t('planHistory.details.locked') : `${$t('tier')}${value}`;
    groups.push({
      field: 'exclusiveGear',
      changes: formatPairChanges(
        normalizedPair<ExclusiveGearLevel>(
          'exclusiveGearLevel',
          change.before.exclusiveGearLevel,
          change.after.exclusiveGearLevel,
          student,
        ),
        normalizedPair<ExclusiveGearLevel>(
          'exclusiveGearLevel',
          change.after.exclusiveGearLevel,
          change.before.exclusiveGearLevel,
          student,
        ),
        displayTier,
      ),
    });
  }

  if (
    !isSameFieldValue(
      'bondDetailData',
      change.before.bondDetailData,
      change.after.bondDetailData,
      student,
    )
  ) {
    groups.push({
      field: 'bond',
      changes: [
        formatTransition(
          change.before.bondDetailData?.currentBond ?? DEFAULT_BOND_DETAIL.currentBond,
          change.after.bondDetailData?.currentBond ?? DEFAULT_BOND_DETAIL.currentBond,
        ),
      ],
    });
  }

  const giftChanges = limitedGiftChanges([
    ...recordQuantityChanges(change.before.giftFormData, change.after.giftFormData),
    ...recordQuantityChanges(change.before.boxFormData, change.after.boxFormData),
    ...recordQuantityChanges(change.before.nonFavorGiftsMap, change.after.nonFavorGiftsMap),
  ]);
  if (giftChanges.length > 0) groups.push({ field: 'gifts', changes: giftChanges });

  if (
    !isSameFieldValue(
      'otherExpData',
      change.before.otherExpData,
      change.after.otherExpData,
      student,
    )
  ) {
    const before = normalizedFieldValue(
      'otherExpData',
      change.before.otherExpData,
      change.after.otherExpData,
      student,
    ) as OtherExpDataProps;
    const after = normalizedFieldValue(
      'otherExpData',
      change.after.otherExpData,
      change.before.otherExpData,
      student,
    ) as OtherExpDataProps;
    const changes: string[] = [];
    if (before.cafeTapsPerDay !== after.cafeTapsPerDay) {
      changes.push(formatTransition(before.cafeTapsPerDay, after.cafeTapsPerDay, $t('tapsPerDay')));
    }
    if (before.cafeStartDateIso !== after.cafeStartDateIso) {
      changes.push(
        formatTransition(
          before.cafeStartDateIso || $t('planHistory.details.notSet'),
          after.cafeStartDateIso || $t('planHistory.details.notSet'),
          $t('startDate'),
        ),
      );
    }
    if (before.cafeTargetDateIso !== after.cafeTargetDateIso) {
      changes.push(
        formatTransition(
          before.cafeTargetDateIso || $t('planHistory.details.notSet'),
          after.cafeTargetDateIso || $t('planHistory.details.notSet'),
          $t('targetDate'),
        ),
      );
    }
    if (before.cafeDateInclusive !== after.cafeDateInclusive) {
      changes.push(
        formatTransition(
          before.cafeDateInclusive ? $t('inclusiveAbbr') : $t('exclusiveAbbr'),
          after.cafeDateInclusive ? $t('inclusiveAbbr') : $t('exclusiveAbbr'),
          $t('planHistory.details.dateCount'),
        ),
      );
    }
    if (before.bonusExp !== after.bonusExp) {
      changes.push(formatTransition(before.bonusExp, after.bonusExp, $t('bonusExp')));
    }
    groups.push({ field: 'otherExp', changes });
  }

  return groups.filter((group) => group.changes.length > 0);
}

/** Loads the bounded recovery log and restores individual student changes. */
export function usePlanHistory() {
  const events = ref<PlanHistoryRecord[]>([]);
  const isLoading = ref(false);
  const restoringStudentId = ref<number | null>(null);
  const isClearingHistory = ref(false);
  const error = ref(false);

  async function loadHistory(): Promise<void> {
    isLoading.value = true;
    error.value = false;
    try {
      events.value = await getPlanHistory();
    } catch (loadError) {
      console.error('Failed to load plan history:', loadError);
      error.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  async function restoreChange(eventId: number, studentId: number): Promise<boolean> {
    restoringStudentId.value = studentId;
    error.value = false;
    try {
      const restored = await restorePlanHistoryChange(eventId, studentId);
      if (!restored) return false;

      setStudentDataDirect(studentId, restored);
      preloadAllStudentsData(studentData.value, studentDataStore.value);
      await loadHistory();
      return true;
    } catch (restoreError) {
      console.error('Failed to restore student plan:', restoreError);
      error.value = true;
      return false;
    } finally {
      restoringStudentId.value = null;
    }
  }

  async function clearHistory(): Promise<boolean> {
    isClearingHistory.value = true;
    error.value = false;
    try {
      const cleared = await clearPlanHistoryRecords();
      if (!cleared) {
        error.value = true;
        return false;
      }
      events.value = [];
      return true;
    } finally {
      isClearingHistory.value = false;
    }
  }

  return {
    events,
    isLoading,
    restoringStudentId,
    isClearingHistory,
    error,
    loadHistory,
    restoreChange,
    clearHistory,
  };
}

export type { PlanHistoryChange, PlanHistoryRecord } from '../db/database';
export { PLAN_HISTORY_LIMIT };
