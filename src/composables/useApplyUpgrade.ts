import { computed } from 'vue';
import {
  SKILL_LABELS, POTENTIAL_LABELS,
  SkillType, PotentialType,
  SkillLevels, PotentialLevels,
  SectionId,
} from '@/types/upgrade';
import type { EquipmentLevels, GradeLevels, ExclusiveGearLevel } from '@/types/gear';
import { getEquipmentTypeName } from '@/composables/useStudentGearDisplay';
import { StudentProps } from '@/types/student';
import { WEAPON_STAR_THRESHOLD as GRADE_THRESHOLD } from '@/consumables/constants/gameConstants';

type ApplyUpgradeProps = {
  student: StudentProps;
  characterLevels: { current: number; target: number };
  skillLevels: SkillLevels;
  potentialLevels: PotentialLevels;
  equipmentLevels: EquipmentLevels;
  gradeLevels: GradeLevels;
  exclusiveGearLevel: ExclusiveGearLevel;
};

export function useApplyUpgrade(props: ApplyUpgradeProps) {
  const pendingSkills = computed(() =>
    (Object.entries(props.skillLevels) as [SkillType, { current: number; target: number }][])
      .filter(([, v]) => v.current < v.target)
      .map(([type, v]) => ({ type, current: v.current, target: v.target, label: SKILL_LABELS[type] }))
  );

  const pendingPotentials = computed(() =>
    (Object.entries(props.potentialLevels) as [PotentialType, { current: number; target: number }][])
      .filter(([, v]) => v.current < v.target)
      .map(([type, v]) => ({ type, current: v.current, target: v.target, label: POTENTIAL_LABELS[type] }))
  );

  const pendingEquipment = computed(() =>
    (props.student.Equipment ?? [])
      .filter(type => (props.equipmentLevels[type]?.current ?? 1) < (props.equipmentLevels[type]?.target ?? 1))
      .map(type => ({
        type,
        current: props.equipmentLevels[type]?.current ?? 1,
        target:  props.equipmentLevels[type]?.target  ?? 1,
        label: getEquipmentTypeName(type),
      }))
  );

  const hasLevelPending     = computed(() => props.characterLevels.current < props.characterLevels.target);
  const hasSkillsPending    = computed(() => pendingSkills.value.length > 0);
  const hasPotentialPending = computed(() => pendingPotentials.value.length > 0);
  const hasEquipmentPending = computed(() => pendingEquipment.value.length > 0);
  const hasGradePending     = computed(() => (props.gradeLevels.current ?? 1) < (props.gradeLevels.target ?? 1));
  const hasExclusivePending = computed(() =>
    (props.exclusiveGearLevel.current ?? 0) < (props.exclusiveGearLevel.target ?? 0)
  );

  const availableSections = computed<SectionId[]>(() => {
    const out: SectionId[] = [];
    if (hasLevelPending.value)     out.push('level');
    if (hasSkillsPending.value)    out.push('skills');
    if (hasPotentialPending.value) out.push('potential');
    if (hasEquipmentPending.value) out.push('equipment');
    if (hasGradePending.value)     out.push('grade');
    if (hasExclusivePending.value) out.push('exclusive');
    return out;
  });

  return {
    pendingSkills, pendingPotentials, pendingEquipment,
    hasLevelPending, hasSkillsPending, hasPotentialPending,
    hasEquipmentPending, hasGradePending, hasExclusivePending,
    availableSections,
    GRADE_THRESHOLD,
  };
}
