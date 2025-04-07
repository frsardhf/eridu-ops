import { computed, ref } from 'vue';
import { getDataCollection, getResources } from '../utils/studentStorage';
import { StudentProps } from '../../types/student';
import { SECRET_TECH_NOTE_ID, WORKBOOK_ID, CREDITS_ID } from '../../types/upgrade';
import dataTable from '../../data/data.json';

interface MaterialSummary {
  material: Record<string, any> | null;
  materialQuantity: number;
  owned: number;
  remaining: number;
}

interface StudentMaterialUsage {
  student: StudentProps;
  quantity: number;
  upgradeType: 'skill' | 'potential' | 'level';
}

export function useResourceCalculation() {
  // Track student-specific material usage
  const materialUsageByStudents = new Map<number, StudentMaterialUsage[]>();

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
    let totalCredits = 0;
    
    // Reset material usage tracking
    materialUsageByStudents.clear();
    
    // Get resources to find exp items info and track remaining quantities
    const resources = getResources() || {};
    const availableExpReports = new Map<number, number>();
    
    // Initialize available exp reports (IDs: 10, 11, 12, 13)
    [10, 11, 12, 13].forEach(id => {
      const resource = resources[id.toString()];
      availableExpReports.set(id, resource?.QuantityOwned || 0);
    });
    
    // First pass: Process all skill and potential upgrades
    studentsWithUpgrades.forEach(({ student, upgrade }) => {
      // Skip if no skill or potential data
      if (!upgrade.skillLevels || !upgrade.potentialLevels) return;
      
      // Process skill materials and track credits
      const skillCredits = processSkillMaterials(student, upgrade.skillLevels, materialMap);
      totalCredits += skillCredits;
      
      // Process potential materials and track credits
      const potentialCredits = processPotentialMaterials(student, upgrade.potentialLevels, materialMap);
      totalCredits += potentialCredits;
    });
    
    // Second pass: Process character level upgrades with shared exp report pool
    studentsWithUpgrades.forEach(({ student, upgrade }) => {
      if (upgrade.currentCharacterLevel && upgrade.targetCharacterLevel && 
          upgrade.currentCharacterLevel < upgrade.targetCharacterLevel) {
        // Process exp materials with the shared pool of available reports
        processExpMaterialsWithSharedPool(
          upgrade, 
          materialMap, 
          availableExpReports,
          student
        );
      }
    });
    
    // Add skill and potential credits as a special material if needed
    if (totalCredits > 0) {
      // Get resources to find credits info
      const creditsResource = resources[CREDITS_ID.toString()] || {
        Id: CREDITS_ID,
        Name: 'Credits',
        Icon: 'currency_icon_gold',
        Description: 'In-game currency used for various upgrades'
      };
      
      // Check if the credit entry already exists in the map (added by processExpMaterials)
      if (materialMap.has(CREDITS_ID)) {
        // Update the existing entry with the additional credits
        const existingEntry = materialMap.get(CREDITS_ID)!;
        existingEntry.materialQuantity += totalCredits;
        existingEntry.remaining = existingEntry.owned - existingEntry.materialQuantity;
      } else {
        // Create a new entry if it doesn't exist
        materialMap.set(CREDITS_ID, {
          material: creditsResource,
          materialQuantity: totalCredits,
          owned: creditsResource.QuantityOwned || 0,
          remaining: (creditsResource.QuantityOwned || 0) - totalCredits
        });
      }
    }
    
    // Convert map to array and sort by ID with credits first
    return Array.from(materialMap.values())
      .sort((a, b) => {
        // Put credits first
        if (a.material?.Id === CREDITS_ID) return -1;
        if (b.material?.Id === CREDITS_ID) return 1;
        // Then sort by ID
        return (a.material?.Id || 0) - (b.material?.Id || 0);
      });
  };

  // Process skill materials from a student
  const processSkillMaterials = (
    student: StudentProps,
    skillLevels: Record<string, { current: number; target: number }>,
    materialMap: Map<number, MaterialSummary>
  ): number => {
    // Track total credits needed for all skill upgrades
    let totalCredits = 0;
    
    // Get credit tables from data
    const exskillCreditsTable = dataTable.exskill_credits || [];
    const skillCreditsTable = dataTable.skill_credits || [];
    
    // Process each skill type
    Object.entries(skillLevels).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      // Skip if no upgrade needed
      if (current >= target) return;
      
      // Get material IDs and quantities
      let materialIds: number[][] | null = null;
      let materialQuantities: number[][] | null = null;
      let creditsTable: number[] | null = null;
      
      if (type === 'Ex') {
        materialIds = student.SkillExMaterial ?? null;
        materialQuantities = student.SkillExMaterialAmount ?? null;
        creditsTable = exskillCreditsTable;
      } else {
        materialIds = student.SkillMaterial ?? null;
        materialQuantities = student.SkillMaterialAmount ?? null;
        creditsTable = skillCreditsTable;
      }
      
      if (!materialIds || !materialQuantities) return;
      
      // Calculate for each level upgrade
      for (let level = current; level < target; level++) {
        // Special case for level 9 to 10 upgrade for non-Ex skills
        if (level === 9 && type !== 'Ex') {
          // Add the secret technical note for level 10
          updateMaterialMap(SECRET_TECH_NOTE_ID, 1, materialMap);
          
          // Track student usage for this material
          trackMaterialUsage(student, SECRET_TECH_NOTE_ID, 1, 'skill');
          
          // Add special credits cost for level 10 upgrade (fixed amount)
          totalCredits += 4000000; // 4M credits for level 10 upgrade
          
          // Track student usage for credits
          trackMaterialUsage(student, CREDITS_ID, 4000000, 'skill');
        }
        
        // Get materials for this level - only if within bounds of the array
        if (level - 1 < materialIds.length) {
          const levelMaterialIds = materialIds[level-1];
          const levelMaterialQuantities = materialQuantities[level-1];
          
          if (levelMaterialIds && levelMaterialQuantities) {
            // Process each material
            for (let i = 0; i < levelMaterialIds.length; i++) {
              const materialId = levelMaterialIds[i];
              const quantity = levelMaterialQuantities[i];
              
              if (!materialId || !quantity) continue;
              
              // Add to material map
              updateMaterialMap(materialId, quantity, materialMap);
              
              // Track student usage for this material
              trackMaterialUsage(student, materialId, quantity, 'skill');
            }
          }
        }
        
        // Add credits for this level - only if within bounds of the credits table
        if (creditsTable && level - 1 < creditsTable.length) {
          const levelCreditsCost = creditsTable[level-1] || 0;
          totalCredits += levelCreditsCost;
          
          // Track student usage for credits
          trackMaterialUsage(student, CREDITS_ID, levelCreditsCost, 'skill');
        }
      }
    });
    
    return totalCredits;
  };

  // Process potential materials from a student
  const processPotentialMaterials = (
    student: StudentProps,
    potentialLevels: Record<string, { current: number; target: number }>,
    materialMap: Map<number, MaterialSummary>
  ): number => {
    // Use the imported data table
    const potentialMaterials = dataTable.potential;
    let totalCredits = 0;
    
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
        let [workbookQuantity, materialQuality, materialQuantity, creditsQuantity = 0] = blockData;
        
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
        if (creditsQuantity) {
          creditsQuantity = Math.ceil(creditsQuantity * levelsInBlock);
          totalCredits += creditsQuantity;
          
          // Track student usage for credits
          trackMaterialUsage(student, CREDITS_ID, creditsQuantity, 'potential');
        }
        
        // Add to material map
        updateMaterialMap(materialId, materialQuantity, materialMap);
        updateMaterialMap(workbookId, workbookQuantity, materialMap);
        
        // Track student usage for these materials
        trackMaterialUsage(student, materialId, materialQuantity, 'potential');
        trackMaterialUsage(student, workbookId, workbookQuantity, 'potential');
      }
    });
    
    return totalCredits;
  };

  // Process exp materials with shared pool of available reports
  const processExpMaterialsWithSharedPool = (
    upgrade: any,
    materialMap: Map<number, MaterialSummary>,
    availableExpReports: Map<number, number>,
    student: StudentProps
  ): number => {
    // Get all resources to access exp items
    const resources = getResources() || {};
    
    // Get the character XP table and character credit costs from data
    const characterXpTable = dataTable.character_xp || [];
    const characterXpCreditsTable = dataTable.character_credits || [];
    
    // Calculate total XP needed
    const currentLevel = upgrade.currentCharacterLevel;
    const targetLevel = upgrade.targetCharacterLevel;
    
    if (!characterXpTable.length || currentLevel >= targetLevel) return 0;
    
    // Calculate total XP needed
    const currentXp = characterXpTable[currentLevel - 1] || 0;
    const targetXp = characterXpTable[targetLevel - 1] || 0;
    const totalXpNeeded = Math.max(0, targetXp - currentXp);
    
    if (totalXpNeeded <= 0) return 0;
    
    // Calculate credits needed (using cumulative credits table)
    let totalCreditCost = 0;
    if (characterXpCreditsTable.length > 0) {
      const currentLevelCreditCost = currentLevel > 0 ? 
        characterXpCreditsTable[currentLevel - 1] : 0;
      const targetLevelCreditCost = targetLevel > 0 ? 
        characterXpCreditsTable[targetLevel - 1] : 0;
        
      totalCreditCost = targetLevelCreditCost - currentLevelCreditCost;
      
      if (totalCreditCost > 0) {
        // Add credits cost to material map
        updateMaterialMap(CREDITS_ID, totalCreditCost, materialMap);
        
        // Track student usage for credits
        if (student) {
          trackMaterialUsage(student, CREDITS_ID, totalCreditCost, 'level');
        }
      }
    }
    
    // Calculate exp reports needed
    let remainingXpNeeded = totalXpNeeded;
    
    // Create an array of exp items in descending order of exp value
    const expItems = [
      { id: 13, value: resources['13']?.ExpValue || 0 }, // Superior
      { id: 12, value: resources['12']?.ExpValue || 0 }, // Advanced
      { id: 11, value: resources['11']?.ExpValue || 0 }, // Normal
      { id: 10, value: resources['10']?.ExpValue || 0 }  // Novice
    ].filter(item => item.value > 0);
    
    // Calculate how many of each report we need based on available reports
    expItems.forEach(item => {
      if (remainingXpNeeded <= 0) return;
      
      const expValue = item.value;
      const available = availableExpReports.get(item.id) || 0;
      
      if (available > 0) {
        // Calculate how many of this report we need
        const neededCount = Math.ceil(remainingXpNeeded / expValue);
        const useCount = Math.min(available, neededCount);
        
        if (useCount > 0) {
          // Add to material map
          updateMaterialMap(item.id, useCount, materialMap);
          
          // Track student usage for this exp report
          if (student) {
            trackMaterialUsage(student, item.id, useCount, 'level');
          }
          
          // Update available quantity
          availableExpReports.set(item.id, available - useCount);
          
          // Update remaining XP needed
          remainingXpNeeded -= useCount * expValue;
        }
      }
    });
    
    // If we still need more XP, add additional reports (beyond what's available)
    if (remainingXpNeeded > 0) {
      for (const item of expItems) {
        if (remainingXpNeeded <= 0) break;
        
        const expValue = item.value;
        // How many more of this report do we need
        const additionalCount = Math.floor(remainingXpNeeded / expValue);
        
        if (additionalCount > 0) {
          // Check if material is already in the map
          const existing = materialMap.get(item.id);
          if (existing) {
            existing.materialQuantity += additionalCount;
            existing.remaining = existing.owned - existing.materialQuantity;
          } else {
            // Add to material map
            updateMaterialMap(item.id, additionalCount, materialMap);
          }
          
          // Track student usage for this exp report
          if (student) {
            trackMaterialUsage(student, item.id, additionalCount, 'level');
          }
          
          // Update remaining XP needed
          remainingXpNeeded -= additionalCount * expValue;
        }
      }
      
      // Handle any remaining XP with the smallest report (round up)
      if (remainingXpNeeded > 0 && expItems.length > 0) {
        const smallestExp = expItems[expItems.length - 1];
        
        // Check if material is already in the map
        const existing = materialMap.get(smallestExp.id);
        if (existing) {
          existing.materialQuantity += 1;
          existing.remaining = existing.owned - existing.materialQuantity;
        } else {
          // Add to material map
          updateMaterialMap(smallestExp.id, 1, materialMap);
        }
        
        // Track student usage for this exp report
        if (student) {
          trackMaterialUsage(student, smallestExp.id, 1, 'level');
        }
      }
    }
    
    return totalCreditCost;
  };

  // Helper to track which students use which materials and in what quantities
  const trackMaterialUsage = (
    student: StudentProps,
    materialId: number,
    quantity: number,
    upgradeType: 'skill' | 'potential' | 'level'
  ) => {
    if (!materialUsageByStudents.has(materialId)) {
      materialUsageByStudents.set(materialId, []);
    }
    
    const usageList = materialUsageByStudents.get(materialId)!;
    
    // Check if this student already has an entry for this material
    const existingEntry = usageList.find(entry => entry.student.Id === student.Id);
    
    if (existingEntry) {
      // Update the existing entry
      existingEntry.quantity += quantity;
    } else {
      // Add a new entry
      usageList.push({
        student,
        quantity,
        upgradeType
      });
    }
  };

  // Get the list of students using a specific material
  const getMaterialUsageByStudents = (materialId: number): StudentMaterialUsage[] => {
    return materialUsageByStudents.get(materialId) || [];
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
    refreshData,
    getMaterialUsageByStudents
  };
} 