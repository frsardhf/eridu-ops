import { ref, watch } from 'vue';
import { ModalProps, StudentProps } from '../../types/student';
import { getEquipments, saveEquipmentsFromStudent } from '../utils/studentStorage';

export function useStudentEquipment(props: { 
  student: ModalProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  const equipmentFormData = ref<Record<string, number>>({});

  function handleEquipmentInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    equipmentFormData.value[id] = value;
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadEquipments();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      if (props.isVisible) {
        loadEquipments();
      }
    }
  });

  // Watch for changes to form data and save to IndexedDB
  watch([equipmentFormData], () => {
    if (props.student && props.isVisible) {
      saveEquipments();
    }
  }, { deep: true });

  async function loadEquipments() {
    try {
      const equipments = await getEquipments();
      if (equipments) {
        const quantities: Record<string, number> = {};

        // Extract quantities from the stored equipment objects
        Object.values(equipments).forEach((equipment: any) => {
          if (equipment && equipment.Id !== undefined && equipment.QuantityOwned !== undefined) {
            quantities[equipment.Id] = equipment.QuantityOwned;
          }
        });

        equipmentFormData.value = quantities;
      }
    } catch (error) {
      console.error('Error retrieving equipments from IndexedDB:', error);
    }
  }

  async function saveEquipments() {
    if (!props.student?.Equipments) return;
    await saveEquipmentsFromStudent(props.student, equipmentFormData);
  }

  return {
    equipmentFormData,
    handleEquipmentInput
  };
} 