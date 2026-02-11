import { ref, watch } from 'vue';
import { StudentProps } from '../../types/student';
import { saveResourceInventories } from '../utils/studentStorage';
import { getAllResourceInventories } from '../services/dbService';
import { getAllResourcesFromCache, updateResourceInCache } from '../stores/resourceCacheStore';
import type { CachedResource } from '../../types/resource';

export function useStudentResources(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  const resourceFormData = ref<Record<string, number>>({});
  // Track loading state to prevent watch from triggering saves during load
  const isLoading = ref(false);

  function handleResourceInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    resourceFormData.value[id] = value;
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadResources();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      if (props.isVisible) {
        loadResources();
      }
    }
  });

  // Watch for changes to form data and save to IndexedDB
  watch([resourceFormData], () => {
    if (props.isVisible && !isLoading.value) {
      saveResources();
    }
  }, { deep: true });

  async function loadResources() {
    isLoading.value = true;
    try {
      const inventories = await getAllResourceInventories();
      resourceFormData.value = { ...inventories };
    } catch (error) {
      console.error('Error retrieving resources from IndexedDB:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function saveResources() {
    // Build inventory records from cache keys + form data
    const cache = getAllResourcesFromCache();
    if (!cache || Object.keys(cache).length === 0) return;

    await saveResourceInventories(resourceFormData.value);

    // Update the in-memory cache so autoFillGifts gets current values
    for (const [id, resource] of Object.entries(cache)) {
      const numericId = Number(id);
      if (resourceFormData.value[numericId] !== undefined) {
        updateResourceInCache(numericId, {
          ...resource,
          QuantityOwned: resourceFormData.value[numericId] || 0
        } as CachedResource);
      }
    }
  }

  return {
    resourceFormData,
    handleResourceInput
  };
}
