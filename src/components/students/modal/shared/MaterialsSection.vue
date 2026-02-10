<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '../../../../locales';
import {
  formatLargeNumber,
  getMaterialIconSrc,
  buildMaterialMap,
  sortMaterials
} from '../../../../consumables/utils/materialUtils';
import { Material } from '../../../../types/upgrade';
import '../../../../styles/resourceDisplay.css';

const props = defineProps<{
  materials: Material[];
  isEquipmentTab?: boolean;
}>();

const cumulativeMaterials = computed(() => {
  if (!props.materials.length) return [];
  return Array.from(buildMaterialMap(props.materials).values()).sort(sortMaterials);
});

const hasMaterials = computed(() => {
  return cumulativeMaterials.value.length > 0;
});
</script>

<template>
  <div class="materials-section">
    <h3 class="section-title">{{ $t('totalMaterialsNeeded') }}</h3>

    <div v-if="!hasMaterials" class="no-materials">
      {{ $t('noMaterialsNeeded') }}
    </div>

    <div v-else class="materials-content">
      <div class="resources-grid">
        <div
          v-for="(item, index) in cumulativeMaterials"
          :key="index"
          class="resource-item"
          :title="item.material?.Name || $t('material')"
        >
          <div class="resource-content">
            <img
              v-if="item.material?.Icon"
              :src="getMaterialIconSrc(item, props.isEquipmentTab)"
              :alt="item.material?.Name || $t('material')"
              class="resource-icon"
            />
            <div class="resource-quantity">
              {{ formatLargeNumber(item.materialQuantity) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.materials-section {
  background: var(--card-background);
  border-radius: 8px;
  padding: 15px;
  border: 1px solid var(--border-color);
  margin-bottom: 15px;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  padding-bottom: 5px;
  border-bottom: 1px solid var(--border-color);
}

.no-materials {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.materials-content {
  background: var(--background-primary);
  border-radius: 8px;
  padding: 10px;
}
</style>
