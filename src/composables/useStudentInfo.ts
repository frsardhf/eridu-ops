import { computed, Ref } from 'vue';
import {
  getBulletTypeColor,
  getArmorTypeColor,
  getSquadTypeColor,
  colorWithOpacity,
} from '@/consumables/utils/colorUtils';
import { resolveLocalized } from '@/consumables/utils/localizationUtils';
import { StudentProps } from '@/types/student';

/**
 * Merges useStudentColors and useStudentLocalization into a single composable.
 *
 * Returns all color computeds (squad/bullet/armor + light variants) and all
 * localized display names (squad/bullet/armor type names, school, club).
 * Components that only need colors can destructure just the color fields.
 */
export function useStudentInfo(student: Ref<StudentProps>) {
  // Colors
  const squadTypeColor       = computed(() => getSquadTypeColor(student.value.SquadType));
  const bulletTypeColor      = computed(() => getBulletTypeColor(student.value.BulletType));
  const armorTypeColor       = computed(() => getArmorTypeColor(student.value.ArmorType));
  const bulletTypeColorLight = computed(() => colorWithOpacity(bulletTypeColor.value, 0.8));
  const armorTypeColorLight  = computed(() => colorWithOpacity(armorTypeColor.value, 0.8));
  // Localization
  const squadTypeName  = computed(() => resolveLocalized('SquadType', student.value.SquadType));
  const bulletTypeName = computed(() => resolveLocalized('BulletType', student.value.BulletType));
  const armorTypeName  = computed(() => resolveLocalized('ArmorType', student.value.ArmorType));
  const schoolName     = computed(() => resolveLocalized('School', student.value.School));
  const clubName       = computed(() => resolveLocalized('Club', student.value.Club));

  return {
    squadTypeColor, bulletTypeColor, armorTypeColor,
    bulletTypeColorLight, armorTypeColorLight,
    squadTypeName, bulletTypeName, armorTypeName, schoolName, clubName,
  };
}
