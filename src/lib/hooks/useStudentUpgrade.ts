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
import { MAX_POTENTIAL_LEVEL } from '../utils/upgradeUtils';
import { useDebouncedFormPersistence } from './useDebouncedFormPersistence';

// Re-export for external consumers (materialUtils.ts)
export { calculateAllMaterials } from '../utils/upgradeMaterialUtils';

export function useStudentUpgrade(props: {
  student: StudentProps,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  const characterLevels = ref<CharacterLevels>({...DEFAULT_CHARACTER_LEVELS});
  const skillLevels = ref<SkillLevels>({...DEFAULT_SKILL_LEVELS});
  const potentialLevels = ref<PotentialLevels>({...DEFAULT_POTENTIAL_LEVELS});
  const allSkillsMaxed = ref(false);
  const targetSkillsMaxed = ref(false);
  const allPotentialsMaxed = ref(false);
  const targetPotentialsMaxed = ref(false);

  const characterXpTable = dataTable.character_xp;

  const checkAllSkillsMaxed = () => {
    return Object.entries(skillLevels.value).every(([type, levels]) => {
      const student = props.student;
      const maxLevel = student?.Skills?.[type]?.Parameters?.[0]?.length;
      return levels.current === maxLevel && levels.target === maxLevel;
    });
  };

  const checkTargetSkillsMaxed = () => {
    return Object.entries(skillLevels.value).every(([type, levels]) => {
      const student = props.student;
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
      const student = props.student;
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
      const student = props.student;
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

  watch(skillLevels, () => {
    allSkillsMaxed.value = checkAllSkillsMaxed();
    targetSkillsMaxed.value = checkTargetSkillsMaxed();
  }, { deep: true });

  watch(potentialLevels, () => {
    allPotentialsMaxed.value = checkAllPotentialsMaxed();
    targetPotentialsMaxed.value = checkTargetPotentialsMaxed();
  }, { deep: true });

  const UPGRADE_DEFAULTS = {
    characterLevels: { ...DEFAULT_CHARACTER_LEVELS } as CharacterLevels,
    skillLevels:     { ...DEFAULT_SKILL_LEVELS }     as SkillLevels,
    potentialLevels: { ...DEFAULT_POTENTIAL_LEVELS } as PotentialLevels,
  };

  const { loadNow: loadFromIndexedDB, flushNow: saveToIndexedDB } =
    useDebouncedFormPersistence({
      isVisible:    () => props.isVisible,
      refs:         { characterLevels, skillLevels, potentialLevels },
      defaults:     UPGRADE_DEFAULTS,
      loadFn:       (staged) => loadFormDataToRefs(props.student.Id, staged, UPGRADE_DEFAULTS),
      saveFn:       () => saveFormData(props.student.Id, {
        characterLevels: characterLevels.value,
        skillLevels:     skillLevels.value,
        potentialLevels: potentialLevels.value,
      }),
      onSaved:      (saved) => setStudentDataDirect(props.student.Id, saved),
      afterFlush:   () => updateStudentData(props.student.Id),
      afterLoad:    () => updateStudentData(props.student.Id),
      watchSources: [characterLevels, skillLevels, potentialLevels],
    });

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
    saveBeforeClose: saveToIndexedDB,
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
