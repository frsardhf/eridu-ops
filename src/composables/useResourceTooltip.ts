import { ref, computed, nextTick } from 'vue';
import type { Ref } from 'vue';
import type { EquipmentType } from '@/types/gear';
import { useMaterialCalculation } from '@/consumables/hooks/useMaterialCalculation';
import { useGearCalculation } from '@/consumables/hooks/useGearCalculation';
import { useGiftCalculation } from '@/consumables/hooks/useGiftCalculation';
import { getAllItemsFromCache } from '@/consumables/stores/resourceCacheStore';
import { isExpReport, isExpBall } from '@/consumables/utils/materialUtils';
import { getTooltipGridColumns } from '@/consumables/utils/tooltipUtils';
import { positionAtCursor } from '@/composables/useTooltip';

type ViewTab = 'materials' | 'equipment' | 'gifts';
type ViewMode = 'needed' | 'missing';

interface StudentUsage {
  student: { Id: number; Name: string; [key: string]: any };
  quantity: number;
  equipmentTypes?: EquipmentType[];
}

export function useResourceTooltip(
  activeTab: Ref<ViewTab>,
  activeMode: Ref<ViewMode>
) {
  const {
    getMaterialUsageByStudents,
    materialsLeftover,
    totalMaterialsNeeded,
    calculateExpNeeds,
  } = useMaterialCalculation();

  const {
    getEquipmentUsageByStudents,
    equipmentsLeftover,
    calculateExpNeeds: calculateEquipmentExpNeeds,
  } = useGearCalculation();

  const { getGiftsForStudent } = useGiftCalculation();

  // Hover state
  const hoveredItemId = ref<number | null>(null);
  const hoveredStudentId = ref<number | null>(null);
  const tooltipPosition = ref({ top: '0px', left: '0px' });
  const isHoveringTooltip = ref(false);

  // Usage caches
  const materialUsageCache = ref<Map<string, StudentUsage[]>>(new Map());
  const equipmentUsageCache = ref<Map<string, StudentUsage[]>>(new Map());

  // Student usage for the hovered material (Materials and Equipment tabs)
  const studentUsageForMaterial = computed(() => {
    if (hoveredItemId.value === null) return [];

    const materialId = hoveredItemId.value;
    const isEquipmentView = activeTab.value === 'equipment';
    const cache = isEquipmentView ? equipmentUsageCache.value : materialUsageCache.value;
    const cacheKey = `${materialId}-${activeTab.value}-${activeMode.value}`;

    // XP reports, credits, and XP balls always get fresh data
    if (isExpReport(materialId) || materialId === 5 || isExpBall(materialId)) {
      const usage = isEquipmentView
        ? getEquipmentUsageByStudents(materialId, activeMode.value)
        : getMaterialUsageByStudents(materialId, activeMode.value);
      return usage.sort((a, b) => b.quantity - a.quantity);
    }

    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    let usage: StudentUsage[] = [];
    if (isEquipmentView) {
      usage = getEquipmentUsageByStudents(materialId, activeMode.value)
        .sort((a, b) => b.quantity - a.quantity);
      equipmentUsageCache.value.set(cacheKey, usage);
    } else {
      usage = getMaterialUsageByStudents(materialId, activeMode.value)
        .sort((a, b) => b.quantity - a.quantity);
      materialUsageCache.value.set(cacheKey, usage);
    }

    return usage;
  });

  // Gifts for the hovered student (Gifts tab)
  const giftsForHoveredStudent = computed(() => {
    if (hoveredStudentId.value === null) return [];
    return getGiftsForStudent(hoveredStudentId.value, activeMode.value);
  });

  // Tooltip grid column counts
  const tooltipGridColumns = computed(() =>
    getTooltipGridColumns(studentUsageForMaterial.value.length)
  );
  const giftTooltipGridColumns = computed(() =>
    getTooltipGridColumns(giftsForHoveredStudent.value.length)
  );

  // Credit info
  const creditOwned = computed(() => {
    const resources = getAllItemsFromCache();
    return resources[5]?.QuantityOwned || 0;
  });

  const creditNeeded = computed(() => {
    const needed = totalMaterialsNeeded.value.find(m => m.material?.Id === 5);
    return needed?.materialQuantity || 0;
  });

  const creditRemaining = computed(() => Math.abs(creditOwned.value - creditNeeded.value));
  const isCreditDeficit = computed(() => creditOwned.value < creditNeeded.value);
  const isCreditSurplus = computed(() => creditOwned.value > creditNeeded.value);

  // EXP info factory
  const createExpInfo = (calculateFn: () => { totalXpNeeded: number; ownedXp: number }) => {
    return computed(() => {
      const { totalXpNeeded, ownedXp } = calculateFn();
      const remaining = ownedXp - totalXpNeeded;
      return {
        needed: totalXpNeeded,
        remaining: Math.abs(remaining),
        owned: ownedXp,
        isDeficit: remaining < 0,
        isSurplus: remaining > 0,
      };
    });
  };

  const expInfo = createExpInfo(() => calculateExpNeeds());
  const expBallInfo = createExpInfo(() => calculateEquipmentExpNeeds());

  // Leftover quantity for a regular material
  const getMaterialLeftover = (materialId: number) => {
    const isEquipmentView = activeTab.value === 'equipment';
    const leftover = isEquipmentView ? equipmentsLeftover.value : materialsLeftover.value;
    const material = leftover.find(m => m.material?.Id === materialId);
    return material?.materialQuantity ?? 0;
  };

  // Show / hide for material tooltip
  const showTooltip = async (event: MouseEvent, materialId: number) => {
    hoveredItemId.value = materialId;
    tooltipPosition.value = positionAtCursor(event);

    await nextTick();
    const tooltip = document.querySelector('.material-tooltip') as HTMLElement;
    if (tooltip) tooltipPosition.value = positionAtCursor(event, tooltip);
  };

  const hideTooltip = () => {
    if (!isHoveringTooltip.value) hoveredItemId.value = null;
  };

  const handleTooltipMouseEnter = () => {
    isHoveringTooltip.value = true;
  };

  const handleTooltipMouseLeave = () => {
    isHoveringTooltip.value = false;
    hoveredItemId.value = null;
    hoveredStudentId.value = null;
  };

  // Show / hide for student tooltip (Gifts tab)
  const showStudentTooltip = async (event: MouseEvent, studentId: number) => {
    hoveredStudentId.value = studentId;
    tooltipPosition.value = positionAtCursor(event);

    await nextTick();
    const tooltip = document.querySelector('.material-tooltip') as HTMLElement;
    if (tooltip) tooltipPosition.value = positionAtCursor(event, tooltip);
  };

  const hideStudentTooltip = () => {
    if (!isHoveringTooltip.value) hoveredStudentId.value = null;
  };

  // Resets hover state and caches — call on tab or mode change
  const clearHoverState = () => {
    hoveredItemId.value = null;
    hoveredStudentId.value = null;
    materialUsageCache.value.clear();
    equipmentUsageCache.value.clear();
  };

  return {
    hoveredItemId,
    hoveredStudentId,
    tooltipPosition,
    isHoveringTooltip,
    studentUsageForMaterial,
    giftsForHoveredStudent,
    tooltipGridColumns,
    giftTooltipGridColumns,
    creditOwned,
    creditNeeded,
    creditRemaining,
    isCreditDeficit,
    isCreditSurplus,
    expInfo,
    expBallInfo,
    getMaterialLeftover,
    showTooltip,
    hideTooltip,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
    showStudentTooltip,
    hideStudentTooltip,
    clearHoverState,
  };
}
