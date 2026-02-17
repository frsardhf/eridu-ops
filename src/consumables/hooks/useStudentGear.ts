import { ref, computed, watch } from 'vue';
import { StudentProps } from '../../types/student';
import {
  loadFormDataToRefs,
  saveFormData
} from '../utils/studentStorage';
import {
  EquipmentLevels,
  EquipmentType,
  GradeInfos,
  GradeLevels
} from '../../types/gear';
import { Material } from '../../types/upgrade';
import { updateStudentData, setStudentDataDirect, studentDataStore } from '../stores/studentStore';
import { updateGearsData } from '../stores/gearsStore';
import type { ExclusiveGearLevel } from '../../types/gear';
import { calculateAllGears, getMaxTierForTypeSync, getElephsForGrade } from '../utils/gearMaterialUtils';

// Re-export for external consumers
export { calculateAllGears, getMaxTierForTypeSync, getElephsForGrade } from '../utils/gearMaterialUtils';

export function useStudentGear(props: {
  student: StudentProps,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  // Track pending save to deduplicate concurrent saves
  let pendingSave: Promise<void> | null = null;
  // Token to discard stale async loads during rapid student navigation
  let loadRequestToken = 0;
  // Track loading state to prevent watch from triggering saves during load
  const isLoading = ref(false);

  // Track all equipment levels in one object
  const equipmentLevels = ref<EquipmentLevels>({});
  const gradeLevels = ref<GradeLevels>({});
  const gradeInfos = ref<GradeInfos>({});
  const exclusiveGearLevel = ref<ExclusiveGearLevel>({});

  // Max gear states
  const allGearsMaxed = ref(false);
  const targetGearsMaxed = ref(false);

  // Exclusive gear computed properties
  const hasExclusiveGear = computed(() => {
    return !!(props.student.Gear && Object.keys(props.student.Gear).length > 0);
  });

  const currentBond = computed(() => {
    const form = studentDataStore.value[props.student.Id];
    return form?.bondDetailData?.currentBond ?? 0;
  });

  const canUnlockT1 = computed(() => currentBond.value > 15);
  const canUnlockT2 = computed(() => currentBond.value > 20);

  const maxUnlockableGearTier = computed(() => {
    if (!hasExclusiveGear.value) return 0;
    if (canUnlockT2.value) return 2;
    if (canUnlockT1.value) return 1;
    return 0;
  });

  const checkAllGearsMaxed = () => {
    return props.student.Equipment.every((type) => {
      const maxTier = getMaxTierForTypeSync(type);
      const levels = equipmentLevels.value[type as EquipmentType];
      return levels?.current === maxTier && levels?.target === maxTier;
    });
  };

  const checkTargetGearsMaxed = () => {
    return props.student.Equipment.every((type) => {
      const maxTier = getMaxTierForTypeSync(type);
      const levels = equipmentLevels.value[type as EquipmentType];
      return levels?.target === maxTier;
    });
  };

  const toggleMaxAllGears = (checked: boolean) => {
    props.student.Equipment.forEach((type) => {
      const equipmentType = type as EquipmentType;
      const maxTier = getMaxTierForTypeSync(type);

      if (checked) {
        equipmentLevels.value[equipmentType] = { current: maxTier, target: maxTier };
      } else {
        equipmentLevels.value[equipmentType] = { current: 1, target: 1 };
      }
    });

    allGearsMaxed.value = checked;
    targetGearsMaxed.value = checked;

    saveToIndexedDB();
    updateStudentData(props.student.Id);
  };

  const toggleMaxTargetGears = (checked: boolean) => {
    props.student.Equipment.forEach((type) => {
      const equipmentType = type as EquipmentType;
      const maxTier = getMaxTierForTypeSync(type);
      const currentLevel = equipmentLevels.value[equipmentType]?.current || 1;

      if (checked) {
        equipmentLevels.value[equipmentType] = { current: currentLevel, target: maxTier };
      } else {
        equipmentLevels.value[equipmentType] = { current: currentLevel, target: currentLevel };
      }
    });

    targetGearsMaxed.value = checked;
    allGearsMaxed.value = checkAllGearsMaxed();

    saveToIndexedDB();
    updateStudentData(props.student.Id);
  };

  // Watch for changes to form data and save to IndexedDB
  watch([equipmentLevels, gradeLevels, gradeInfos, exclusiveGearLevel], async () => {
    if (props.isVisible && !isLoading.value) {
      await saveToIndexedDB();
      updateStudentData(props.student.Id);
    }
  }, { deep: true });

  // Watch for equipment level changes to update maxed flags
  watch(equipmentLevels, () => {
    allGearsMaxed.value = checkAllGearsMaxed();
    targetGearsMaxed.value = checkTargetGearsMaxed();
  }, { deep: true });

  // Save current form data to IndexedDB
  async function saveToIndexedDB() {
    // Wait for any pending save to complete
    if (pendingSave) {
      await pendingSave;
    }

    // Mark this as the current pending save
    const currentSave = (async () => {
      const dataToSave = {
        equipmentLevels: { ...equipmentLevels.value },
        gradeLevels: { ...gradeLevels.value },
        gradeInfos: { ...gradeInfos.value },
        exclusiveGearLevel: { ...exclusiveGearLevel.value }
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

  // Load form data from IndexedDB
  async function loadFromIndexedDB() {
    const requestToken = ++loadRequestToken;
    const studentId = props.student.Id;

    isLoading.value = true;

    try {
      // Stage async load into temporary refs first so stale loads cannot mutate active state.
      const stagedEquipmentLevels = ref<EquipmentLevels>({});
      const stagedGradeLevels = ref<GradeLevels>({});
      const stagedGradeInfos = ref<GradeInfos>({});
      const stagedExclusiveGearLevel = ref<ExclusiveGearLevel>({});

      const refs = {
        equipmentLevels: stagedEquipmentLevels,
        gradeLevels: stagedGradeLevels,
        gradeInfos: stagedGradeInfos,
        exclusiveGearLevel: stagedExclusiveGearLevel
      };

      const defaultEquipmentLevels: EquipmentLevels = {};
      props.student.Equipment.forEach((type) => {
        defaultEquipmentLevels[type] = { current: 1, target: 1 };
      });

      const starGrade = props.student.StarGrade ?? 1;

      const defaultValues = {
        equipmentLevels: defaultEquipmentLevels,
        gradeLevels: { current: starGrade, target: starGrade },
        gradeInfos: { owned: 0, price: 1, purchasable: 20 },
        exclusiveGearLevel: { current: 0, target: 0 }
      };

      await loadFormDataToRefs(studentId, refs, defaultValues);

      if (requestToken !== loadRequestToken || props.student.Id !== studentId) {
        return;
      }

      equipmentLevels.value = stagedEquipmentLevels.value;
      gradeLevels.value = stagedGradeLevels.value;
      gradeInfos.value = stagedGradeInfos.value;
      exclusiveGearLevel.value = stagedExclusiveGearLevel.value;

      await updateStudentData(studentId);
    } finally {
      isLoading.value = false;
    }
  }

  // Create a computed property for all equipment materials needed for this student
  const equipmentMaterialsNeeded = computed<Material[]>(() => {
    return calculateAllGears(
      props.student,
      equipmentLevels.value,
      gradeLevels.value,
      gradeInfos.value,
      exclusiveGearLevel.value
    );
  });

  // Update gears store when materials change (side effects belong in watchers, not computed)
  watch(equipmentMaterialsNeeded, (materials) => {
    updateGearsData(props.student.Id, materials);
  }, { immediate: true });

  // Function to handle updates for equipment levels
  const handleEquipmentUpdate = (type: EquipmentType, current: number, target: number) => {
    const maxTier = getMaxTierForTypeSync(type);

    if (current >= 1 && current <= maxTier && target >= current && target <= maxTier) {
      if (equipmentLevels.value[type]) {
        equipmentLevels.value[type].current = current;
        equipmentLevels.value[type].target = target;

        if (props.isVisible) {
          updateStudentData(props.student.Id);
        }
      } else {
        console.error('Equipment type not found in levels:', type);
      }
    }
  };

  // Function to handle updates for grade levels
  const handleGradeUpdate = (current: number, target: number) => {
    if (current >= 1 && current <= 9 && target >= current && target <= 9) {
      if (gradeLevels.value) {
        gradeLevels.value.current = current;
        gradeLevels.value.target = target;

        if (props.isVisible) {
          updateStudentData(props.student.Id);
        }
      }
    }
  };

  // Function to handle updates for grade info
  const handleGradeInfoUpdate = (owned: number, price: number, purchasable: number) => {
    if (gradeInfos.value) {
      gradeInfos.value.owned = owned;
      gradeInfos.value.price = price;
      gradeInfos.value.purchasable = purchasable;

      if (props.isVisible) {
        updateStudentData(props.student.Id);
      }
    }
  };

  // Function to handle updates for exclusive gear level
  const handleExclusiveGearUpdate = (current: number, target: number) => {
    const maxTier = maxUnlockableGearTier.value;

    // Clamp current to valid range (0 to maxUnlockable)
    current = Math.min(Math.max(0, current), maxTier);
    // Clamp target to valid range (current to 2)
    target = Math.min(Math.max(current, target), 2);

    exclusiveGearLevel.value = { current, target };

    if (props.isVisible) {
      saveToIndexedDB();
      updateStudentData(props.student.Id);
    }
  };

  return {
    // State
    equipmentLevels,
    gradeLevels,
    gradeInfos,
    exclusiveGearLevel,

    // Computed
    equipmentMaterialsNeeded,
    hasExclusiveGear,
    maxUnlockableGearTier,
    allGearsMaxed,
    targetGearsMaxed,

    // Methods
    loadFromIndexedDB,
    handleEquipmentUpdate,
    handleGradeUpdate,
    handleGradeInfoUpdate,
    handleExclusiveGearUpdate,
    toggleMaxAllGears,
    toggleMaxTargetGears,
    getElephsForGrade,
  };
}
