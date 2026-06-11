import { MaybeRefOrGetter, computed, ref, toValue, watch } from 'vue';
import { formatSkillDescription } from '@/lib/utils/localizationUtils';
import { formatSkillCost } from '@/lib/utils/upgradeUtils';
import { getSkillIconUrl } from '@/lib/utils/iconUtils';
import { getStudentData } from '@/lib/stores/studentStore';
import { getPrimaryStudentId } from '@/lib/constants/linkedStudents';
import {
  GEAR_UNLOCK_PASSIVE_SKILL,
  GEAR_UNLOCK_PUBLIC_SKILL,
  MAX_EX_SKILL_LEVEL,
  MAX_SKILL_LEVEL,
} from '@/lib/constants/gameConstants';
import { StudentProps } from '@/types/student';
import { SkillType } from '@/types/upgrade';

export function useStudentSkillDisplay(
  student: MaybeRefOrGetter<StudentProps>,
  skillLevels: MaybeRefOrGetter<Record<string, { current: number; target: number }>>,
) {
  const studentData = computed(() => getStudentData(getPrimaryStudentId(toValue(student).Id)));
  const isPassiveEnhanced = computed(() => (studentData.value?.gradeLevels?.current ?? 0) >= GEAR_UNLOCK_PASSIVE_SKILL);
  const isBasicEnhanced   = computed(() => (studentData.value?.exclusiveGearLevel?.current ?? 0) >= GEAR_UNLOCK_PUBLIC_SKILL);
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
        || MAX_EX_SKILL_LEVEL;
    }
    return s?.Skills?.[skillType]?.Parameters?.[0]?.length || MAX_SKILL_LEVEL;
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
    isBasicEnhanced,
    isPassiveEnhanced,
    toggleExtraExSkill,
    getSkillIcon,
    getSkillName,
    getMaxLevel,
    getLevelDisplay,
    getSkillData,
    getSkillDescription,
    getSkillCostDisplay,
    getSkillIconUrl
  };
}
