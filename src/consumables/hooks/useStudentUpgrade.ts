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
  saveFormData 
} from '../utils/studentStorage';
import dataTable from '../../data/data.json';
import { useResourceCalculation } from './useResourceCalculation';
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
  
  // Import resource calculation hook to use material data
  const { getMaterialUsageByStudents, refreshData, immediateRefresh } = useResourceCalculation();
  
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
      immediateRefresh();
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
      immediateRefresh();
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
        refreshData();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      resetFormData();
      if (props.isVisible) {
        loadFromLocalStorage();
        refreshData();
      }
    }
  });

  // Watch for changes to form data and save to localStorage
  watch([currentCharacterLevel, targetCharacterLevel, skillLevels, potentialLevels], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
      updateStudentData(props.student.Id);
      refreshData();
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
    const expReportIds = EXP_REPORT_ID;

    if (!props.student?.Id) return materialsNeeded;

    if (currentCharacterLevel.value < targetCharacterLevel.value) {
      for (const expId of expReportIds) {
        const usageData = getMaterialUsageByStudents(expId);
        const studentUsage = usageData.find(usage => usage.student.Id === props.student?.Id);
        
        if (studentUsage && studentUsage.quantity > 0) {
          const expData = getResourceDataById(expId);
          
          if (expData) {
            materialsNeeded.push({
              material: expData,
              materialQuantity: studentUsage.quantity,
              type: 'level'
            });
          }
        }
      }
    }
    
    // Always get credits usage for all upgrade types
    const creditsUsage = getMaterialUsageByStudents(CREDITS_ID)
      .filter(usage => usage.student.Id === props.student?.Id)
      .reduce((total, usage) => total + usage.quantity, 0);
    
    if (creditsUsage > 0 && creditsData) {
      materialsNeeded.push({
        material: creditsData,
        materialQuantity: creditsUsage,
        type: 'level'
      });
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
        
        if (!levelMaterialIds || !levelMaterialQuantities) continue;

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
        immediateRefresh(); // Use immediate refresh for responsive UI
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
          immediateRefresh(); // Use immediate refresh for responsive UI
        }
      }
    }
  };

  function closeModal() {
    // Save the current state before closing
    saveToLocalStorage();
    emit('close');
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