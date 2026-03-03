import { computed, MaybeRefOrGetter, toValue } from 'vue';
import {
  getWeaponIconUrl as iconGetWeaponIconUrl,
  getEquipmentIconUrl as iconGetEquipmentIconUrl,
  getExclusiveGearIconUrl as iconGetExclusiveGearIconUrl,
} from '@/consumables/utils/iconUtils';
import { MAX_GRADE, WEAPON_STAR_THRESHOLD } from '@/consumables/constants/gameConstants';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';

export function getEquipmentTypeName(type: string): string {
  return $t(`equipmentTypes.${type}`) || type;
}

export function useStudentGearDisplay(
  student: MaybeRefOrGetter<StudentProps>,
  gradeLevels: MaybeRefOrGetter<{ current?: number; target?: number }>,
  equipmentLevels: MaybeRefOrGetter<Record<string, { current: number; target: number }>>,
  exclusiveGearLevel: MaybeRefOrGetter<{ current?: number; target?: number }>
) {
  const currentGrade = computed(() => toValue(gradeLevels)?.current ?? 1);
  const targetGrade = computed(() => toValue(gradeLevels)?.target ?? 1);
  const isMaxGrade = computed(() => currentGrade.value === MAX_GRADE);
  const isWeaponLocked = computed(() => currentGrade.value <= WEAPON_STAR_THRESHOLD);

  const blueStars = computed(() => {
    const arr: { position: number; active: boolean }[] = [];
    for (let i = WEAPON_STAR_THRESHOLD + 1; i <= MAX_GRADE; i++) {
      arr.push({ position: i, active: i <= currentGrade.value });
    }
    return arr;
  });

  function getWeaponIconUrl(): string {
    return iconGetWeaponIconUrl(toValue(student).WeaponImg);
  }

  function getEquipmentIconUrl(type: string, tier: number): string {
    return iconGetEquipmentIconUrl(type, tier);
  }

  function getEquipmentDisplay(type: string): { current: number; target: number; isSame: boolean } {
    const levels = toValue(equipmentLevels);
    const current = levels[type]?.current || 1;
    const target = levels[type]?.target || 1;
    return { current, target, isSame: current === target };
  }

  function getExclusiveGearIconUrl(): string {
    return iconGetExclusiveGearIconUrl(toValue(student).Id);
  }

  function getExclusiveGearDisplay(): {
    current: number;
    target: number;
    isSame: boolean;
    isLocked: boolean;
  } {
    const lvl = toValue(exclusiveGearLevel);
    const current = lvl?.current || 0;
    const target = lvl?.target || 0;
    return { current, target, isSame: current === target, isLocked: current === 0 };
  }

  return {
    currentGrade,
    targetGrade,
    isMaxGrade,
    isWeaponLocked,
    blueStars,
    getWeaponIconUrl,
    getEquipmentIconUrl,
    getEquipmentDisplay,
    getExclusiveGearIconUrl,
    getExclusiveGearDisplay
  };
}
