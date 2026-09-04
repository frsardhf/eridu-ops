import { ref } from 'vue';
import type { InventoryLayout } from '@/types/resource';
import { getSettings, updateSetting } from '../utils/settingsStorage';

const inventoryLayout = ref<InventoryLayout>(getSettings().inventoryLayout);

/** Reactive preference for the global inventory's paged or continuous layout. */
export function useInventoryLayout() {
  inventoryLayout.value = getSettings().inventoryLayout;

  function setInventoryLayout(layout: InventoryLayout) {
    inventoryLayout.value = layout;
    updateSetting('inventoryLayout', layout);
  }

  return { inventoryLayout, setInventoryLayout };
}
