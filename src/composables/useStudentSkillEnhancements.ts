import { computed, MaybeRefOrGetter, toValue } from 'vue';
import { getStudentData } from '@/consumables/stores/studentStore';
import { StudentProps } from '@/types/student';

export function useStudentSkillEnhancements(
  student: MaybeRefOrGetter<StudentProps>
) {
  const studentData = computed(() => {
    const s = toValue(student);
    return getStudentData(s.Id);
  });
  const gradeLevel = computed(() => studentData.value?.gradeLevels?.current || 0);
  const exclusiveGearLevel = computed(() => studentData.value?.exclusiveGearLevel?.current || 0);
  const isPassiveEnhanced = computed(() => gradeLevel.value >= 7);
  const isBasicEnhanced = computed(() => exclusiveGearLevel.value >= 2);
  return { studentData, gradeLevel, exclusiveGearLevel, isPassiveEnhanced, isBasicEnhanced };
}
