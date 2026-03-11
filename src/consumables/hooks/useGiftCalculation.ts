import { getResourceDataByIdSync, getAllItemsFromCache } from '../stores/resourceCacheStore';
import { useStudentData } from './useStudentData';
import { studentDataStore } from '../stores/studentStore';
import { StudentProps } from '../../types/student';
import { getAllGearsData } from '../stores/gearsStore';
import { Material } from '../../types/upgrade';

// Student gift usage for Student → Gifts display
interface StudentGiftUsage {
  student: StudentProps;
  totalGifts: number;
  gifts: { gift: any; quantity: number }[];
}

type GiftViewMode = 'needed' | 'missing' | 'leftover';

function buildGiftNeededMap() {
  const allGearsData = getAllGearsData();
  const giftNeededMap = new Map<number, number>();

  const addGiftNeed = (giftId: number, quantity: number) => {
    if (quantity <= 0) return;
    giftNeededMap.set(giftId, (giftNeededMap.get(giftId) ?? 0) + quantity);
  };

  Object.values(studentDataStore.value).forEach(form => {
    if (!form) return;
    if (form.isOwned === false) return; // skip unowned

    const giftFormData = (form as any).giftFormData || {};
    Object.entries(giftFormData).forEach(([giftId, qty]) => {
      addGiftNeed(parseInt(giftId, 10), qty as number);
    });

    const nonFavorGiftsMap = (form as any).nonFavorGiftsMap || {};
    Object.entries(nonFavorGiftsMap).forEach(([giftId, qty]) => {
      addGiftNeed(parseInt(giftId, 10), qty as number);
    });
  });

  Object.entries(allGearsData).forEach(([studentId, materials]) => {
    if (studentDataStore.value[parseInt(studentId)]?.isOwned === false) return; // skip unowned
    (materials as Material[]).forEach(material => {
      const materialId = material.material?.Id;
      const category = material.material?.Category;
      if (!materialId || category !== 'Favor') return;
      addGiftNeed(materialId, material.materialQuantity);
    });
  });

  return giftNeededMap;
}

/**
 * Get total allocated gifts across all students
 * Used to calculate available quantities for autoFill
 * @param excludeStudentId - Optional student ID to exclude from calculation
 */
export function getAllocatedGifts(excludeStudentId?: number): Record<number, number> {
  const allocated: Record<number, number> = {};

  Object.entries(studentDataStore.value).forEach(([studentId, form]) => {
    if (excludeStudentId && parseInt(studentId) === excludeStudentId) return;
    if (form?.isOwned === false) return; // skip unowned

    // Sum giftFormData (favored gifts)
    const giftFormData = (form as any).giftFormData || {};
    Object.entries(giftFormData).forEach(([giftId, qty]) => {
      const id = parseInt(giftId);
      const quantity = qty as number;
      if (quantity > 0) {
        allocated[id] = (allocated[id] || 0) + quantity;
      }
    });

    // Sum nonFavorGiftsMap (individual non-favor gifts)
    // NOT boxFormData - that only has aggregated totals (100000, 100009)
    const nonFavorGiftsMap = (form as any).nonFavorGiftsMap || {};
    Object.entries(nonFavorGiftsMap).forEach(([giftId, qty]) => {
      const id = parseInt(giftId);
      const quantity = qty as number;
      if (quantity > 0) {
        allocated[id] = (allocated[id] || 0) + quantity;
      }
    });
  });

  return allocated;
}

export function useGiftCalculation() {
  const { studentData } = useStudentData();

  // Get all students with their gift allocations (for Student → Gifts display)
  const getStudentsWithGifts = (viewMode: GiftViewMode = 'needed'): StudentGiftUsage[] => {
    if (viewMode === 'leftover') return [];

    const studentsCollection = studentData.value || {};
    const resources = getAllItemsFromCache();
    const studentGiftsMap = new Map<string, StudentGiftUsage>();

    Object.entries(studentDataStore.value).forEach(([studentId, form]) => {
      const student = studentsCollection[studentId];
      if (!student || !form) return;
      if (form.isOwned === false) return; // skip unowned

      const gifts: { gift: any; quantity: number }[] = [];
      let totalGifts = 0;

      // Process giftFormData (favored gifts)
      const giftFormData = (form as any).giftFormData || {};
      Object.entries(giftFormData).forEach(([giftId, qty]) => {
        const quantity = qty as number;
        if (quantity <= 0) return;

        const gift = getResourceDataByIdSync(parseInt(giftId));
        if (!gift) return;

        const owned = resources[parseInt(giftId)]?.QuantityOwned ?? 0;

        if (viewMode === 'missing') {
          // For missing mode, we need to calculate how much is missing
          // This is simplified - just show if owned < needed
          if (owned < quantity) {
            const missing = quantity - owned;
            gifts.push({ gift, quantity: missing });
            totalGifts += missing;
          }
        } else {
          gifts.push({ gift, quantity });
          totalGifts += quantity;
        }
      });

      // Process nonFavorGiftsMap (non-favor gifts)
      const nonFavorGiftsMap = (form as any).nonFavorGiftsMap || {};
      Object.entries(nonFavorGiftsMap).forEach(([giftId, qty]) => {
        const quantity = qty as number;
        if (quantity <= 0) return;

        const gift = getResourceDataByIdSync(parseInt(giftId));
        if (!gift) return;

        const owned = resources[parseInt(giftId)]?.QuantityOwned ?? 0;

        if (viewMode === 'missing') {
          if (owned < quantity) {
            const missing = quantity - owned;
            gifts.push({ gift, quantity: missing });
            totalGifts += missing;
          }
        } else {
          gifts.push({ gift, quantity });
          totalGifts += quantity;
        }
      });

      if (totalGifts > 0) {
        studentGiftsMap.set(studentId, {
          student,
          totalGifts,
          gifts
        });
      }
    });

    // Also include exclusive gear gift materials (Category === 'Favor') from gears store
    // Pre-compute bond allocations so the gear section uses remaining-after-bond for missing mode
    const bondAllocated = new Map<number, number>();
    Object.values(studentDataStore.value).forEach(form => {
      if (!form || form.isOwned === false) return;
      const giftFormData = (form as any).giftFormData || {};
      const nonFavorGiftsMap = (form as any).nonFavorGiftsMap || {};
      [...Object.entries(giftFormData), ...Object.entries(nonFavorGiftsMap)].forEach(([id, qty]) => {
        const giftId = parseInt(id);
        bondAllocated.set(giftId, (bondAllocated.get(giftId) ?? 0) + (qty as number));
      });
    });
    // Track remaining available after bond allocations (drained across multiple gear students)
    const giftRemainingForGear = new Map<number, number>();
    const getGiftRemaining = (giftId: number) => {
      if (!giftRemainingForGear.has(giftId)) {
        const owned = resources[giftId]?.QuantityOwned ?? 0;
        giftRemainingForGear.set(giftId, Math.max(0, owned - (bondAllocated.get(giftId) ?? 0)));
      }
      return giftRemainingForGear.get(giftId)!;
    };

    const allGearsData = getAllGearsData();
    Object.entries(allGearsData).forEach(([studentId, materials]) => {
      const student = studentsCollection[studentId];
      if (!student) return;
      if (studentDataStore.value[parseInt(studentId)]?.isOwned === false) return; // skip unowned

      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        const category = material.material?.Category;
        // Only process gift materials (Category === 'Favor')
        if (!materialId || category !== 'Favor') return;

        const gift = getResourceDataByIdSync(materialId);
        if (!gift) return;

        const quantity = material.materialQuantity;
        if (quantity <= 0) return;

        let displayQuantity = quantity;
        if (viewMode === 'missing') {
          const remaining = getGiftRemaining(materialId);
          if (remaining >= quantity) {
            giftRemainingForGear.set(materialId, remaining - quantity); // drain without marking missing
            return;
          }
          displayQuantity = quantity - remaining;
          giftRemainingForGear.set(materialId, 0);
        }

        // Add to existing student entry or create new one
        if (studentGiftsMap.has(studentId)) {
          const existing = studentGiftsMap.get(studentId)!;
          existing.gifts.push({ gift, quantity: displayQuantity });
          existing.totalGifts += displayQuantity;
        } else {
          studentGiftsMap.set(studentId, {
            student,
            totalGifts: displayQuantity,
            gifts: [{ gift, quantity: displayQuantity }]
          });
        }
      });
    });

    return Array.from(studentGiftsMap.values())
      .sort((a, b) => b.totalGifts - a.totalGifts);
  };

  // Get gifts for a specific student
  const getGiftsForStudent = (studentId: number, viewMode: GiftViewMode = 'needed') => {
    if (viewMode === 'leftover') return [];

    const form = studentDataStore.value[studentId];
    if (!form) return [];

    const resources = getAllItemsFromCache();
    const gifts: { gift: any; quantity: number }[] = [];

    // Process giftFormData (favored gifts)
    const giftFormData = (form as any).giftFormData || {};
    Object.entries(giftFormData).forEach(([giftId, qty]) => {
      const quantity = qty as number;
      if (quantity <= 0) return;

      const gift = getResourceDataByIdSync(parseInt(giftId));
      if (!gift) return;

      const owned = resources[parseInt(giftId)]?.QuantityOwned ?? 0;

      if (viewMode === 'missing') {
        if (owned < quantity) {
          gifts.push({ gift, quantity: quantity - owned });
        }
      } else {
        gifts.push({ gift, quantity });
      }
    });

    // Process nonFavorGiftsMap (non-favor gifts)
    const nonFavorGiftsMap = (form as any).nonFavorGiftsMap || {};
    Object.entries(nonFavorGiftsMap).forEach(([giftId, qty]) => {
      const quantity = qty as number;
      if (quantity <= 0) return;

      const gift = getResourceDataByIdSync(parseInt(giftId));
      if (!gift) return;

      const owned = resources[parseInt(giftId)]?.QuantityOwned ?? 0;

      if (viewMode === 'missing') {
        if (owned < quantity) {
          gifts.push({ gift, quantity: quantity - owned });
        }
      } else {
        gifts.push({ gift, quantity });
      }
    });

    // Process exclusive gear gift materials (Category === 'Favor') from gears store
    // For missing mode, compare against remaining after all students' bond allocations
    const bondAllocatedForGear = new Map<number, number>();
    if (viewMode === 'missing') {
      Object.values(studentDataStore.value).forEach(form => {
        if (!form || form.isOwned === false) return;
        const giftFormData = (form as any).giftFormData || {};
        const nonFavorGiftsMap = (form as any).nonFavorGiftsMap || {};
        [...Object.entries(giftFormData), ...Object.entries(nonFavorGiftsMap)].forEach(([id, qty]) => {
          const giftId = parseInt(id);
          bondAllocatedForGear.set(giftId, (bondAllocatedForGear.get(giftId) ?? 0) + (qty as number));
        });
      });
    }

    const allGearsData = getAllGearsData();
    const studentGearMaterials = allGearsData[studentId] || [];
    (studentGearMaterials as Material[]).forEach(material => {
      const materialId = material.material?.Id;
      const category = material.material?.Category;
      // Only process gift materials (Category === 'Favor')
      if (!materialId || category !== 'Favor') return;

      const gift = getResourceDataByIdSync(materialId);
      if (!gift) return;

      const quantity = material.materialQuantity;
      if (quantity <= 0) return;

      const owned = resources[materialId]?.QuantityOwned ?? 0;

      if (viewMode === 'missing') {
        const remaining = Math.max(0, owned - (bondAllocatedForGear.get(materialId) ?? 0));
        if (remaining < quantity) {
          gifts.push({ gift, quantity: quantity - remaining });
        }
      } else {
        gifts.push({ gift, quantity });
      }
    });

    return gifts.sort((a, b) => b.quantity - a.quantity);
  };

  // Get leftover gifts (owned - needed) aggregated by gift ID
  const getGiftLeftovers = () => {
    const resources = getAllItemsFromCache();
    const giftNeededMap = buildGiftNeededMap();

    const leftovers: { gift: any; quantity: number; remaining: number }[] = [];
    giftNeededMap.forEach((needed, giftId) => {
      const gift = getResourceDataByIdSync(giftId);
      if (!gift) return;

      const owned = resources[giftId]?.QuantityOwned ?? 0;
      const remaining = owned - needed;
      if (remaining <= 0) return;

      leftovers.push({
        gift,
        quantity: remaining,
        remaining
      });
    });

    return leftovers.sort((a, b) => b.quantity - a.quantity);
  };

  const getGiftNeededById = () => {
    const giftNeededMap = buildGiftNeededMap();
    const neededById: Record<number, number> = {};
    giftNeededMap.forEach((needed, giftId) => {
      neededById[giftId] = needed;
    });
    return neededById;
  };

  return {
    getStudentsWithGifts,
    getGiftsForStudent,
    getGiftLeftovers,
    getGiftNeededById,
    getAllocatedGifts
  };
}
