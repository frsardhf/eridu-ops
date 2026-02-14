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

/**
 * Get total allocated gifts across all students
 * Used to calculate available quantities for autoFill
 * @param excludeStudentId - Optional student ID to exclude from calculation
 */
export function getAllocatedGifts(excludeStudentId?: number): Record<number, number> {
  const allocated: Record<number, number> = {};

  Object.entries(studentDataStore.value).forEach(([studentId, form]) => {
    if (excludeStudentId && parseInt(studentId) === excludeStudentId) return;

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
  const getStudentsWithGifts = (viewMode: 'needed' | 'missing' = 'needed'): StudentGiftUsage[] => {
    const studentsCollection = studentData.value || {};
    const resources = getAllItemsFromCache();
    const studentGiftsMap = new Map<string, StudentGiftUsage>();

    Object.entries(studentDataStore.value).forEach(([studentId, form]) => {
      const student = studentsCollection[studentId];
      if (!student || !form) return;

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
    const allGearsData = getAllGearsData();
    Object.entries(allGearsData).forEach(([studentId, materials]) => {
      const student = studentsCollection[studentId];
      if (!student) return;

      (materials as Material[]).forEach(material => {
        const materialId = material.material?.Id;
        const category = material.material?.Category;
        // Only process gift materials (Category === 'Favor')
        if (!materialId || category !== 'Favor') return;

        const gift = getResourceDataByIdSync(materialId);
        if (!gift) return;

        const quantity = material.materialQuantity;
        if (quantity <= 0) return;

        const owned = resources[materialId]?.QuantityOwned ?? 0;

        let displayQuantity = quantity;
        if (viewMode === 'missing') {
          if (owned >= quantity) return; // Not missing
          displayQuantity = quantity - owned;
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
  const getGiftsForStudent = (studentId: number, viewMode: 'needed' | 'missing' = 'needed') => {
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
        if (owned < quantity) {
          gifts.push({ gift, quantity: quantity - owned });
        }
      } else {
        gifts.push({ gift, quantity });
      }
    });

    return gifts.sort((a, b) => b.quantity - a.quantity);
  };

  return {
    getStudentsWithGifts,
    getGiftsForStudent,
    getAllocatedGifts
  };
}
