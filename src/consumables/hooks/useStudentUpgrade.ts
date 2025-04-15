import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import {
  Material,
  SkillType,
  SkillLevels,
  PotentialType,
  PotentialLevels,
  CREDITS_ID,
  EXP_REPORT_ID,
  WORKBOOK_ID,
  SECRET_TECH_NOTE_ID,
  DEFAULT_SKILL_LEVELS,
  DEFAULT_POTENTIAL_LEVELS
} from '../../types/upgrade';
import { 
  getResourceDataById, 
  loadFormDataToRefs, 
  saveFormData,
  getResources
} from '../utils/studentStorage';
import dataTable from '../../data/data.json';
import { updateMaterialsData } from '../stores/resourceStore';
import { updateStudentData } from '../stores/studentStore';

export function useStudentUpgrade(props: {
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {

  const currentCharacterLevel = ref(1);
  const targetCharacterLevel = ref(1);
  const skillLevels = ref<SkillLevels>({...DEFAULT_SKILL_LEVELS});
  const potentialLevels = ref<PotentialLevels>({...DEFAULT_POTENTIAL_LEVELS});
  const allSkillsMaxed = ref(false);
  const targetSkillsMaxed = ref(false);
  
  const levelCreditsIds = CREDITS_ID;
  const creditsData = getResourceDataById(levelCreditsIds);

  const characterXpTable = dataTable.character_xp;
  const exskillCreditsTable = dataTable.exskill_credits;
  const skillCreditsTable = dataTable.skill_credits;
  const potentialMaterials = dataTable.potential;

  const checkAllSkillsMaxed = () => {
    return Object.entries(skillLevels.value).every(([type, levels]) => {
      const student = props.student as Record<string, any>;
      const maxLevel = student?.Skills?.[type]?.Parameters?.[0]?.length;
      return levels.current === maxLevel && levels.target === maxLevel;
    });
  };
  
  const checkTargetSkillsMaxed = () => {
    return Object.entries(skillLevels.value).every(([type, levels]) => {
      const student = props.student as Record<string, any>;
      const maxLevel = student?.Skills?.[type]?.Parameters?.[0]?.length;
      return levels.target === maxLevel;
    });
  };

  const toggleMaxAllSkills = (checked: boolean) => {
    Object.keys(skillLevels.value).forEach((type) => {
      const skillType = type as SkillType;
      const student = props.student as Record<string, any>;
      const maxLevel = student?.Skills?.[skillType]?.Parameters?.[0]?.length
      
      if (checked) {
        skillLevels.value[skillType].current = maxLevel;
        skillLevels.value[skillType].target = maxLevel;
      } else {
        skillLevels.value[skillType].current = 1;
        skillLevels.value[skillType].target = 1;
      }
    });
    
    allSkillsMaxed.value = checked;
    targetSkillsMaxed.value = checked;
    
    saveToLocalStorage();
    if (props.student) {
      updateStudentData(props.student.Id);
      calculateAndStoreStudentMaterials();
    }
  };
  
  const toggleMaxTargetSkills = (checked: boolean) => {
    Object.keys(skillLevels.value).forEach((type) => {
      const skillType = type as SkillType;
      const student = props.student as Record<string, any>;
      const maxLevel = student?.Skills?.[skillType]?.Parameters?.[0]?.length
      
      if (checked) {
        skillLevels.value[skillType].target = maxLevel;
        if (skillLevels.value[skillType].current > maxLevel) {
          skillLevels.value[skillType].current = maxLevel;
        }
      } else {
        skillLevels.value[skillType].target = skillLevels.value[skillType].current;
      }
    });
    
    targetSkillsMaxed.value = checked;
    allSkillsMaxed.value = checkAllSkillsMaxed();
    
    saveToLocalStorage();
    if (props.student) {
      updateStudentData(props.student.Id);
      calculateAndStoreStudentMaterials();
    }
  };

  function resetFormData() {
    currentCharacterLevel.value = 1;
    targetCharacterLevel.value = 1;
    potentialLevels.value = {...DEFAULT_POTENTIAL_LEVELS};
    skillLevels.value = {...DEFAULT_SKILL_LEVELS};
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadFromLocalStorage();
        calculateAndStoreStudentMaterials();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      resetFormData();
      if (props.isVisible) {
        loadFromLocalStorage();
        calculateAndStoreStudentMaterials();
      }
    }
  });

  // Watch for changes to form data and save to localStorage
  watch([currentCharacterLevel, targetCharacterLevel, skillLevels, potentialLevels], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
      updateStudentData(props.student.Id);
    }
  }, { deep: true });

  watch(skillLevels, () => {
    allSkillsMaxed.value = checkAllSkillsMaxed();
    targetSkillsMaxed.value = checkTargetSkillsMaxed();
  }, { deep: true });

  function saveToLocalStorage() {
    if (!props.student) return;
    
    const dataToSave = {
      currentCharacterLevel: currentCharacterLevel.value,
      targetCharacterLevel: targetCharacterLevel.value,
      potentialLevels: potentialLevels.value,
      skillLevels: skillLevels.value
    };

    saveFormData(props.student.Id, dataToSave);
  }

  function loadFromLocalStorage() {
    if (!props.student) return;

    const refs = {
      currentCharacterLevel,
      targetCharacterLevel,
      potentialLevels,
      skillLevels
    };
    
    const defaultValues = {
      currentCharacterLevel: 1,
      targetCharacterLevel: 1,
      potentialLevels: DEFAULT_POTENTIAL_LEVELS,
      skillLevels: DEFAULT_SKILL_LEVELS
    };
    
    loadFormDataToRefs(props.student.Id, refs, defaultValues);
  }

  const totalCumulativeExp = computed(() => {
    const currentXp = characterXpTable[currentCharacterLevel.value - 1] || 0;
    const targetXp = characterXpTable[targetCharacterLevel.value - 1] || 0;
    return Math.max(0, targetXp - currentXp);
  });

  const remainingXp = computed(() => {
    return totalCumulativeExp.value;
  });

  const charExpMaterialsNeeded = computed<Material[]>(() => {
    const materialsNeeded: Material[] = [];

    if (!props.student?.Id) return materialsNeeded;
    if (currentCharacterLevel.value >= targetCharacterLevel.value) return materialsNeeded;

    // Get the resources to access exp values
    const resources = getResources() || {};
    
    // Calculate total XP needed
    const currentXp = characterXpTable[currentCharacterLevel.value - 1] ?? 0;
    const targetXp = characterXpTable[targetCharacterLevel.value - 1] ?? 0;
    const totalXpNeeded = Math.max(0, targetXp - currentXp);
    
    if (totalXpNeeded <= 0) return materialsNeeded;

    // Add credits for level upgrade
    if (creditsData) {
      // Get appropriate credits cost from the table if available
      const characterXpCreditsTable = dataTable.character_credits ?? [];
      let creditsCost = 50000;
      
      if (characterXpCreditsTable.length > 0) {
        const currentLevelCreditCost = currentCharacterLevel.value > 0 ? 
          characterXpCreditsTable[currentCharacterLevel.value - 1] : 0;
        const targetLevelCreditCost = targetCharacterLevel.value > 0 ? 
          characterXpCreditsTable[targetCharacterLevel.value - 1] : 0;
          
        creditsCost = targetLevelCreditCost - currentLevelCreditCost;
      }
      
      if (creditsCost > 0) {
        materialsNeeded.push({
          material: creditsData,
          materialQuantity: creditsCost,
          type: 'level'
        });
      }
    }

    // Create an array of exp items in descending order of exp value
    const expItems = [
      { id: 13, value: resources['13']?.ExpValue || 400000 }, // Superior
      { id: 12, value: resources['12']?.ExpValue || 100000 }, // Advanced
      { id: 11, value: resources['11']?.ExpValue || 20000 },  // Normal
      { id: 10, value: resources['10']?.ExpValue || 4000 }    // Novice
    ].filter(item => item.value > 0);

    let remainingXpNeeded = totalXpNeeded;
    
    // Calculate how many of each report we need based on an optimal distribution
    // First try to use larger reports to minimize the total number of reports needed
    for (const item of expItems) {
      if (remainingXpNeeded <= 0) break;
      
      const expValue = item.value;
      // How many of this report do we need
      const neededCount = Math.floor(remainingXpNeeded / expValue);
      
      if (neededCount > 0) {
        const expData = getResourceDataById(item.id);
        if (expData) {
          materialsNeeded.push({
            material: expData,
            materialQuantity: neededCount,
            type: 'level'
          });
        }
        
        // Update remaining XP needed
        remainingXpNeeded -= neededCount * expValue;
      }
    }
    
    // Handle any remaining XP with the smallest report (round up)
    if (remainingXpNeeded > 0 && expItems.length > 0) {
      const smallestExp = expItems[expItems.length - 1];
      const expData = getResourceDataById(smallestExp.id);
      
      if (expData) {
        materialsNeeded.push({
          material: expData,
          materialQuantity: 1,
          type: 'level'
        });
      }
    }

    return materialsNeeded;
  });

  const skillMaterialsNeeded = computed<Material[]>(() => {
    const materialsNeeded: Material[] = [];
   
    if (!props.student?.Id) return materialsNeeded;

    Object.entries(skillLevels.value).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      if (current >= target) return;

      let materialIds: number[][] | null = null;
      let materialQuantities: number[][] | null = null;
      let creditsQuantities: number[] | null = null;

      // Determine which material data to use based on skill type
      if (type === 'Ex') {
        materialIds = props.student?.SkillExMaterial ?? null;
        materialQuantities = props.student?.SkillExMaterialAmount ?? null;
        creditsQuantities = exskillCreditsTable;
      } else {
        materialIds = props.student?.SkillMaterial ?? null;
        materialQuantities = props.student?.SkillMaterialAmount ?? null;
        creditsQuantities = skillCreditsTable;
      }

      if (!materialIds || !materialQuantities) return;

      // Calculate materials for each level
      for (let level = current; level < target; level++) {

        const levelMaterialIds = materialIds[level-1];
        const levelMaterialQuantities = materialQuantities[level-1];
        const levelCreditsQuantities = creditsQuantities[level-1];

        // Special case: Add SECRET_TECH_NOTE for level 9 to 10 for non-Ex skills
        if (level === 9 && type !== 'Ex') {
          const secretTechData = getResourceDataById(SECRET_TECH_NOTE_ID);
          materialsNeeded.push({
            material: secretTechData,
            materialQuantity: 1,
            type: type as SkillType
          });

          materialsNeeded.push({
            material: creditsData,
            materialQuantity: 4000000,
            type: type as SkillType
          });
        }

        // Needs to be placed after special case since 
        // levelMaterialIds.length === N-1, Ex max length is 5, Non Ex max length is 10
        if (!levelMaterialIds || !levelMaterialQuantities) continue;
        
        // Each level may need multiple materials, process each one
        for (let i = 0; i < levelMaterialIds.length; i++) {
          const materialId = levelMaterialIds[i];
          const quantity = levelMaterialQuantities[i];
          
          if (!materialId || !quantity) continue;
          
          const materialData = getResourceDataById(materialId);
          
          materialsNeeded.push({
            material: materialData,
            materialQuantity: quantity,
            type: type as SkillType
          });
        }

        materialsNeeded.push({
          material: creditsData,
          materialQuantity: levelCreditsQuantities,
          type: type as SkillType
        });
      }
    });
    
    return materialsNeeded;
  });

  // Calculate materials needed for potential upgrade
  const potentialMaterialsNeeded = computed<Material[]>(() => {
    const materialsNeeded: Material[] = [];
    
    if (!props.student?.Id || !potentialMaterials) return materialsNeeded;
    
    Object.entries(potentialLevels.value).forEach(([type, levels]) => {
      const { current, target } = levels;
      
      if (current >= target) return;
      
      const startBlock = Math.floor(current / 5);
      const endBlock = Math.floor((target - 1) / 5);
      
      for (let block = startBlock; block <= endBlock; block++) {
        if (block >= potentialMaterials.length) break;
        
        const blockData = potentialMaterials[block];
        if (!blockData) continue;
        
        let levelsInBlock = 5;
        
        if (block === startBlock) {
          levelsInBlock = 5 - (current % 5);
        }
        
        if (block === endBlock) {
          const remainder = target % 5;
          if (remainder > 0) {
            levelsInBlock = remainder;
          }
        }
        
        // Extract material data
        const [workbookQuantity, materialQuality, materialQuantity, creditsQuantity] = blockData;
        
        const workbookId = WORKBOOK_ID[type === 'maxhp' ? 0 : type === 'attack' ? 1 : 2];
        const materialId = props.student?.PotentialMaterial ?? 0;
        const actualMaterialId = materialQuality === 1 ? materialId : materialId + 1;
        
        const materialData = getResourceDataById(actualMaterialId);
        const workbookData = getResourceDataById(workbookId);
        const creditsData = getResourceDataById(CREDITS_ID);
        
        const scaledMaterialQuantity = Math.ceil(materialQuantity * levelsInBlock);
        const scaledWorkbookQuantity = Math.ceil(workbookQuantity * levelsInBlock);
        const scaledCreditsQuantity = Math.ceil(creditsQuantity * levelsInBlock);
        
        // Add materials to the list
        materialsNeeded.push(
          {
            material: materialData,
            materialQuantity: scaledMaterialQuantity,
            type: type as PotentialType
          },
          {
            material: workbookData,
            materialQuantity: scaledWorkbookQuantity,
            type: type as PotentialType
          },
          {
            material: creditsData,
            materialQuantity: scaledCreditsQuantity,
            type: type as PotentialType
          }
        );
      }
    });
    
    return materialsNeeded;
  });

  const removeLeadingZeros = (event: Event) => {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/^0+(?=\d)/, '');
  };

  const handleCharacterLevelInput = (event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 1 && value <= 90) {
      currentCharacterLevel.value = value;
    }
  };

  const handleTargetCharacterLevelInput = (event: Event) => {
    removeLeadingZeros(event);
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 1 && value <= 90) {
      targetCharacterLevel.value = value;
    }
  };

  const handleCurrentPotentialInput = (value: number) => {
    if (value >= 0 && value <= 25) {
      potentialLevels.value.attack.current = value;
      
      // Ensure target is always >= current
      if (potentialLevels.value.attack.target < value) {
        potentialLevels.value.attack.target = value;
      }
    }
  };

  const handleTargetPotentialInput = (value: number) => {
    if (value >= 0 && value <= 25) {
      potentialLevels.value.attack.target = value;
      
      // Ensure current is always <= target
      if (potentialLevels.value.attack.current > value) {
        potentialLevels.value.attack.current = value;
      }
    }
  };
  
  // Function to handle updates from all potential types
  const handlePotentialUpdate = (type: PotentialType, current: number, target: number) => {
    if (current >= 0 && current <= 25 && target >= 0 && target <= 25) {
      // Update the specified potential type
      potentialLevels.value[type].current = current;
      potentialLevels.value[type].target = target;
      
      // Ensure current <= target
      if (potentialLevels.value[type].current > potentialLevels.value[type].target) {
        potentialLevels.value[type].target = potentialLevels.value[type].current;
      }
      
      // Save changes and update materials immediately
      if (props.student && props.isVisible) {
        saveToLocalStorage();
        updateStudentData(props.student.Id);
      }
    }
  };

  // Function to handle updates for skill levels
  const handleSkillUpdate = (type: SkillType, current: number, target: number) => {
    if (current >= 1 && target >= current) {
      // Update the specified skill type
      if (skillLevels.value[type]) {
        skillLevels.value[type].current = current;
        skillLevels.value[type].target = target;
        
        // Explicitly trigger localStorage save and immediate refresh
        if (props.student && props.isVisible) {
          saveToLocalStorage();
          updateStudentData(props.student.Id);
        }
      }
    }
  };

  function closeModal() {
    // Save the current state before closing
    saveToLocalStorage();
    if (props.student) {
      updateStudentData(props.student.Id);
      calculateAndStoreStudentMaterials();
    }
    emit('close');
  }

  // Add this function to calculate and store materials for a single student
  const calculateAndStoreStudentMaterials = () => {
    if (!props.student) return [];

    // Simply use the allMaterialsNeeded computed property which already updates the store
    return allMaterialsNeeded.value;
  };

  // Create a computed property for all materials needed for this student
  const allMaterialsNeeded = computed<Material[]>(() => {
    if (!props.student) return [];
    
    // Collect all materials
    const materials: Material[] = [];
    materials.push(...charExpMaterialsNeeded.value);
    materials.push(...skillMaterialsNeeded.value);
    materials.push(...potentialMaterialsNeeded.value);
    
    // Consolidate materials by ID
    const materialMap = new Map<number, Material>();
    
    materials.forEach(item => {
      const materialId = item.material?.Id;
      if (!materialId) return;
      
      if (materialMap.has(materialId)) {
        // Update quantity for existing material
        const existing = materialMap.get(materialId)!;
        existing.materialQuantity += item.materialQuantity;
      } else {
        // Create a new entry with a copy of the item
        materialMap.set(materialId, { ...item });
      }
    });
    
    // Convert map to array and sort by ID
    const sortedMaterials = Array.from(materialMap.values())
      .sort((a, b) => {
        const aId = a.material?.Id || 0;
        const bId = b.material?.Id || 0;
        
        // Always put credits (ID: 5) first
        if (aId === 5) return -1;
        if (bId === 5) return 1;
        
        // Put exp reports next (IDs: 10, 11, 12, 13)
        const isExpReport = (id: number) => [10, 11, 12, 13].includes(id);
        const isExpReportA = isExpReport(aId);
        const isExpReportB = isExpReport(bId);
        
        if (isExpReportA && !isExpReportB) return -1;
        if (!isExpReportA && isExpReportB) return 1;
        
        // For all other materials, sort by ID
        return aId - bId;
      });
    
    // Update the resource store directly from this computed property
    updateMaterialsData(props.student.Id, sortedMaterials);
    
    return sortedMaterials;
  });

  // Watch for changes that affect materials and update the store
  watch([
    currentCharacterLevel,
    targetCharacterLevel,
    skillLevels,
    potentialLevels
  ], () => {
    if (props.student) {
      calculateAndStoreStudentMaterials();
    }
  }, { deep: true });

  // Run initial calculation
  if (props.student) {
    calculateAndStoreStudentMaterials();
  }

  return {
    // State
    currentCharacterLevel,
    targetCharacterLevel,
    potentialLevels,
    skillLevels,
    potentialMaterials,
    
    // Computed
    totalCumulativeExp,
    remainingXp,
    potentialMaterialsNeeded,
    skillMaterialsNeeded,
    charExpMaterialsNeeded,
    allMaterialsNeeded,

    // Methods
    closeModal,
    resetFormData,
    saveToLocalStorage,
    loadFromLocalStorage,
    handleCharacterLevelInput,
    handleTargetCharacterLevelInput,
    handleCurrentPotentialInput,
    handleTargetPotentialInput,
    handlePotentialUpdate,
    handleSkillUpdate,
    allSkillsMaxed,
    checkAllSkillsMaxed,
    toggleMaxAllSkills,
    toggleMaxTargetSkills,
    targetSkillsMaxed,
    checkTargetSkillsMaxed
  };
}