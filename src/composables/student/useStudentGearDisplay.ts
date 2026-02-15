import { computed, MaybeRefOrGetter, toValue } from 'vue';

export function useStudentGearDisplay(
  student: MaybeRefOrGetter<Record<string, any> | null>,
  gradeLevels: MaybeRefOrGetter<{ current?: number; target?: number }>,
  equipmentLevels: MaybeRefOrGetter<Record<string, { current: number; target: number }>>,
  exclusiveGearLevel: MaybeRefOrGetter<{ current?: number; target?: number }>
) {
  const currentGrade = computed(() => toValue(gradeLevels)?.current ?? 1);
  const targetGrade = computed(() => toValue(gradeLevels)?.target ?? 1);
  const isMaxGrade = computed(() => currentGrade.value === 9);
  const isWeaponLocked = computed(() => currentGrade.value <= 5);

  const blueStars = computed(() => {
    const arr: { position: number; active: boolean }[] = [];
    for (let i = 6; i <= 9; i++) {
      arr.push({ position: i, active: i <= currentGrade.value });
    }
    return arr;
  });

  function getWeaponIconUrl(): string {
    const s = toValue(student);
    if (!s?.WeaponImg) return '';
    return `https://schaledb.com/images/weapon/${s.WeaponImg}.webp`;
  }

  function getEquipmentIconUrl(type: string, tier: number): string {
    return `https://schaledb.com/images/equipment/icon/equipment_icon_${type.toLowerCase()}_tier${tier}.webp`;
  }

  function getEquipmentDisplay(type: string): { current: number; target: number; isSame: boolean } {
    const levels = toValue(equipmentLevels);
    const current = levels[type]?.current || 1;
    const target = levels[type]?.target || 1;
    return { current, target, isSame: current === target };
  }

  function getExclusiveGearIconUrl(): string {
    const s = toValue(student);
    if (!s?.Id) return '';
    return `https://schaledb.com/images/gear/full/${s.Id}.webp`;
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
