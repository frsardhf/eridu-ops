import { computed, type ComputedRef } from 'vue';
import { useStudentFormData } from '../stores/studentStore';
import { pinnedIdSet, togglePinned } from '../stores/uiPrefsStore';
import { currentLanguage } from '../stores/localizationStore';

/**
 * Hook facade for StudentCard — aggregates the store, storage, and localization
 * imports so the component stays within the components → hooks boundary.
 */
export function useStudentCard(studentId: ComputedRef<number>) {
  const studentData = useStudentFormData(studentId);

  // Naturally reactive: pin state lives in uiPrefsStore (settings-backed), so
  // no version-counter hack is needed to observe localStorage changes.
  const isPinned = computed(() => pinnedIdSet.value.has(String(studentId.value)));

  function togglePin(id: number): boolean {
    return togglePinned(id);
  }

  return { studentData, isPinned, togglePin, currentLanguage };
}
