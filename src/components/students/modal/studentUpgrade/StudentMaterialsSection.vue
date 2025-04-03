<script setup lang="ts">
import { computed } from 'vue';
import '../../../../styles/resourceDisplay.css'; 

// Define interfaces for material items
interface BaseMaterial {
  material: Record<string, any> | null;
  credits?: Record<string, any> | null;
  materialQuantity: number;
  creditsQuantity?: number;
}

interface SkillMaterial extends BaseMaterial {
  level?: number;
  potentialType: string;
}

interface PotentialMaterial extends BaseMaterial {
  workbook?: Record<string, any> | null;
  workbookQuantity?: number;
  levelsInBlock?: number;
  blockStart?: number;
  blockEnd?: number;
  potentialType: string;
}

const props = defineProps<{
  skillMaterials: SkillMaterial[];
  potentialMaterials: PotentialMaterial[];
}>();

// Function to format quantity with 'k' for large numbers
const formatQuantity = (quantity: number): string => {
  if (!quantity || quantity <= 0) return '';
  
  // Format large numbers with 'k' suffix
  if (quantity >= 1000000) {
    return `×${Math.floor(quantity / 1000000)}M`;
  } else if (quantity >= 10000) {
    return `×${Math.floor(quantity / 1000)}K`;
  } 
  
  // Keep normal display for smaller numbers
  return `×${quantity}`;
};

// Calculate cumulative materials needed by combining both types
const cumulativeMaterials = computed(() => {
  if (!props.skillMaterials.length && !props.potentialMaterials.length) return [];

  // Group materials by ID
  const materialMap = new Map();
  
  // Process skill materials
  props.skillMaterials.forEach(item => {
    const materialId = item.material?.Id;
    // Skip if material is invalid
    if (!materialId) return;
    
    // If this material type already exists in the map, update quantities
    if (materialMap.has(materialId)) {
      const existingEntry = materialMap.get(materialId);
      existingEntry.materialQuantity += item.materialQuantity;
    } else {
      // Create a new entry for this material type
      materialMap.set(materialId, {
        material: item.material,
        materialQuantity: item.materialQuantity
      });
    }
  });
  
  // Track total credits needed
  let totalCredits = 0;
  
  // Process potential materials
  props.potentialMaterials.forEach(item => {
    // Process regular material
    const materialId = item.material?.Id;
    if (materialId) {
      if (materialMap.has(materialId)) {
        const existingEntry = materialMap.get(materialId);
        existingEntry.materialQuantity += item.materialQuantity;
      } else {
        materialMap.set(materialId, {
          material: item.material,
          materialQuantity: item.materialQuantity,
        });
      }
    }

    // Process workbook
    const workbookId = item.workbook?.Id;
    if (workbookId) {
      if (materialMap.has(workbookId)) {
        const existingEntry = materialMap.get(workbookId);
        existingEntry.materialQuantity += item.workbookQuantity || 0;
      } else {
        materialMap.set(workbookId, {
          material: item.workbook,
          materialQuantity: item.workbookQuantity || 0
        });
      }
    }
    
    // Process credits
    const creditsId = item.credits?.Id;
    if (creditsId) {
      if (materialMap.has(creditsId)) {
        const existingEntry = materialMap.get(creditsId);
        existingEntry.materialQuantity += item.creditsQuantity || 0;
      } else {
        materialMap.set(creditsId, {
          material: item.credits,
          materialQuantity: item.creditsQuantity || 0
        });
      }
    }
  });
  
  // Convert map to array and sort by material ID
  return Array.from(materialMap.values())
    .sort((a, b) => (a.material?.Id || 0) - (b.material?.Id || 0));
});

// Determine if any upgrades are active (materials needed)
const hasMaterials = computed(() => {
  return cumulativeMaterials.value.length > 0;
});
</script>

<template>
  <div class="materials-section">
    <h3 class="section-title">Total Materials Needed</h3>
    
    <!-- No materials message -->
    <div v-if="!hasMaterials" class="no-materials">
      No materials needed (target levels must be higher than current levels)
    </div>
    
    <div v-else class="materials-content">
      <div class="resources-grid">
        <div 
          v-for="(item, index) in cumulativeMaterials" 
          :key="index"
          class="resource-item" 
          :title="item.material?.Name || 'Material'"
        >
          <div class="resource-content">
            <img 
              v-if="item.material?.Icon"
              :src="`https://schaledb.com/images/item/icon/${item.material.Icon}.webp`" 
              :alt="item.material?.Name || 'Material'"
              class="resource-icon"
            />
            <div class="resource-quantity">
              {{ formatQuantity(item.materialQuantity) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Only keep component-specific styles */
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
  margin-bottom: 15px;
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