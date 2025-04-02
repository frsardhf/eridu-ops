import { computed, ref } from 'vue';
import { getDataCollection, getResources } from '../utils/studentStorage';
import { StudentProps } from '../../types/student';
import { SECRET_TECH_NOTE_ID, WORKBOOK_ID } from '../../types/upgrade';
import dataTable from '../../data/data.json';

interface MaterialSummary {
  material: Record<string, any> | null;
  materialQuantity: number;
  owned: number;
  remaining: number;
}

export function useResourceCalculation() {
  // Get all students with their upgrade data
  const getAllStudentsWithUpgrades = () => {
    const studentsData = getDataCollection('students') as Record<string, StudentProps>;
    const formsData = getDataCollection('forms');
    
    // Filter out students that don't have upgrade data
    return Object.values(studentsData).filter(student => {
      return formsData[student.Id];
    }).map(student => {
      return {
        student,
        upgrade: formsData[student.Id]
      };
    });
  };

  // Calculate all materials needed for all students
  const calculateTotalMaterialsNeeded = () => {
    const studentsWithUpgrades = getAllStudentsWithUpgrades();
    const materialMap = new Map<number, MaterialSummary>();
    
    studentsWithUpgrades.forEach(({ student, upgrade }) => {
      // Skip if no skill or potential data
      if (!upgrade.skillLevels || !upgrade.potentialLevels) return;
      
      // Process skill materials
      processSkillMaterials(student, upgrade.skillLevels, materialMap);
      
      // Process potential materials
      processPotentialMaterials(student, upgrade.potentialLevels, materialMap);
    });
    
    // Convert map to array and sort by ID
    return Array.from(materialMap.values())
      .sort((a, b) => (a.material?.Id || 0) - (b.material?.Id || 0));
  };

  // Process skill materials from a student
  const processSkillMaterials = (
    student: StudentProps,
    skillLevels: Record<string, { current: number; target: number }>,
    materialMap: Map<number, MaterialSummary>
  ) => {
    // Process each skill type
    Object.entries(skillLevels).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      // Skip if no upgrade needed
      if (current >= target) return;
      
      // Get material IDs and quantities
      let materialIds: number[][] | null = null;
      let materialQuantities: number[][] | null = null;
      
      if (type === 'Ex') {
        materialIds = student.SkillExMaterial ?? null;
        materialQuantities = student.SkillExMaterialAmount ?? null;
      } else {
        materialIds = student.SkillMaterial ?? null;
        materialQuantities = student.SkillMaterialAmount ?? null;
      }
      
      if (!materialIds || !materialQuantities) return;
      
      // Calculate for each level upgrade
      for (let level = current; level < target; level++) {
        // Get materials for this level
        const levelMaterialIds = materialIds[level-1];
        const levelMaterialQuantities = materialQuantities[level-1];
        
        if (!levelMaterialIds || !levelMaterialQuantities) continue;
        
        // Process each material
        for (let i = 0; i < levelMaterialIds.length; i++) {
          const materialId = levelMaterialIds[i];
          const quantity = levelMaterialQuantities[i];
          
          if (!materialId || !quantity) continue;
          
          // Add to material map
          updateMaterialMap(materialId, quantity, materialMap);
        }
        
        // Special case: Add SECRET_TECH_NOTE for level 9 to 10 for non-Ex skills
        if (level === 9 && type !== 'Ex') {
          updateMaterialMap(SECRET_TECH_NOTE_ID, 1, materialMap);
        }
      }
    });
  };

  // Process potential materials from a student
  const processPotentialMaterials = (
    student: StudentProps,
    potentialLevels: Record<string, { current: number; target: number }>,
    materialMap: Map<number, MaterialSummary>
  ) => {
    // Use the imported data table
    const potentialMaterials = dataTable.potential;
    
    // Process each potential type
    Object.entries(potentialLevels).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      // Skip if no upgrade needed
      if (current >= target) return;
      
      const startBlock = Math.floor(current / 5);
      const endBlock = Math.floor((target - 1) / 5);
      
      for (let block = startBlock; block <= endBlock; block++) {
        if (block >= potentialMaterials.length) break;
        
        const blockData = potentialMaterials[block];
        if (!blockData) continue;
        
        // Calculate levels in this block
        let levelsInBlock = 5;
        
        // Handle first block
        if (block === startBlock) {
          const levelStart = current % 5;
          levelsInBlock = 5 - levelStart;
        }
        
        // Handle last block
        if (block === endBlock) {
          const remainder = target % 5;
          if (remainder > 0) {
            levelsInBlock = remainder;
          }
        }
        
        // Calculate materials
        let materialId: number;
        let [workbookQuantity, materialQuality, materialQuantity] = blockData;
        
        // Determine workbook ID - using imported constants
        let workbookId = WORKBOOK_ID[1]; // Default to attack
        if (type === 'maxhp') workbookId = WORKBOOK_ID[0];
        if (type === 'healpower') workbookId = WORKBOOK_ID[2];
        
        // Determine material ID
        if (materialQuality === 1) {
          materialId = student.PotentialMaterial || 0;
        } else {
          materialId = (student.PotentialMaterial || 0) + 1;
        }
        
        // Scale quantities by levels
        materialQuantity = Math.ceil(materialQuantity * levelsInBlock);
        workbookQuantity = Math.ceil(workbookQuantity * levelsInBlock);
        
        // Add to material map
        updateMaterialMap(materialId, materialQuantity, materialMap);
        updateMaterialMap(workbookId, workbookQuantity, materialMap);
      }
    });
  };

  // Helper to update material map with new quantities
  const updateMaterialMap = (
    materialId: number,
    quantity: number,
    materialMap: Map<number, MaterialSummary>
  ) => {
    // Get all resources to find material info
    const resources = getResources() || {};
    // Convert materialId to string when accessing the resources object
    const material = resources[materialId.toString()];
    
    if (materialMap.has(materialId)) {
      // Update existing entry
      const existingEntry = materialMap.get(materialId)!;
      existingEntry.materialQuantity += quantity;
      existingEntry.remaining = existingEntry.owned - existingEntry.materialQuantity;
    } else {
      // Create new entry
      materialMap.set(materialId, {
        material: material || { 
          Id: materialId, 
          Name: `Unknown (${materialId})`, 
          Icon: materialId.toString()
        },
        materialQuantity: quantity,
        owned: material?.QuantityOwned || 0,
        remaining: (material?.QuantityOwned || 0) - quantity
      });
    }
  };

  // Resources owned by the user
  const ownedResources = computed(() => {
    const resources = getResources() || {};
    return Object.entries(resources)
      .map(([id, resource]) => resource)
      .filter(resource => resource && resource.Id !== undefined)
      .sort((a, b) => (a.Id || 0) - (b.Id || 0));
  });

  // Total materials needed across all students
  const totalMaterialsNeeded = computed(() => {
    return calculateTotalMaterialsNeeded();
  });

  // Materials leftover after subtracting needed from owned
  const materialsLeftover = computed(() => {
    const neededMap = new Map(
      totalMaterialsNeeded.value.map(item => [item.material?.Id, item])
    );
    
    // Create a list of all unique materials (both owned and needed)
    const allMaterialIds = new Set([
      ...ownedResources.value.map(resource => resource.Id),
      ...Array.from(neededMap.keys())
    ]);
    
    // Calculate leftover for each material
    const leftoverList = Array.from(allMaterialIds).map(id => {
      // Convert id to string when looking up in resources
      const resources = getResources() || {};
      const resource = resources[id.toString()] || ownedResources.value.find(r => r.Id === id) || null;
      const needed = neededMap.get(id);
      
      const owned = resource?.QuantityOwned || 0;
      const neededQuantity = needed?.materialQuantity || 0;
      const remaining = owned - neededQuantity;
      
      return {
        material: resource || needed?.material || { 
          Id: id, 
          Name: `Unknown (${id})`,
          Icon: id.toString() 
        },
        owned,
        materialQuantity: neededQuantity,
        remaining
      };
    }).sort((a, b) => (a.material?.Id || 0) - (b.material?.Id || 0));
    
    return leftoverList;
  });

  // Refresh data (can be called when students or resources are updated)
  const refreshData = () => {
    // This will trigger recomputation of all computed properties
    const dummy = ref(Date.now());
    dummy.value = Date.now();
  };

  return {
    ownedResources,
    totalMaterialsNeeded,
    materialsLeftover,
    refreshData
  };
} 