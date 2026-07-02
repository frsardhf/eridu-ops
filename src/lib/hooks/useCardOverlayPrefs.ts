/**
 * Per-card overlay visibility prefs (/students "eye" menu), backing the
 * `cardOverlays` AppSetting. Pinned = always shown, unpinned = hover-only,
 * undefined = all shown. Module-level singleton so the navbar and every
 * StudentCard share reactive state without prop-drilling through StudentGrid.
 */
import { ref, computed } from 'vue';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { CARD_OVERLAY_IDS, type CardOverlayId } from '@/types/card';

// undefined -> treat as "all shown"; an explicit array (incl. []) is user intent.
const _pinned = ref<CardOverlayId[] | undefined>(getSettings().cardOverlays);
const _shownSet = computed(() => new Set(_pinned.value ?? CARD_OVERLAY_IDS));

export function useCardOverlayPrefs() {
  const isShown = (id: CardOverlayId) => _shownSet.value.has(id);

  function persist(arr: CardOverlayId[]) {
    _pinned.value = arr;
    updateSetting('cardOverlays', arr);
  }

  function toggle(id: CardOverlayId) {
    const next = new Set(_shownSet.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Persist in canonical order so the stored array is stable.
    persist(CARD_OVERLAY_IDS.filter((o) => next.has(o)));
  }

  function setAll(value: boolean) {
    persist(value ? [...CARD_OVERLAY_IDS] : []);
  }

  return { ids: CARD_OVERLAY_IDS, isShown, toggle, setAll };
}
