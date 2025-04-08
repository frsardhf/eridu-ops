import { ref, computed, watch } from 'vue';
import { ModalProps, StudentProps } from '../../types/student';
import { loadFormDataToRefs, saveFormData } from '../utils/studentStorage';
import { EquipmentLevels, EquipmentType } from '../../types/equipment';
import { useResourceCalculation } from './useResourceCalculation';
import { updateStudentData } from '../stores/studentStore';

export function useStudentGear(props: { 
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {

  
  // Import resource calculation hook to use material data
  const { getMaterialUsageByStudents, refreshData } = useResourceCalculation();

  // Track all equipment levels in one object
  const equipmentLevels = ref<EquipmentLevels>({});

  console.log('useStudentGear initialized with:', equipmentLevels.value);

  // Reset form data
  function resetFormData() {
    console.log('Resetting form data');
    // Reset equipment levels based on student's equipment
    if (props.student?.Equipment) {
      const newLevels: EquipmentLevels = {};
      props.student.Equipment.forEach(type => {
        newLevels[type] = { current: 1, target: 1 };
      });
      equipmentLevels.value = newLevels;
    }
    console.log('Form data reset to:', equipmentLevels.value);
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    console.log('isVisible changed to:', newValue);
    if (newValue && props.student) {
      setTimeout(() => {
        loadFromLocalStorage();
        refreshData();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    console.log('Student changed to:', newValue?.Id);
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
    console.log('equipmentLevels changed:', equipmentLevels.value);
    if (props.student && props.isVisible) {
      saveToLocalStorage();
      updateStudentData(props.student.Id);
      refreshData();
    }
  }, { deep: true });

  // Save current form data to localStorage
  function saveToLocalStorage() {
    if (!props.student) return;
    
    console.log('Saving to localStorage for student:', props.student.Id);
    const dataToSave = {
      equipmentLevels: equipmentLevels.value
    };
    console.log('Data to save:', dataToSave);

    saveFormData(props.student.Id, dataToSave);
  }

  // Load form data from localStorage
  function loadFromLocalStorage() {
    if (!props.student) return;

    console.log('Loading from localStorage for student:', props.student.Id);
    
    // Define default values based on student's equipment
    const defaultValues = {
      equipmentLevels: props.student.Equipment.reduce((acc, type) => {
        acc[type] = { current: 1, target: 1 };
        return acc;
      }, {} as EquipmentLevels)
    };
    
    console.log('Loading with default values:', defaultValues);
    
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
    
    console.log('After loading, equipmentLevels:', equipmentLevels.value);
  }

  // Function to handle updates for equipment levels
  const handleEquipmentUpdate = (type: EquipmentType, current: number, target: number) => {
    console.log('handleEquipmentUpdate called with:', { type, current, target });
    if (current >= 1 && target >= current) {
      // Update the specified equipment type
      if (equipmentLevels.value[type]) {
        equipmentLevels.value[type].current = current;
        equipmentLevels.value[type].target = target;
        
        console.log('Updated equipmentLevels:', equipmentLevels.value);
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