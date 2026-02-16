import { ComputedRef, MaybeRefOrGetter, computed, ref, toValue, watch } from 'vue';
import { formatSkillDescription } from '@/consumables/utils/localizationUtils';
import { formatSkillCost, getSkillIconUrl } from '@/consumables/utils/upgradeUtils';
import { StudentProps } from '@/types/student';
import { SkillType } from '@/types/upgrade';

/**
 * Pure display-state helper — no reactive deps.
 * Returns 'max' | 'same' | 'different' given raw current/target/maxLevel values.
 */
export function getLevelDisplayState(
  current: number,
  target: number,
  maxLevel: number
): 'max' | 'same' | 'different' {
  if (current === maxLevel && target === maxLevel) return 'max';
  if (current === target) return 'same';
  return 'different';
}

/**
 * Pure display-state helper — no reactive deps.
 * Returns true when target equals maxLevel.
 */
export function isTargetMaxLevel(target: number, maxLevel: number): boolean {
  return target === maxLevel;
}

export function useStudentSkillDisplay(
  student: MaybeRefOrGetter<StudentProps>,
  skillLevels: MaybeRefOrGetter<Record<string, { current: number; target: number }>>,
  isPassiveEnhanced: ComputedRef<boolean>,
  isBasicEnhanced: ComputedRef<boolean>
) {
  const skillLabels: Record<SkillType, string> = {
    Ex: 'EX',
    Public: 'Basic',
    Passive: 'Passive',
    ExtraPassive: 'Sub'
  };

  // ExtraEx toggle state — owned here so both Info and Upgrade tabs share the same logic
  const useExtraExSkill = ref(false);

  const hasExtraExSkill = computed(() => {
    const s = toValue(student);
    return !!(s?.Skills?.Ex?.ExtraSkills && s.Skills.Ex.ExtraSkills.length > 0);
  });

  function toggleExtraExSkill() {
    useExtraExSkill.value = !useExtraExSkill.value;
  }

  // Reset toggle when the student changes
  watch(
    () => toValue(student),
    () => { useExtraExSkill.value = false; }
  );

  function getSkillIcon(skillType: SkillType): string {
    const s = toValue(student);
    if (skillType === 'Ex' && useExtraExSkill.value && s?.Skills?.Ex?.ExtraSkills?.[0]) {
      return s.Skills.Ex.ExtraSkills[0].Icon ?? '';
    }
    return s?.Skills?.[skillType]?.Icon || '';
  }

  function getSkillName(skillType: SkillType): string {
    const s = toValue(student);
    if (skillType === 'Ex' && useExtraExSkill.value && s?.Skills?.Ex?.ExtraSkills?.[0]) {
      return s.Skills.Ex.ExtraSkills[0].Name ?? 'EX Skill';
    }
    return s?.Skills?.[skillType]?.Name || skillLabels[skillType];
  }

  function getMaxLevel(skillType: SkillType): number {
    const s = toValue(student);
    if (skillType === 'Ex') {
      return s?.Skills?.Ex?.Parameters?.[0]?.length
        || s?.Skills?.Ex?.ExtraSkills?.[0]?.Parameters?.[0]?.length
        || 5;
    }
    return s?.Skills?.[skillType]?.Parameters?.[0]?.length || 10;
  }

  function getLevelDisplay(skillType: SkillType): {
    current: number;
    target: number;
    isMax: boolean;
    isSame: boolean;
  } {
    const levels = toValue(skillLevels);
    const current = levels[skillType]?.current || 1;
    const target = levels[skillType]?.target || 1;
    const maxLevel = getMaxLevel(skillType);
    return {
      current,
      target,
      isMax: current === maxLevel && target === maxLevel,
      isSame: current === target
    };
  }

  function getSkillData(skillType: SkillType) {
    const s = toValue(student);
    if (skillType === 'Passive' && isPassiveEnhanced.value && s?.Skills?.WeaponPassive)
      return s.Skills.WeaponPassive;
    if (skillType === 'Public' && isBasicEnhanced.value && s?.Skills?.GearPublic)
      return s.Skills.GearPublic;
    if (skillType === 'Ex' && useExtraExSkill.value && s?.Skills?.Ex?.ExtraSkills?.[0])
      return s.Skills.Ex.ExtraSkills[0];
    return s?.Skills?.[skillType];
  }

  function getSkillDescription(skillType: SkillType): string {
    const levels = getLevelDisplay(skillType);
    return formatSkillDescription(getSkillData(skillType), levels.current, levels.target);
  }

  function getSkillCostDisplay(skillType: SkillType): string {
    const skill = getSkillData(skillType);
    if (!skill?.Cost) return '';
    const levels = getLevelDisplay(skillType);
    return formatSkillCost(skill.Cost, levels.current, levels.target);
  }

  return {
    skillLabels,
    useExtraExSkill,
    hasExtraExSkill,
    toggleExtraExSkill,
    getSkillIcon,
    getSkillName,
    getMaxLevel,
    getLevelDisplay,
    getLevelDisplayState,
    isTargetMaxLevel,
    getSkillData,
    getSkillDescription,
    getSkillCostDisplay,
    getSkillIconUrl
  };
}
