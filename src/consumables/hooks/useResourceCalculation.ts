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
    let totalCredits = 0;
    
    studentsWithUpgrades.forEach(({ student, upgrade }) => {
      // Skip if no skill or potential data
      if (!upgrade.skillLevels || !upgrade.potentialLevels) return;
      
      // Process skill materials and track credits
      const skillCredits = processSkillMaterials(student, upgrade.skillLevels, materialMap);
      totalCredits += skillCredits;
      
      // Process potential materials and track credits
      const potentialCredits = processPotentialMaterials(student, upgrade.potentialLevels, materialMap);
      totalCredits += potentialCredits;
      
      // Process exp materials if character level needs to be upgraded
      if (upgrade.currentCharacterLevel && upgrade.targetCharacterLevel && 
          upgrade.currentCharacterLevel < upgrade.targetCharacterLevel) {
        // The credits from exp materials are added directly to the materialMap by processExpMaterials
        // We don't need to add them to totalCredits here since they're already in the map
        processExpMaterials(upgrade, materialMap);
      }
    });
    
    // Add skill and potential credits as a special material if needed
    if (totalCredits > 0) {
      // Get resources to find credits info
      const resources = getResources() || {};
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
        // This needs to be handled first in case the material arrays don't have data for level 9
        if (level === 9 && type !== 'Ex') {
          // Add the secret technical note for level 10
          updateMaterialMap(SECRET_TECH_NOTE_ID, 1, materialMap);
          
          // Add special credits cost for level 10 upgrade (fixed amount)
          totalCredits += 4000000; // 4M credits for level 10 upgrade
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
            }
          }
        }
        
        // Add credits for this level - only if within bounds of the credits table
        if (creditsTable && level - 1 < creditsTable.length) {
          const levelCreditsCost = creditsTable[level-1] || 0;
          totalCredits += levelCreditsCost;
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
        }
        
        // Add to material map
        updateMaterialMap(materialId, materialQuantity, materialMap);
        updateMaterialMap(workbookId, workbookQuantity, materialMap);
      }
    });
    
    return totalCredits;
  };

  // Process exp materials needed for character level upgrades
  const processExpMaterials = (
    upgrade: any,
    materialMap: Map<number, MaterialSummary>
  ): number => {
    // Exp item IDs
    const expItemIds = [10, 11, 12, 13]; // Novice, Normal, Advanced, Superior
    
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
        // Get credits resource
        const resources = getResources() || {};
        const creditsResource = resources[CREDITS_ID.toString()];
        
        // Add credits cost to material map
        updateMaterialMap(CREDITS_ID, totalCreditCost, materialMap);
      }
    }
    
    // Calculate exp reports needed
    let remainingXpNeeded = totalXpNeeded;
    
    // Create an array of exp items in descending order of exp value
    const expItems = expItemIds
      .map(id => resources[id.toString()])
      .filter(item => item && item.ExpValue)
      .sort((a, b) => (b.ExpValue || 0) - (a.ExpValue || 0));
    
    // First use reports that the user already owns
    expItems.forEach(item => {
      if (!item || !item.ExpValue || remainingXpNeeded <= 0) return;
      
      const expValue = item.ExpValue;
      const quantityOwned = item.QuantityOwned || 0;
      
      if (quantityOwned > 0) {
        // Calculate how many of the owned reports we need to use
        const ownedUsage = Math.min(quantityOwned, Math.ceil(remainingXpNeeded / expValue));
        
        // Add to material map
        if (ownedUsage > 0) {
          updateMaterialMap(item.Id, ownedUsage, materialMap);
          remainingXpNeeded -= ownedUsage * expValue;
        }
      }
    });
    
    // If we still need more XP, calculate additional reports needed
    if (remainingXpNeeded > 0) {
      expItems.forEach(item => {
        if (!item || !item.ExpValue || remainingXpNeeded <= 0) return;
        
        const expValue = item.ExpValue;
        const additionalCount = Math.floor(remainingXpNeeded / expValue);
        
        if (additionalCount > 0) {
          updateMaterialMap(item.Id, additionalCount, materialMap);
          remainingXpNeeded -= additionalCount * expValue;
        }
      });
      
      // Handle any remaining XP with the smallest report
      if (remainingXpNeeded > 0 && expItems.length > 0) {
        const smallestExp = expItems[expItems.length - 1];
        if (smallestExp && smallestExp.ExpValue) {
          updateMaterialMap(smallestExp.Id, 1, materialMap);
        }
      }
    }
    
    // Return the total credits needed for this level upgrade
    return totalCreditCost;
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