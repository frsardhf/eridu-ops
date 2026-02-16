import { computed, Ref } from 'vue';
import {
  getBulletTypeColor,
  getArmorTypeColor,
  getSquadTypeColor,
  colorWithOpacity
} from '@/consumables/utils/colorUtils';
import { StudentProps } from '@/types/student';

export function useStudentColors(student: Ref<StudentProps>) {
  const squadTypeColor = computed(() => getSquadTypeColor(student.value.SquadType));
  const bulletTypeColor = computed(() => getBulletTypeColor(student.value.BulletType));
  const armorTypeColor = computed(() => getArmorTypeColor(student.value.ArmorType));
  const bulletTypeColorLight = computed(() => colorWithOpacity(bulletTypeColor.value, 0.8));
  const armorTypeColorLight = computed(() => colorWithOpacity(armorTypeColor.value, 0.8));
  return { squadTypeColor, bulletTypeColor, armorTypeColor, bulletTypeColorLight, armorTypeColorLight };
}
