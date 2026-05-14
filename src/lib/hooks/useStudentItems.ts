import { ref } from 'vue';
import { saveItemsInventory } from '../utils/studentStorage';
import { getAllItemsInventories } from '../services/dbService';
import { getAllItemsFromCache, updateItemInCache } from '../stores/resourceCacheStore';
import type { CachedResource } from '../../types/resource';
import { useDebouncedFormPersistence } from './useDebouncedFormPersistence';

export function useStudentItems(props: {
  isVisible?: boolean
}) {
  const itemFormData = ref<Record<string, number>>({});

  function handleItemInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    itemFormData.value[id] = value;
  }

  const { loadNow: loadItems } = useDebouncedFormPersistence({
    isVisible:    () => props.isVisible,
    refs:         { itemFormData },
    defaults:     { itemFormData: {} as Record<string, number> },
    loadFn:       async (staged) => {
      const inventories = await getAllItemsInventories();
      staged.itemFormData.value = { ...inventories };
    },
    saveFn:       async () => {
      await saveItemsInventory(itemFormData.value);

      // Sync the in-memory cache so gift-auto-fill and leftover calculations
      // see current quantities without waiting for a full reload.
      const cache = getAllItemsFromCache();
      for (const [id, item] of Object.entries(cache)) {
        const numericId = Number(id);
        if (itemFormData.value[numericId] !== undefined) {
          updateItemInCache(numericId, {
            ...item,
            QuantityOwned: itemFormData.value[numericId] || 0,
          } as CachedResource);
        }
      }
      return null;
    },
    watchSources: [itemFormData],
  });

  return {
    itemFormData,
    handleItemInput,
    loadItems,
  };
}
