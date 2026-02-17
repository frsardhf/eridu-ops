import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import {
  SkillType,
  SkillLevels,
  PotentialType,
  PotentialLevels,
  CharacterLevels,
  DEFAULT_CHARACTER_LEVELS,
  DEFAULT_SKILL_LEVELS,
  DEFAULT_POTENTIAL_LEVELS
} from '../../types/upgrade';
import {
  loadFormDataToRefs,
  saveFormData
} from '../utils/studentStorage';
import dataTable from '../../data/data.json';
import { updateMaterialsData } from '../stores/materialsStore';
import { updateStudentData, setStudentDataDirect } from '../stores/studentStore';
import { calculateAllMaterials } from '../utils/upgradeMaterialUtils';

// Re-export for external consumers (materialUtils.ts)
export { calculateAllMaterials } from '../utils/upgradeMaterialUtils';

export function useStudentUpgrade(props: {
  student: StudentProps,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // Track pending save to deduplicate concurrent saves
  let pendingSave: Promise<void> | null = null;
  // Token to discard stale async loads during rapid student navigation
  let loadRequestToken = 0;
  // Track loading state to prevent watch from triggering saves during load
  const isLoading = ref(false);

  const characterLevels = ref<CharacterLevels>({...DEFAULT_CHARACTER_LEVELS});
  const skillLevels = ref<SkillLevels>({...DEFAULT_SKILL_LEVELS});
  const potentialLevels = ref<PotentialLevels>({...DEFAULT_POTENTIAL_LEVELS});
  const allSkillsMaxed = ref(false);
  const targetSkillsMaxed = ref(false);
  const allPotentialsMaxed = ref(false);
  const targetPotentialsMaxed = ref(false);

  const MAX_POTENTIAL_LEVEL = 25;
  const characterXpTable = dataTable.character_xp;

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

  const checkAllPotentialsMaxed = () => {
    return Object.values(potentialLevels.value).every((levels) => {
      return levels.current === MAX_POTENTIAL_LEVEL && levels.target === MAX_POTENTIAL_LEVEL;
    });
  };

  const checkTargetPotentialsMaxed = () => {
    return Object.values(potentialLevels.value).every((levels) => {
      return levels.target === MAX_POTENTIAL_LEVEL;
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

    saveToIndexedDB();
    if (props.student) {
      updateStudentData(props.student.Id);
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

    saveToIndexedDB();
    if (props.student) {
      updateStudentData(props.student.Id);
    }
  };

  const toggleMaxAllPotentials = (checked: boolean) => {
    Object.keys(potentialLevels.value).forEach((type) => {
      const potentialType = type as PotentialType;
      if (checked) {
        potentialLevels.value[potentialType].current = MAX_POTENTIAL_LEVEL;
        potentialLevels.value[potentialType].target = MAX_POTENTIAL_LEVEL;
      } else {
        potentialLevels.value[potentialType].current = 0;
        potentialLevels.value[potentialType].target = 0;
      }
    });

    allPotentialsMaxed.value = checked;
    targetPotentialsMaxed.value = checked;

    saveToIndexedDB();
    if (props.student) {
      updateStudentData(props.student.Id);
    }
  };

  const toggleMaxTargetPotentials = (checked: boolean) => {
    Object.keys(potentialLevels.value).forEach((type) => {
      const potentialType = type as PotentialType;
      if (checked) {
        potentialLevels.value[potentialType].target = MAX_POTENTIAL_LEVEL;
      } else {
        potentialLevels.value[potentialType].target = potentialLevels.value[potentialType].current;
      }
    });

    targetPotentialsMaxed.value = checked;
    allPotentialsMaxed.value = checkAllPotentialsMaxed();

    saveToIndexedDB();
    if (props.student) {
      updateStudentData(props.student.Id);
    }
  };

  function resetFormData() {
    characterLevels.value = { current: 1, target: 1};
    skillLevels.value = {
      Ex: { current: 1, target: 1 },
      Public: { current: 1, target: 1 },
      Passive: { current: 1, target: 1 },
      ExtraPassive: { current: 1, target: 1 }
    };
    potentialLevels.value = {
      attack: { current: 0, target: 0 },
      maxhp: { current: 0, target: 0 },
      healpower: { current: 0, target: 0 }
    };
  }

  // Watch for changes to form data and save to IndexedDB
  watch([characterLevels, skillLevels, potentialLevels], async () => {
    if (props.isVisible && !isLoading.value) {
      await saveToIndexedDB();
      updateStudentData(props.student.Id);
    }
  }, { deep: true });

  watch(skillLevels, () => {
    allSkillsMaxed.value = checkAllSkillsMaxed();
    targetSkillsMaxed.value = checkTargetSkillsMaxed();
  }, { deep: true });

  watch(potentialLevels, () => {
    allPotentialsMaxed.value = checkAllPotentialsMaxed();
    targetPotentialsMaxed.value = checkTargetPotentialsMaxed();
  }, { deep: true });

  async function saveToIndexedDB() {
    // Wait for any pending save to complete
    if (pendingSave) {
      await pendingSave;
    }

    // Mark this as the current pending save
    const currentSave = (async () => {
      const dataToSave = {
        characterLevels: characterLevels.value,
        skillLevels: skillLevels.value,
        potentialLevels: potentialLevels.value
      };

      const savedData = await saveFormData(props.student.Id, dataToSave);
      if (savedData) {
        // Update store immediately with sanitized data for reactive overlay updates
        setStudentDataDirect(props.student.Id, savedData);
      }
    })();

    pendingSave = currentSave;
    await currentSave;
    pendingSave = null;
  }

  async function loadFromIndexedDB() {
    const requestToken = ++loadRequestToken;
    const studentId = props.student.Id;

    isLoading.value = true;

    try {
      // Stage async load into temporary refs first so stale loads cannot mutate active state.
      const stagedCharacterLevels = ref<CharacterLevels>({ ...DEFAULT_CHARACTER_LEVELS });
      const stagedSkillLevels = ref<SkillLevels>({ ...DEFAULT_SKILL_LEVELS });
      const stagedPotentialLevels = ref<PotentialLevels>({ ...DEFAULT_POTENTIAL_LEVELS });

      const refs = {
        characterLevels: stagedCharacterLevels,
        skillLevels: stagedSkillLevels,
        potentialLevels: stagedPotentialLevels
      };

      const defaultValues = {
        characterLevels: { current: 1, target: 1 },
        skillLevels: {
          Ex: { current: 1, target: 1 },
          Public: { current: 1, target: 1 },
          Passive: { current: 1, target: 1 },
          ExtraPassive: { current: 1, target: 1 }
        },
        potentialLevels: {
          attack: { current: 0, target: 0 },
          maxhp: { current: 0, target: 0 },
          healpower: { current: 0, target: 0 }
        }
      };

      await loadFormDataToRefs(studentId, refs, defaultValues);

      if (requestToken !== loadRequestToken || props.student.Id !== studentId) {
        return;
      }

      characterLevels.value = stagedCharacterLevels.value;
      skillLevels.value = stagedSkillLevels.value;
      potentialLevels.value = stagedPotentialLevels.value;
    } finally {
      isLoading.value = false;
    }

    await updateStudentData(studentId);
  }

  const remainingXp = computed(() => {
    const currentXp = characterXpTable[characterLevels.value.current - 1] ?? 0;
    const targetXp = characterXpTable[characterLevels.value.target - 1] ?? 0;
    return Math.max(0, targetXp - currentXp);
  });

  // Create a computed property for all materials needed for this student
  const allMaterialsNeeded = computed(() => {
    return calculateAllMaterials(
      props.student,
      characterLevels.value,
      skillLevels.value,
      potentialLevels.value,
    );
  });

  // Update materials store when materials change (side effects belong in watchers, not computed)
  watch(allMaterialsNeeded, (materials) => {
    updateMaterialsData(props.student.Id, materials);
  }, { immediate: true });

  const handleLevelUpdate = (current: number, target: number) => {
    characterLevels.value.current = current;
    characterLevels.value.target = target;

    if (props.student && props.isVisible) {
      updateStudentData(props.student.Id);
    }
  };

  const handleSkillUpdate = (type: SkillType, current: number, target: number) => {
    if (current >= 1 && target >= current) {
      if (skillLevels.value[type]) {
        skillLevels.value[type].current = current;
        skillLevels.value[type].target = target;

    if (props.student && props.isVisible) {
      updateStudentData(props.student.Id);
        }
      }
    }
  };

  const handlePotentialUpdate = (type: PotentialType, current: number, target: number) => {
    if (current >= 0 && target >= current) {
      if (potentialLevels.value[type]) {
        potentialLevels.value[type].current = current;
        potentialLevels.value[type].target = target;

    if (props.student && props.isVisible) {
      updateStudentData(props.student.Id);
        }
      }
    }
  };

  function closeModal() {
    saveToIndexedDB();
    updateStudentData(props.student.Id);
    emit('close');
  }

  return {
    // State
    characterLevels,
    potentialLevels,
    skillLevels,

    // Computed
    remainingXp,
    allMaterialsNeeded,

    // Methods
    closeModal,
    loadFromIndexedDB,
    handleLevelUpdate,
    handlePotentialUpdate,
    handleSkillUpdate,
    allSkillsMaxed,
    toggleMaxAllSkills,
    toggleMaxTargetSkills,
    targetSkillsMaxed,
    allPotentialsMaxed,
    targetPotentialsMaxed,
    toggleMaxAllPotentials,
    toggleMaxTargetPotentials
  };
}
