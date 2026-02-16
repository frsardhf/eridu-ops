import { ref, watch } from 'vue';
import { saveItemsInventory } from '../utils/studentStorage';
import { getAllItemsInventories } from '../services/dbService';
import { getAllItemsFromCache, updateItemInCache } from '../stores/resourceCacheStore';
import type { CachedResource } from '../../types/resource';

export function useStudentItems(props: {
  isVisible?: boolean
}) {
  const itemFormData = ref<Record<string, number>>({});
  // Track loading state to prevent watch from triggering saves during load
  const isLoading = ref(false);

  function handleItemInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    itemFormData.value[id] = value;
  }

  // Watch for changes to form data and save to IndexedDB
  watch([itemFormData], () => {
    if (props.isVisible && !isLoading.value) {
      saveItems();
    }
  }, { deep: true });

  async function loadItems() {
    isLoading.value = true;
    try {
      const inventories = await getAllItemsInventories();
      itemFormData.value = { ...inventories };
    } catch (error) {
      console.error('Error retrieving items from IndexedDB:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function saveItems() {
    await saveItemsInventory(itemFormData.value);

    // Update the in-memory cache so autoFillGifts gets current values
    const cache = getAllItemsFromCache();
    for (const [id, item] of Object.entries(cache)) {
      const numericId = Number(id);
      if (itemFormData.value[numericId] !== undefined) {
        updateItemInCache(numericId, {
          ...item,
          QuantityOwned: itemFormData.value[numericId] || 0
        } as CachedResource);
      }
    }
  }

  return {
    itemFormData,
    handleItemInput,
    loadItems
  };
}
