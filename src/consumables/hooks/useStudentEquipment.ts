import { ref, watch } from 'vue';
import { saveEquipmentInventory } from '../utils/studentStorage';
import { getAllEquipmentFromCache, updateEquipmentInCache } from '../stores/resourceCacheStore';
import { getAllEquipmentInventories } from '../services/dbService';
import type { CachedResource } from '../../types/resource';

export function useStudentEquipment(props: {
  isVisible?: boolean
}) {
  const equipmentFormData = ref<Record<string, number>>({});
  // Track loading state to prevent watch from triggering saves during load
  const isLoading = ref(false);

  function handleEquipmentInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    equipmentFormData.value[id] = value;
  }

  // Watch for changes to form data and save to IndexedDB
  watch([equipmentFormData], () => {
    if (props.isVisible && !isLoading.value) {
      saveEquipments();
    }
  }, { deep: true });

  async function loadEquipments() {
    isLoading.value = true;
    try {
      const inventories = await getAllEquipmentInventories();
      equipmentFormData.value = { ...inventories };
    } catch (error) {
      console.error('Error retrieving equipments from IndexedDB:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function saveEquipments() {
    await saveEquipmentInventory(equipmentFormData.value);

    // Update the in-memory cache so calculations get current values
    const cache = getAllEquipmentFromCache();
    for (const [id, equipment] of Object.entries(cache)) {
      const numericId = Number(id);
      if (equipmentFormData.value[numericId] !== undefined) {
        updateEquipmentInCache(numericId, {
          ...equipment,
          QuantityOwned: equipmentFormData.value[numericId] || 0
        } as CachedResource);
      }
    }
  }

  return {
    equipmentFormData,
    handleEquipmentInput,
    loadEquipments
  };
}
