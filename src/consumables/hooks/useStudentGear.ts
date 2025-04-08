import { ref, computed, watch } from 'vue';
import { ModalProps, StudentProps } from '../../types/student';
import { loadFormDataToRefs, saveFormData, getEquipments } from '../utils/studentStorage';
import { EquipmentLevels, EquipmentType } from '../../types/equipment';
import { useResourceCalculation } from './useResourceCalculation';
import { updateStudentData } from '../stores/studentStore';

// Function to get maximum tier for each equipment type
function getMaxTierForType(type: string): number {
  const equipments = getEquipments();
  if (!equipments) return 10; // Default to 10 if data not found

  // Find the equipment that matches the type
  const equipment = Object.values(equipments).find(
    (item: any) => item.Category === type
  );

  return equipment?.Tier || 10; // Return the tier if found, otherwise default to 10
}

export function useStudentGear(props: { 
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {

  
  // Import resource calculation hook to use material data
  const { getMaterialUsageByStudents, refreshData } = useResourceCalculation();

  // Track all equipment levels in one object
  const equipmentLevels = ref<EquipmentLevels>({});

  // Reset form data
  function resetFormData() {
    // Reset equipment levels based on student's equipment
    if (props.student?.Equipment) {
      const newLevels: EquipmentLevels = {};
      props.student.Equipment.forEach(type => {
        newLevels[type] = { current: 1, target: 1 };
      });
      equipmentLevels.value = newLevels;
    }
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
  watch([equipmentLevels], () => {
    if (props.student && props.isVisible) {
      saveToLocalStorage();
      updateStudentData(props.student.Id);
      refreshData();
    }
  }, { deep: true });

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;
    
    const dataToSave = {
      equipmentLevels: equipmentLevels.value
    };

    saveFormData(props.student.Id, dataToSave);
  }

  // Load form data from localStorage
  function loadFromLocalStorage() {
    if (!props.student) return;

    // Define default values based on student's equipment
    const defaultValues = {
      equipmentLevels: props.student.Equipment.reduce((acc, type) => {
        acc[type] = { current: 1, target: 1 };
        return acc;
      }, {} as EquipmentLevels)
    };
    
    // Load data from localStorage
    loadFormDataToRefs(props.student.Id, { equipmentLevels }, defaultValues);
    
    // Ensure all student's equipment types exist in the loaded data
    const loadedLevels = equipmentLevels.value;
    const mergedLevels = { ...defaultValues.equipmentLevels };
    
    // Merge loaded data with defaults
    Object.keys(mergedLevels).forEach(type => {
      if (loadedLevels[type]) {
        mergedLevels[type] = {
          current: loadedLevels[type].current || 1,
          target: loadedLevels[type].target || 1
        };
      }
    });
    
    // Update the ref with merged data
    equipmentLevels.value = mergedLevels;
  }

  // Function to handle updates for equipment levels
  const handleEquipmentUpdate = (type: EquipmentType, current: number, target: number) => {
    const maxTier = getMaxTierForType(type);
    
    if (current >= 1 && current <= maxTier && target >= current && target <= maxTier) {
      // Update the specified equipment type
      if (equipmentLevels.value[type]) {
        equipmentLevels.value[type].current = current;
        equipmentLevels.value[type].target = target;
        
        // Explicitly trigger localStorage save
        if (props.student && props.isVisible) {
          saveToLocalStorage();
        }
      } else {
        console.error('Equipment type not found in levels:', type);
      }
    }
  };

  function closeModal() {
    // Save the current state before closing
    saveToLocalStorage();
    emit('close');
  }

  return {
    equipmentLevels,

    closeModal,
    handleEquipmentUpdate
  };
} 