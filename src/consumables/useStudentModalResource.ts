import { ref, watch } from 'vue';
import { StudentProps } from '../types/student';

export function useStudentModalResource(props: { 
  student: StudentProps | null,
  isVisible?: boolean
}, emit: (event: 'close') => void) {
  const resourceFormData = ref<Record<string, number>>({});

  function handleResourceInput(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value) || 0;
    resourceFormData.value[id] = value;
  }

  // Watch for changes to isVisible to load data when modal opens
  watch(() => props.isVisible, (newValue) => {
    if (newValue && props.student) {
      setTimeout(() => {
        loadResources();
      }, 50);
    }
  }, { immediate: true });

  // Watch for changes to the student prop to reset form when student changes
  watch(() => props.student, (newValue) => {
    if (newValue) {
      if (props.isVisible) {
        loadResources();
      }
    }
  });

  // Watch for changes to form data and save to localStorage
  watch([resourceFormData], () => {
    if (props.student && props.isVisible) {
      saveResources();
    }
  }, { deep: true });

  function loadResources() {
    try {
      const resourcesData = localStorage.getItem('resources');
      if (resourcesData) {
        const parsedData = JSON.parse(resourcesData);
        const quantities: Record<string, number> = {};
        
        // Extract quantities from the stored material objects
        Object.values(parsedData).forEach((material: any) => {
          if (material && material.Id !== undefined && material.QuantityOwned !== undefined) {
            quantities[material.Id] = material.QuantityOwned;
          }
        });
        
        resourceFormData.value = quantities;
      }
    } catch (error) {
      console.error('Error retrieving resources from localStorage:', error);
    }
  }

  function saveResources() {
    try {
      if (!props.student?.Materials) return;

      const resourceData = Object.values(props.student.Materials).reduce((acc, material: any) => {
        acc[material.Id] = {
          ...material,
          QuantityOwned: resourceFormData.value[material.Id] || 0
        };
        return acc;
      }, {} as Record<string, any>);

      localStorage.setItem('resources', JSON.stringify(resourceData));
    } catch (error) {
      console.error('Error saving resources to localStorage:', error);
    }
  }

  return {
    resourceFormData,
    handleResourceInput
  };
}
