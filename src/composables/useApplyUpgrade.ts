import { computed } from 'vue';
import type { GradeInfos } from '@/types/gear';
import type { Material, MaterialPreviewItem, UpgradePreview } from '@/types/upgrade';
import {
  calculateLevelMaterials,
  calculateSkillMaterials,
  calculatePotentialMaterials,
  computeCharacterXpCost,
  getCharXpItems,
} from '@/lib/utils/upgradeMaterialUtils';
import {
  calculateEquipmentMaterials,
  calculateEquipmentCredits,
  calculateGradeMaterials,
  calculateGradeCredits,
  calculateExclusiveGearMaterials,
  computeEquipmentXpCost,
  getEquipXpItems,
} from '@/lib/utils/gearMaterialUtils';
import { allocateEquipmentBlueprints } from '@/lib/utils/equipmentBlueprintUtils';
import { simulateXpDeduction } from '@/lib/utils/upgradeUtils';
import { sortMaterials } from '@/lib/utils/materialUtils';
import {
  getAllEquipmentFromCache,
  getEquipmentDataByIdSync,
  getResourceDataByIdSync,
} from '@/lib/stores/resourceCacheStore';
import { $t } from '@/locales';
import {
  SKILL_LABELS,
  POTENTIAL_LABELS,
  SkillType,
  PotentialType,
  SkillLevels,
  PotentialLevels,
  CharacterLevels,
  SectionId,
} from '@/types/upgrade';
import type { EquipmentLevels, GradeLevels, ExclusiveGearLevel } from '@/types/gear';
import { getEquipmentTypeName } from '@/composables/useStudentGearDisplay';
import { StudentProps } from '@/types/student';
import { WEAPON_STAR_THRESHOLD as GRADE_THRESHOLD } from '@/lib/constants/gameConstants';

type ApplyUpgradeProps = {
  student: StudentProps;
  characterLevels: CharacterLevels;
  skillLevels: SkillLevels;
  potentialLevels: PotentialLevels;
  equipmentLevels: EquipmentLevels;
  gradeLevels: GradeLevels;
  exclusiveGearLevel: ExclusiveGearLevel;
};

/** Builds the preview and affordability check from the same selected sections. */
export function computeUpgradePreview(
  selectedIds: SectionId[],
  state: ApplyUpgradeProps & {
    gradeInfos: GradeInfos;
    itemFormData: Record<string, number>;
    equipmentFormData: Record<string, number>;
  },
): UpgradePreview {
  const student = state.student;
  const insufficientList: string[] = [];

  const raw: Material[] = [];

  if (selectedIds.includes('level'))
    raw.push(...calculateLevelMaterials(student, state.characterLevels));
  if (selectedIds.includes('skills'))
    raw.push(...calculateSkillMaterials(student, state.skillLevels));
  if (selectedIds.includes('potential'))
    raw.push(...calculatePotentialMaterials(student, state.potentialLevels));
  if (selectedIds.includes('equipment')) {
    raw.push(...calculateEquipmentMaterials(student, state.equipmentLevels));
    raw.push(...calculateEquipmentCredits(state.equipmentLevels));
  }
  if (selectedIds.includes('grade')) {
    raw.push(...calculateGradeMaterials(state.gradeLevels, state.gradeInfos));
    raw.push(...calculateGradeCredits(state.gradeLevels));
  }
  if (selectedIds.includes('exclusive'))
    raw.push(...calculateExclusiveGearMaterials(student, state.exclusiveGearLevel));

  // Items and equipment use separate ID namespaces.
  const map = new Map<string, Material>();
  for (const m of raw) {
    const id = m.material.Id;
    const key = `${m.type === 'equipments' ? 'equipment' : 'item'}:${id}`;
    const ex = map.get(key);
    if (ex) ex.materialQuantity += m.materialQuantity;
    else map.set(key, { ...m });
  }

  const equipmentAllocation = allocateEquipmentBlueprints(
    [...map.values()],
    Object.fromEntries(
      Object.entries(getAllEquipmentFromCache()).map(([id, resource]) => [
        id,
        { ...resource, QuantityOwned: state.equipmentFormData[id] ?? 0 },
      ]),
    ),
  );
  const result: MaterialPreviewItem[] = [];
  for (const m of map.values()) {
    if (m.materialQuantity <= 0) continue;
    const id = m.material.Id;
    const remaining =
      m.type === 'equipments'
        ? (equipmentAllocation.remainingById.get(id) ?? -m.materialQuantity)
        : (state.itemFormData[id] ?? 0) - m.materialQuantity;
    if (remaining < 0) insufficientList.push(m.material.Name);
    const needed =
      m.type === 'equipments'
        ? (equipmentAllocation.normalUsedById.get(id) ?? 0)
        : m.materialQuantity;
    if (needed <= 0) continue;
    const owned =
      m.type === 'equipments' ? (state.equipmentFormData[id] ?? 0) : (state.itemFormData[id] ?? 0);
    result.push({
      material: m.material,
      needed,
      owned,
      remaining: owned - needed,
      type: m.type ?? 'materials',
    });
  }

  for (const [generalId, needed] of equipmentAllocation.generalUsedById) {
    const material = getEquipmentDataByIdSync(generalId);
    if (!material) continue;
    const owned = state.equipmentFormData[generalId] ?? 0;
    result.push({ material, needed, owned, remaining: owned - needed, type: 'equipments' });
  }

  if (selectedIds.includes('level')) {
    const cost = computeCharacterXpCost(
      state.characterLevels.current,
      state.characterLevels.target,
    );
    if (cost > 0) {
      const charItems = getCharXpItems((id) => state.itemFormData[id] ?? 0);
      if (charItems.reduce((sum, item) => sum + item.owned * item.xpValue, 0) < cost) {
        insufficientList.push($t('activityReport'));
      }
      const consumed = simulateXpDeduction(cost, charItems);
      charItems.forEach((item, i) => {
        if (consumed[i] <= 0) return;
        const mat = getResourceDataByIdSync(item.id);
        if (!mat) return;
        result.push({
          material: mat,
          needed: consumed[i],
          owned: item.owned,
          remaining: item.owned - consumed[i],
          type: 'xp',
        });
      });
    }
  }

  if (selectedIds.includes('equipment')) {
    const cost = computeEquipmentXpCost(state.equipmentLevels);
    if (cost > 0) {
      const equipItems = getEquipXpItems((id) => state.equipmentFormData[id] ?? 0);
      if (equipItems.reduce((sum, item) => sum + item.owned * item.xpValue, 0) < cost) {
        insufficientList.push($t('equipmentXp'));
      }
      const consumed = simulateXpDeduction(cost, equipItems);
      equipItems.forEach((item, i) => {
        if (consumed[i] <= 0) return;
        const mat = getEquipmentDataByIdSync(item.id);
        if (!mat) return;
        result.push({
          material: mat,
          needed: consumed[i],
          owned: item.owned,
          remaining: item.owned - consumed[i],
          type: 'xp',
        });
      });
    }
  }

  result.sort((a, b) =>
    sortMaterials(
      { material: a.material, materialQuantity: a.needed, type: a.type },
      { material: b.material, materialQuantity: b.needed, type: b.type },
    ),
  );

  return { items: result, insufficientList };
}

export function useApplyUpgrade(props: ApplyUpgradeProps) {
  const pendingSkills = computed(() =>
    (Object.entries(props.skillLevels) as [SkillType, { current: number; target: number }][])
      .filter(([, v]) => v.current < v.target)
      .map(([type, v]) => ({
        type,
        current: v.current,
        target: v.target,
        label: SKILL_LABELS[type],
      })),
  );

  const pendingPotentials = computed(() =>
    (
      Object.entries(props.potentialLevels) as [
        PotentialType,
        { current: number; target: number },
      ][]
    )
      .filter(([, v]) => v.current < v.target)
      .map(([type, v]) => ({
        type,
        current: v.current,
        target: v.target,
        label: POTENTIAL_LABELS[type],
      })),
  );

  const pendingEquipment = computed(() =>
    (props.student.Equipment ?? [])
      .filter(
        (type) =>
          (props.equipmentLevels[type]?.current ?? 1) < (props.equipmentLevels[type]?.target ?? 1),
      )
      .map((type) => ({
        type,
        current: props.equipmentLevels[type]?.current ?? 1,
        target: props.equipmentLevels[type]?.target ?? 1,
        label: getEquipmentTypeName(type),
      })),
  );

  const hasLevelPending = computed(
    () => props.characterLevels.current < props.characterLevels.target,
  );
  const hasSkillsPending = computed(() => pendingSkills.value.length > 0);
  const hasPotentialPending = computed(() => pendingPotentials.value.length > 0);
  const hasEquipmentPending = computed(() => pendingEquipment.value.length > 0);
  const hasGradePending = computed(
    () => (props.gradeLevels.current ?? 1) < (props.gradeLevels.target ?? 1),
  );
  const hasExclusivePending = computed(
    () => (props.exclusiveGearLevel.current ?? 0) < (props.exclusiveGearLevel.target ?? 0),
  );

  const availableSections = computed<SectionId[]>(() => {
    const out: SectionId[] = [];
    if (hasLevelPending.value) out.push('level');
    if (hasSkillsPending.value) out.push('skills');
    if (hasPotentialPending.value) out.push('potential');
    if (hasEquipmentPending.value) out.push('equipment');
    if (hasGradePending.value) out.push('grade');
    if (hasExclusivePending.value) out.push('exclusive');
    return out;
  });

  return {
    pendingSkills,
    pendingPotentials,
    pendingEquipment,
    hasLevelPending,
    hasSkillsPending,
    hasPotentialPending,
    hasEquipmentPending,
    hasGradePending,
    hasExclusivePending,
    availableSections,
    GRADE_THRESHOLD,
  };
}
