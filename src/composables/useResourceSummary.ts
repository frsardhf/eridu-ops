import { computed, type Ref } from 'vue';
import type { MaterialWithRemaining, Material } from '@/types/upgrade';
import { MATERIAL, EQUIPMENT, type CachedResource } from '@/types/resource';
import type { StudentProps } from '@/types/student';
import { useMaterialCalculation } from '@/lib/hooks/useMaterialCalculation';
import { useGearCalculation } from '@/lib/hooks/useGearCalculation';
import { useGiftCalculation } from '@/lib/hooks/useGiftCalculation';
import { useStudentData } from '@/lib/hooks/useStudentData';
import {
  getAllItemsFromCache,
  getAllEquipmentFromCache,
  getResourceDataByIdSync,
  getEquipmentDataByIdSync,
} from '@/lib/stores/resourceCacheStore';
import { getAllMaterialsData } from '@/lib/stores/materialsStore';
import { getAllGearsData } from '@/lib/stores/gearsStore';
import { computeCharacterXpCost } from '@/lib/utils/upgradeMaterialUtils';
import { computeEquipmentXpCost } from '@/lib/utils/gearMaterialUtils';
import { studentDataStore } from '@/lib/stores/studentStore';
import { applyFilters } from '@/lib/utils/filterUtils';
import {
  isExpReport,
  isExpBall,
  calculateMissingItems,
  calculateLeftoverItems,
  sortMaterials,
  consolidateAndSortMaterials,
} from '@/lib/utils/materialUtils';
import { isSecondaryStudent } from '@/lib/constants/linkedStudents';
import { $t } from '@/locales';
import { allocateEquipmentBlueprints } from '@/lib/utils/equipmentBlueprintUtils';

export interface StudentMaterialRow {
  student: StudentProps;
  materials: Material[];
  total: number;
}

export type ViewTab = 'materials' | 'equipment' | 'gifts';
export type ViewMode = 'needed' | 'missing' | 'leftover';

export function useResourceSummary(activeMode: Ref<ViewMode>) {
  const { totalMaterialsNeeded, calculateExpNeeds } = useMaterialCalculation();
  const { totalEquipmentsNeeded, calculateExpNeeds: calculateEquipmentExpNeeds } =
    useGearCalculation();
  const { getStudentsWithGifts, getGiftNeededById } = useGiftCalculation();

  // --- Catalog filtering ---

  const materialCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    if (!allItems || Object.keys(allItems).length === 0) return [] as CachedResource[];
    return Object.values(applyFilters(allItems, MATERIAL)).filter(
      (item) => item.Category !== 'Favor' && (!isExpReport(item.Id) || item.Id === 10),
    );
  });

  const giftCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    if (!allItems || Object.keys(allItems).length === 0) return [] as CachedResource[];
    return Object.values(applyFilters(allItems, MATERIAL)).filter(
      (item) => item.Category === 'Favor',
    );
  });

  const equipmentCatalog = computed(() => {
    const allEquipments = getAllEquipmentFromCache();
    if (!allEquipments || Object.keys(allEquipments).length === 0) return [] as CachedResource[];
    return Object.values(applyFilters(allEquipments, EQUIPMENT)).filter(
      (item) => !isExpBall(item.Id) || item.Id === 1,
    );
  });

  // --- Needed aggregation maps ---

  const materialNeededById = computed(() => {
    const neededMap = new Map<number, number>();
    totalMaterialsNeeded.value.forEach((item) => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      neededMap.set(materialId, (neededMap.get(materialId) ?? 0) + (item.materialQuantity ?? 0));
    });
    return neededMap;
  });

  const equipmentNeededById = computed(() => {
    const neededMap = new Map<number, number>();
    totalEquipmentsNeeded.value.forEach((item) => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      neededMap.set(materialId, (neededMap.get(materialId) ?? 0) + (item.materialQuantity ?? 0));
    });
    return neededMap;
  });

  const giftNeededById = computed(() => getGiftNeededById());

  const equipmentBlueprintAllocation = computed(() =>
    allocateEquipmentBlueprints(totalEquipmentsNeeded.value, getAllEquipmentFromCache()),
  );

  // --- XP surplus ---

  const materialXpRemaining = computed(() => {
    const { totalXpNeeded, ownedXp } = calculateExpNeeds();
    return Math.max(0, ownedXp - totalXpNeeded);
  });

  const equipmentXpRemaining = computed(() => {
    const { totalXpNeeded, ownedXp } = calculateEquipmentExpNeeds();
    return Math.max(0, ownedXp - totalXpNeeded);
  });

  // --- Missing (deficit) ---

  const missingMaterials = computed<MaterialWithRemaining[]>(() =>
    calculateMissingItems(
      totalMaterialsNeeded.value,
      getAllItemsFromCache,
      isExpReport,
      calculateExpNeeds,
    ),
  );

  const missingEquipments = computed<MaterialWithRemaining[]>(() => {
    const missing = calculateMissingItems(
      totalEquipmentsNeeded.value,
      getAllEquipmentFromCache,
      isExpBall,
      calculateEquipmentExpNeeds,
    );

    return missing
      .map((item) => {
        if (isExpBall(item.material.Id)) return item;
        const remaining =
          equipmentBlueprintAllocation.value.remainingById.get(item.material.Id) ?? item.remaining;
        return { ...item, remaining };
      })
      .filter((item) => item.remaining < 0);
  });

  // --- Leftover (surplus) ---

  const leftoverMaterials = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      materialCatalog.value,
      (id) => materialNeededById.value.get(id) ?? 0,
      'materials',
      isExpReport,
      () => materialXpRemaining.value,
    ),
  );

  const leftoverEquipments = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      equipmentCatalog.value,
      (id) =>
        equipmentBlueprintAllocation.value.generalUsedById.get(id) ??
        equipmentNeededById.value.get(id) ??
        0,
      'equipments',
      isExpBall,
      () => equipmentXpRemaining.value,
    ),
  );

  const leftoverGifts = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      giftCatalog.value,
      (id) => giftNeededById.value[id] ?? 0,
      'materials',
      () => false,
      () => 0,
    ),
  );

  // --- Gift students ---

  const studentsWithGifts = computed(() => getStudentsWithGifts(activeMode.value));

  // --- Per-student rows (combined: materials + gears, all tabs) ---

  const allStudentMaterialRows = computed((): StudentMaterialRow[] => {
    const { studentData } = useStudentData();
    const allMatData = getAllMaterialsData();
    const allGearData = getAllGearsData();
    const studentIds = new Set([...Object.keys(allMatData), ...Object.keys(allGearData)]);
    const rows: StudentMaterialRow[] = [];

    studentIds.forEach((id) => {
      const studentId = Number(id);
      if (isSecondaryStudent(studentId)) return;
      const form = studentDataStore.value[studentId];
      if (!form || form.isOwned === false) return;
      const student = studentData.value[id];
      if (!student) return;
      const combined: Material[] = [
        ...(allMatData[studentId] ?? []),
        ...(allGearData[studentId] ?? []),
      ];

      const charXp = computeCharacterXpCost(
        form.characterLevels?.current ?? 1,
        form.characterLevels?.target ?? 1,
      );
      if (charXp > 0) {
        const xpMat = getResourceDataByIdSync(10);
        if (xpMat) combined.push({ material: xpMat, materialQuantity: charXp, type: 'xp' });
      }

      const equipXp = computeEquipmentXpCost(form.equipmentLevels ?? {});
      if (equipXp > 0) {
        const xpBallMat = getEquipmentDataByIdSync(1);
        if (xpBallMat)
          combined.push({ material: xpBallMat, materialQuantity: equipXp, type: 'xp' });
      }

      const materials = consolidateAndSortMaterials(combined).filter((m) => m.materialQuantity > 0);
      if (materials.length === 0) return;
      rows.push({
        student,
        materials,
        total: materials.reduce((s, m) => s + m.materialQuantity, 0),
      });
    });

    return rows.sort((a, b) => b.total - a.total);
  });

  // --- Display selection (tab x mode multiplexer) ---

  function prepareResources(resources: (Material & { remaining?: number })[]) {
    const filtered =
      activeMode.value === 'leftover'
        ? resources
        : resources.filter((resource) => (resource.materialQuantity ?? 0) > 0);
    return [...filtered].sort((a, b) => sortMaterials(a, b));
  }

  const materialResourcesForMode = computed(() =>
    prepareResources(
      activeMode.value === 'needed'
        ? totalMaterialsNeeded.value
        : activeMode.value === 'missing'
          ? missingMaterials.value
          : leftoverMaterials.value,
    ),
  );

  const equipmentResourcesForMode = computed(() =>
    prepareResources(
      activeMode.value === 'needed'
        ? totalEquipmentsNeeded.value
        : activeMode.value === 'missing'
          ? missingEquipments.value
          : leftoverEquipments.value,
    ),
  );

  const giftResourcesForMode = computed(() =>
    activeMode.value === 'leftover' ? prepareResources(leftoverGifts.value) : [],
  );

  const noResourcesText = computed(() => {
    if (activeMode.value === 'needed') return $t('noResourcesNeeded');
    if (activeMode.value === 'missing') return $t('allMaterialsAvailable');
    return $t('noLeftoverResources');
  });

  return {
    studentsWithGifts,
    materialResourcesForMode,
    equipmentResourcesForMode,
    giftResourcesForMode,
    noResourcesText,
    allStudentMaterialRows,
  };
}
