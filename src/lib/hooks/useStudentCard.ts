import { computed, ref, type ComputedRef } from 'vue';
import { useStudentFormData } from '../stores/studentStore';
import { isStudentPinned, togglePinnedStudent } from '../utils/settingsStorage';
import { currentLanguage } from '../stores/localizationStore';

/**
 * Hook facade for StudentCard — aggregates the store, storage, and localization
 * imports so the component stays within the components → hooks boundary.
 */
export function useStudentCard(studentId: ComputedRef<number>) {
  const studentData = useStudentFormData(studentId);

  // Reactive version counter triggers isPinned recompute after a toggle,
  // replacing the ad-hoc forceUpdate ref that was previously in the component.
  const _pinnedVersion = ref(0);
  const isPinned = computed(() => {
    _pinnedVersion.value; // reactive dependency
    return isStudentPinned(studentId.value);
  });

  function togglePin(id: number): boolean {
    const result = togglePinnedStudent(id);
    _pinnedVersion.value++;
    return result;
  }

  return { studentData, isPinned, togglePin, currentLanguage };
}
