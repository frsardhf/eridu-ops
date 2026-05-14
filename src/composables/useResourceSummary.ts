import { computed, type Ref } from 'vue';
import type { MaterialWithRemaining, Material, MaterialType } from '@/types/upgrade';
import { MATERIAL, EQUIPMENT, type CachedResource } from '@/types/resource';
import type { StudentProps } from '@/types/student';
import { useMaterialCalculation } from '@/lib/hooks/useMaterialCalculation';
import { useGearCalculation } from '@/lib/hooks/useGearCalculation';
import { useGiftCalculation } from '@/lib/hooks/useGiftCalculation';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { getAllItemsFromCache, getAllEquipmentFromCache, getResourceDataByIdSync, getEquipmentDataByIdSync } from '@/lib/stores/resourceCacheStore';
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

export interface StudentMaterialRow {
  student: StudentProps;
  materials: Material[];
  total: number;
}

export type ViewTab = 'materials' | 'equipment' | 'gifts';
export type ViewMode = 'needed' | 'missing' | 'leftover';

const MATERIALS_PER_PAGE = 89;
const MATERIAL_PAGE_SIZE_PLAN: number[] = [89, 88];
const EQUIPMENT_PER_PAGE = 98;
const GIFTS_PER_PAGE = 89;

function paginateResources<T>(all: T[], pageSize: number, plannedFirstPages: number[] = []): T[][] {
  if (all.length === 0) return [];

  const pages: T[][] = [];
  let start = 0;

  for (const rawSize of plannedFirstPages) {
    const size = Math.max(1, Math.floor(rawSize));
    if (start >= all.length) break;
    pages.push(all.slice(start, start + size));
    start += size;
  }

  const normalizedPageSize = Math.max(1, Math.floor(pageSize));
  for (let i = start; i < all.length; i += normalizedPageSize) {
    pages.push(all.slice(i, i + normalizedPageSize));
  }

  return pages;
}

export function useResourceSummary(activeTab: Ref<ViewTab>, activeMode: Ref<ViewMode>) {
  const { totalMaterialsNeeded, calculateExpNeeds } = useMaterialCalculation();
  const { totalEquipmentsNeeded, calculateExpNeeds: calculateEquipmentExpNeeds } = useGearCalculation();
  const { getStudentsWithGifts, getGiftNeededById } = useGiftCalculation();

  // --- Catalog filtering ---

  const materialCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    if (!allItems || Object.keys(allItems).length === 0) return [] as CachedResource[];
    return Object.values(applyFilters(allItems, MATERIAL)).filter(item =>
      item.Category !== 'Favor' && (!isExpReport(item.Id) || item.Id === 10)
    );
  });

  const giftCatalog = computed(() => {
    const allItems = getAllItemsFromCache();
    if (!allItems || Object.keys(allItems).length === 0) return [] as CachedResource[];
    return Object.values(applyFilters(allItems, MATERIAL)).filter(item => item.Category === 'Favor');
  });

  const equipmentCatalog = computed(() => {
    const allEquipments = getAllEquipmentFromCache();
    if (!allEquipments || Object.keys(allEquipments).length === 0) return [] as CachedResource[];
    return Object.values(applyFilters(allEquipments, EQUIPMENT)).filter(item =>
      !isExpBall(item.Id) || item.Id === 1
    );
  });

  // --- Needed aggregation maps ---

  const materialNeededById = computed(() => {
    const neededMap = new Map<number, number>();
    totalMaterialsNeeded.value.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      neededMap.set(materialId, (neededMap.get(materialId) ?? 0) + (item.materialQuantity ?? 0));
    });
    return neededMap;
  });

  const equipmentNeededById = computed(() => {
    const neededMap = new Map<number, number>();
    totalEquipmentsNeeded.value.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      neededMap.set(materialId, (neededMap.get(materialId) ?? 0) + (item.materialQuantity ?? 0));
    });
    return neededMap;
  });

  const giftNeededById = computed(() => getGiftNeededById());

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
      calculateExpNeeds
    )
  );

  const missingEquipments = computed<MaterialWithRemaining[]>(() =>
    calculateMissingItems(
      totalEquipmentsNeeded.value,
      getAllEquipmentFromCache,
      isExpBall,
      calculateEquipmentExpNeeds
    )
  );

  // --- Leftover (surplus) ---

  const leftoverMaterials = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      materialCatalog.value,
      id => materialNeededById.value.get(id) ?? 0,
      'materials',
      isExpReport,
      () => materialXpRemaining.value
    )
  );

  const leftoverEquipments = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      equipmentCatalog.value,
      id => equipmentNeededById.value.get(id) ?? 0,
      'equipments',
      isExpBall,
      () => equipmentXpRemaining.value
    )
  );

  const leftoverGifts = computed<MaterialWithRemaining[]>(() =>
    calculateLeftoverItems(
      giftCatalog.value,
      id => giftNeededById.value[id] ?? 0,
      'materials',
      () => false,
      () => 0
    )
  );

  // --- Gift students ---

  const studentsWithGifts = computed(() => getStudentsWithGifts(activeMode.value));

  // --- Per-student rows (combined: materials + gears, all tabs) ---

  const allStudentMaterialRows = computed((): StudentMaterialRow[] => {
    const { studentData } = useStudentData();
    const allMatData = getAllMaterialsData();
    const allGearData = getAllGearsData();
    const studentIds = new Set([
      ...Object.keys(allMatData),
      ...Object.keys(allGearData),
    ]);
    const rows: StudentMaterialRow[] = [];

    studentIds.forEach(id => {
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
        form.characterLevels?.target ?? 1
      );
      if (charXp > 0) {
        const xpMat = getResourceDataByIdSync(10);
        if (xpMat) combined.push({ material: xpMat, materialQuantity: charXp, type: 'xp' });
      }

      const equipXp = computeEquipmentXpCost(form.equipmentLevels ?? {});
      if (equipXp > 0) {
        const xpBallMat = getEquipmentDataByIdSync(1);
        if (xpBallMat) combined.push({ material: xpBallMat, materialQuantity: equipXp, type: 'xp' });
      }

      const materials = consolidateAndSortMaterials(combined)
        .filter(m => m.materialQuantity > 0);
      if (materials.length === 0) return;
      rows.push({ student, materials, total: materials.reduce((s, m) => s + m.materialQuantity, 0) });
    });

    return rows.sort((a, b) => b.total - a.total);
  });

  // --- Display selection (tab × mode multiplexer) ---

  const displayResources = computed(() => {
    let resources: any[] = [];

    if (activeTab.value === 'materials') {
      if (activeMode.value === 'needed') {
        resources = totalMaterialsNeeded.value;
      } else if (activeMode.value === 'missing') {
        resources = missingMaterials.value;
      } else {
        resources = leftoverMaterials.value;
      }
    } else if (activeTab.value === 'equipment') {
      if (activeMode.value === 'needed') {
        resources = totalEquipmentsNeeded.value;
      } else if (activeMode.value === 'missing') {
        resources = missingEquipments.value;
      } else {
        resources = leftoverEquipments.value;
      }
    } else if (activeTab.value === 'gifts' && activeMode.value === 'leftover') {
      resources = leftoverGifts.value;
    }
    // Gifts needed/missing uses studentsWithGifts, not displayResources

    const filtered = activeMode.value === 'leftover'
      ? resources
      : resources.filter(r => (r.materialQuantity ?? 0) > 0);
    return filtered.sort((a, b) => sortMaterials(a, b));
  });

  const hasDisplayResources = computed(() => {
    if (activeTab.value === 'gifts' && activeMode.value !== 'leftover') {
      return studentsWithGifts.value.length > 0;
    }
    return displayResources.value.length > 0;
  });

  const noResourcesText = computed(() => {
    if (activeMode.value === 'needed') return $t('noResourcesNeeded');
    if (activeMode.value === 'missing') return $t('allMaterialsAvailable');
    return $t('noLeftoverResources');
  });

  // --- Leftover pagination ---

  const pagedLeftoverResources = computed(() => {
    if (activeMode.value !== 'leftover') return [] as MaterialWithRemaining[][];

    if (activeTab.value === 'materials') {
      return paginateResources(displayResources.value, MATERIALS_PER_PAGE, MATERIAL_PAGE_SIZE_PLAN);
    }

    if (activeTab.value === 'equipment') {
      return paginateResources(displayResources.value, EQUIPMENT_PER_PAGE);
    }

    return paginateResources(displayResources.value, GIFTS_PER_PAGE);
  });

  // --- Tooltip support ---

  const leftoverByMaterialId = computed(() => {
    const values = new Map<number, number>();
    if (activeMode.value !== 'leftover') return values;

    displayResources.value.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      values.set(materialId, Math.max(0, item.remaining ?? item.materialQuantity ?? 0));
    });

    return values;
  });

  return {
    missingMaterials,
    missingEquipments,
    leftoverMaterials,
    leftoverEquipments,
    leftoverGifts,
    studentsWithGifts,
    displayResources,
    hasDisplayResources,
    noResourcesText,
    pagedLeftoverResources,
    leftoverByMaterialId,
    allStudentMaterialRows,
  };
}
