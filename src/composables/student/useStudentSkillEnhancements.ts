import { computed, MaybeRefOrGetter, toValue } from 'vue';
import { getStudentData } from '../../consumables/stores/studentStore';

export function useStudentSkillEnhancements(
  student: MaybeRefOrGetter<Record<string, any> | null>
) {
  const studentData = computed(() => {
    const s = toValue(student);
    if (!s?.Id) return null;
    return getStudentData(s.Id);
  });
  const gradeLevel = computed(() => studentData.value?.gradeLevels?.current || 0);
  const exclusiveGearLevel = computed(() => studentData.value?.exclusiveGearLevel?.current || 0);
  const isPassiveEnhanced = computed(() => gradeLevel.value >= 7);
  const isBasicEnhanced = computed(() => exclusiveGearLevel.value >= 2);
  return { studentData, gradeLevel, exclusiveGearLevel, isPassiveEnhanced, isBasicEnhanced };
}
