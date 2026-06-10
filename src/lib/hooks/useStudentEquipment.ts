import { ref } from 'vue';
import { saveEquipmentInventory } from '../services/studentPersistenceService';
import { getAllEquipmentFromCache, updateEquipmentInCache } from '../stores/resourceCacheStore';
import { getAllEquipmentInventories } from '../services/dbService';
import type { CachedResource } from '../../types/resource';
import { useDebouncedFormPersistence } from './useDebouncedFormPersistence';

export function useStudentEquipment(props: {
  isVisible?: boolean
}) {
  const equipmentFormData = ref<Record<string, number>>({});

  function handleEquipmentInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    equipmentFormData.value[id] = value;
  }

  const { loadNow: loadEquipments } = useDebouncedFormPersistence({
    isVisible:    () => props.isVisible,
    refs:         { equipmentFormData },
    defaults:     { equipmentFormData: {} as Record<string, number> },
    loadFn:       async (staged) => {
      const inventories = await getAllEquipmentInventories();
      staged.equipmentFormData.value = { ...inventories };
    },
    saveFn:       async () => {
      await saveEquipmentInventory(equipmentFormData.value);

      // Sync the in-memory cache so gear-material calculations see current quantities.
      const cache = getAllEquipmentFromCache();
      for (const [id, equipment] of Object.entries(cache)) {
        const numericId = Number(id);
        if (equipmentFormData.value[numericId] !== undefined) {
          updateEquipmentInCache(numericId, {
            ...equipment,
            QuantityOwned: equipmentFormData.value[numericId] || 0,
          } as CachedResource);
        }
      }
      return null;
    },
    watchSources: [equipmentFormData],
  });

  return {
    equipmentFormData,
    handleEquipmentInput,
    loadEquipments,
  };
}
