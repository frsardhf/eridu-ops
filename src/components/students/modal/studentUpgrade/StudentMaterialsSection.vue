<script setup lang="ts">
import { computed, onMounted } from 'vue';
import '../../../../styles/resourceDisplay.css';
import { useResourceCalculation } from '../../../../consumables/hooks/useResourceCalculation';
import { Material } from '../../../../types/upgrade';

const props = defineProps<{
  skillMaterials: Material[];
  potentialMaterials: Material[];
  expMaterials?: Material[];
  student?: Record<string, any> | null;
}>();

// Import the useResourceCalculation hook to get consistent data
const { refreshData } = useResourceCalculation();

// Refresh data when component mounts
onMounted(() => {
  refreshData();
});

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

// Function to check if a material is an exp report
const isExpReport = (materialId: number | undefined): boolean => {
  if (!materialId) return false;
  // Exp reports are IDs 10, 11, 12, 13
  return [10, 11, 12, 13].includes(materialId);
};

// Get exp materials and credits directly from props (already synchronized with resource calculation)
const studentExpMaterials = computed(() => {
  const result: Material[] = [];
  
  // Process exp materials from props (these are specific to this student)
  if (props.expMaterials && props.expMaterials.length > 0) {
    for (const item of props.expMaterials) {
      if (!item.material?.Id) continue;
      
      const materialId = item.material.Id;
      
      // Include exp reports and credits
      if (materialId === 5 || isExpReport(materialId)) {
        result.push({
          material: item.material,
          materialQuantity: item.materialQuantity,
          type: 'level'
        });
      }
    }
  }
  
  return result;
});

// Calculate cumulative materials needed by combining both types
const cumulativeMaterials = computed(() => {
  if (!props.skillMaterials.length && !props.potentialMaterials.length && 
    studentExpMaterials.value.length === 0) return [];

  // Group materials by ID
  const materialMap = new Map();
  
  // Process skill materials
  props.skillMaterials.forEach(item => {
    const materialId = item.material?.Id;
    // Skip if material is invalid
    if (!materialId) return;
    
    // Skip exp reports and credits as we'll handle them separately
    if (isExpReport(materialId) || materialId === 5) return;
    
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
  
  // Process potential materials
  props.potentialMaterials.forEach(item => {
    // Process regular material
    const materialId = item.material?.Id;
    if (materialId) {
      // Skip exp reports and credits as we'll handle them separately
      if (isExpReport(materialId) || materialId === 5) return;
      
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
  });

  // Use consistent exp materials and credits from the student exp materials
  studentExpMaterials.value.forEach(item => {
    const materialId = item.material?.Id;
    if (!materialId) return;

    materialMap.set(materialId, {
      material: item.material,
      materialQuantity: item.materialQuantity
    });
  });
  
  // Convert map to array and sort by material ID
  return Array.from(materialMap.values())
    .sort((a, b) => {
      const aId = a.material?.Id || 0;
      const bId = b.material?.Id || 0;
      
      // Always put credits (ID: 5) first
      if (aId === 5) return -1;
      if (bId === 5) return 1;
      
      // Put exp reports next (IDs: 10, 11, 12, 13)
      const isExpReportA = isExpReport(aId);
      const isExpReportB = isExpReport(bId);
      
      if (isExpReportA && !isExpReportB) return -1;
      if (!isExpReportA && isExpReportB) return 1;
      
      // For all other materials, sort by ID
      return aId - bId;
    });
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
          :class="{ 'exp-report': isExpReport(item.material?.Id) }"
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

.exp-report {
  position: relative;
}

.exp-report::after {
  content: 'XP';
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 0.6em;
  background-color: rgba(var(--accent-color-rgb, 100, 108, 255), 0.7);
  color: white;
  padding: 1px 3px;
  border-radius: 3px;
  pointer-events: none;
}
</style> 