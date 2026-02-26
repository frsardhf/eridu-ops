import { computed, Ref } from 'vue';
import { resolveLocalized } from '@/consumables/utils/localizationUtils';
import { StudentProps } from '@/types/student';

export function useStudentLocalization(student: Ref<StudentProps>) {
  const squadTypeName = computed(() => resolveLocalized('SquadType', student.value.SquadType));
  const bulletTypeName = computed(() => resolveLocalized('BulletType', student.value.BulletType));
  const armorTypeName = computed(() => resolveLocalized('ArmorType', student.value.ArmorType));
  const schoolName = computed(() => resolveLocalized('School', student.value.School));
  const clubName = computed(() => resolveLocalized('Club', student.value.Club));
  return { squadTypeName, bulletTypeName, armorTypeName, schoolName, clubName };
}
