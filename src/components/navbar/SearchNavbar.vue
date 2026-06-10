<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue';
import { SortOption } from '@/types/header';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { positionAtElement, useTooltip } from '@/composables/useTooltip';
import { $t } from '@/locales';
import GlobalNavbar from './GlobalNavbar.vue';
import FilterPanel from './FilterPanel.vue';
import SortPanel from './SortPanel.vue';
import { useCardOverlayPrefs } from '@/lib/hooks/useCardOverlayPrefs';
import { StudentFilters, StudentFilterValue, countActiveFilters } from '@/types/filter';

const props = defineProps<{
  searchQuery: string;
  currentSort?: SortOption;
  sortDirection?: 'asc' | 'desc';
  isPinnedMode?: boolean;
  filters?: StudentFilters;
  availableSchools?: string[];
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'updateSort': [option: SortOption];
  'toggleDirection': [];
  'togglePinned': [];
  'updateFilter': [key: keyof StudentFilters, value: StudentFilterValue];
  'clearFilters': [];
}>();

const showFilterPanel = ref(false);
const filterWrapEl = ref<HTMLElement | null>(null);

const showSortPanel = ref(false);
const sortWrapEl = ref<HTMLElement | null>(null);

// Card-overlay visibility checklist ("eye" menu).
const showOverlayMenu = ref(false);
const overlayWrapEl = ref<HTMLElement | null>(null);
const { ids: overlayIds, isShown: isOverlayShown, toggle: toggleOverlay, setAll: setOverlayAll } = useCardOverlayPrefs();
const overlayAllShown = computed(() => overlayIds.every(id => isOverlayShown(id)));
const overlaySomeShown = computed(() => overlayIds.some(id => isOverlayShown(id)));

const activeFilterCount = computed(() =>
  props.filters ? countActiveFilters(props.filters) : 0
);

// Every SortOption's label lives under the `sort.` locale namespace.
const currentSortLabel = computed(() => $t(`sort.${props.currentSort ?? 'default'}`));

function onSortChange(option: SortOption) {
  emit('updateSort', option);
  showSortPanel.value = false;
  // Sorting is paused while pinned — shake the pin hint instead of pretending
  // the pick took effect. The choice is still persisted for when pin turns off.
  if (props.isPinnedMode) showPinHint(true);
}

function onDirectionToggle() {
  emit('toggleDirection');
  if (props.isPinnedMode) showPinHint(true);
}

// Pin button: nudge that sorting is paused. Shown when pinned mode is turned
// ON, and re-shown with a shake when a sort change is attempted while pinned.
// Reuses the shared .modal-tooltip, anchored to the pin button (not the
// cursor — sort attempts happen over the sort panel) with an auto-hide.
const { activeTooltip, tooltipStyle, tooltipRef, hideTooltip } =
  useTooltip<'pinPaused'>();
const pinBtnEl = ref<HTMLElement | null>(null);
const pinHintShake = ref(false);
// :key bump recreates the tooltip node so the shake animation restarts on
// every repeated sort attempt, even while the hint is already visible.
const pinHintKey = ref(0);
let pinHintTimer: ReturnType<typeof setTimeout> | null = null;

async function showPinHint(shake: boolean) {
  if (!pinBtnEl.value) return;
  if (pinHintTimer) clearTimeout(pinHintTimer);
  pinHintShake.value = shake;
  if (shake) pinHintKey.value++;
  tooltipStyle.value = positionAtElement(pinBtnEl.value);
  activeTooltip.value = 'pinPaused';
  pinHintTimer = setTimeout(() => hideTooltip(), 4000);
  await nextTick();
  if (pinBtnEl.value && tooltipRef.value) {
    tooltipStyle.value = positionAtElement(pinBtnEl.value, tooltipRef.value);
  }
}

function onPinClick() {
  const willActivate = !props.isPinnedMode;
  emit('togglePinned');
  if (willActivate) {
    showPinHint(false);
  } else {
    if (pinHintTimer) clearTimeout(pinHintTimer);
    hideTooltip();
  }
}

onUnmounted(() => { if (pinHintTimer) clearTimeout(pinHintTimer); });

function updateSearch(event: Event) {
  emit('update:searchQuery', (event.target as HTMLInputElement).value);
}

// Filter / sort / overlay popovers are mutually exclusive — opening one
// closes the others.
function toggleFilterPanel() {
  showFilterPanel.value = !showFilterPanel.value;
  if (showFilterPanel.value) {
    showOverlayMenu.value = false;
    showSortPanel.value = false;
  }
}

function toggleSortPanel() {
  showSortPanel.value = !showSortPanel.value;
  if (showSortPanel.value) {
    showFilterPanel.value = false;
    showOverlayMenu.value = false;
  }
}

function toggleOverlayMenu() {
  showOverlayMenu.value = !showOverlayMenu.value;
  if (showOverlayMenu.value) {
    showFilterPanel.value = false;
    showSortPanel.value = false;
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (showFilterPanel.value && filterWrapEl.value && !filterWrapEl.value.contains(target)) {
    showFilterPanel.value = false;
  }
  if (showSortPanel.value && sortWrapEl.value && !sortWrapEl.value.contains(target)) {
    showSortPanel.value = false;
  }
  if (showOverlayMenu.value && overlayWrapEl.value && !overlayWrapEl.value.contains(target)) {
    showOverlayMenu.value = false;
  }
}

useClickOutside(handleClickOutside);
</script>

<template>
  <GlobalNavbar :compact="true">
    <!-- Mobile-only home button: nav links are hidden ≤768 on the compact navbar,
         so this lets phone users reach the landing page to switch routes. -->
    <RouterLink to="/" class="app-navbar-home-btn mobile-home-btn" aria-label="Home">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    </RouterLink>

    <div class="search-section">
      <div class="search-container">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="search-input"
          name="search-input"
          :value="searchQuery"
          type="text"
          class="search-input"
          :placeholder="$t('searchStudents')"
          @input="updateSearch"
        />
      </div>
    </div>

    <div class="view-controls">
      <!-- Pin -->
      <div class="vc-pin-wrap">
        <button
          ref="pinBtnEl"
          class="app-navbar-icon-btn vc-pin-btn"
          type="button"
          :title="$t('sort.pinned')"
          @click.stop="onPinClick"
        >
          <span class="vc-pin-chip" :class="{ active: isPinnedMode }">
            <img :src="isPinnedMode ? '/assets/thumbtacks-active.png' : '/assets/thumbtacks.png'" class="vc-pin-icon" aria-hidden="true" />
          </span>
        </button>
        <div
          v-if="activeTooltip !== null"
          :key="pinHintKey"
          ref="tooltipRef"
          class="modal-tooltip pin-hint"
          :class="{ 'pin-hint-shake': pinHintShake }"
          role="status"
          :style="tooltipStyle"
        >
          {{ $t('sort.pinnedHint') }}
        </div>
      </div>

      <!-- Filter -->
      <div ref="filterWrapEl" class="vc-popover-wrap">
        <button
          class="app-navbar-icon-btn"
          :class="{ active: showFilterPanel || activeFilterCount > 0 }"
          type="button"
          :title="$t('filter.title')"
          @click="toggleFilterPanel"
        >
          <svg width="26" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="currentColor"/>
          </svg>
          <span v-if="activeFilterCount > 0" class="vc-badge">{{ activeFilterCount }}</span>
        </button>
        <FilterPanel
          v-if="showFilterPanel && filters"
          class="vc-popover"
          :filters="filters"
          :available-schools="availableSchools ?? []"
          @update-filter="(key, val) => emit('updateFilter', key, val)"
          @clear-all="emit('clearFilters')"
        />
      </div>

      <!-- Sort -->
      <div ref="sortWrapEl" class="vc-popover-wrap">
        <button
          class="app-navbar-icon-btn"
          :class="{ active: showSortPanel }"
          type="button"
          :title="currentSortLabel"
          @click="toggleSortPanel"
        >
          <svg width="26" height="20" viewBox="0 0 576 512" aria-hidden="true">
            <path fill="currentColor" d="M450.7 38c8.3 6 13.3 15.7 13.3 26v96h16c17.7 0 32 14.3 32 32s-14.3 32-32 32H432 384c-17.7 0-32-14.3-32-32s14.3-32 32-32h16V108.4l-5.9 2c-16.8 5.6-34.9-3.5-40.5-20.2s3.5-34.9 20.2-40.5l48-16c9.8-3.3 20.5-1.6 28.8 4.4zM160 32c9 0 17.5 3.8 23.6 10.4l88 96c11.9 13 11.1 33.3-2 45.2s-33.3 11.1-45.2-2L192 146.3V448c0 17.7-14.3 32-32 32s-32-14.3-32-32V146.3L95.6 181.6c-11.9 13-32.2 13.9-45.2 2s-13.9-32.2-2-45.2l88-96C142.5 35.8 151 32 160 32zM445.7 364.9A32 32 0 1 0 418.3 307a32 32 0 1 0 27.4 57.9zm-40.7 54.9C369.6 408.4 344 375.2 344 336c0-48.6 39.4-88 88-88s88 39.4 88 88c0 23.5-7.5 46.3-21.5 65.2L449.7 467c-10.5 14.2-30.6 17.2-44.8 6.7s-17.2-30.6-6.7-44.8l6.8-9.2z"/>
          </svg>
        </button>
        <SortPanel
          v-if="showSortPanel"
          class="vc-popover"
          :current-sort="currentSort ?? 'default'"
          :sort-direction="sortDirection ?? 'asc'"
          @update-sort="onSortChange"
          @toggle-direction="onDirectionToggle"
        />
      </div>

      <!-- Separates the list controls (pin/filter/sort) from card-display (eye) -->
      <div class="vc-divider" aria-hidden="true"></div>

      <!-- Overlay visibility ("eye") — pick which stat overlays stay on cards -->
      <div ref="overlayWrapEl" class="vc-popover-wrap">
        <button
          class="app-navbar-icon-btn"
          :class="{ active: showOverlayMenu }"
          type="button"
          :title="$t('overlays.title')"
          @click="toggleOverlayMenu"
        >
          <svg width="24" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <div v-if="showOverlayMenu" class="overlay-popover vc-popover" role="menu">
          <div class="overlay-popover-title">{{ $t('overlays.title') }}</div>
          <button
            type="button"
            class="overlay-option"
            :class="{ active: overlayAllShown }"
            role="menuitemcheckbox"
            :aria-checked="overlayAllShown ? 'true' : (overlaySomeShown ? 'mixed' : 'false')"
            @click.stop="setOverlayAll(!overlayAllShown)"
          >
            <span class="overlay-check" :class="{ partial: overlaySomeShown && !overlayAllShown }" aria-hidden="true">
              <svg v-if="overlayAllShown" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg v-else-if="overlaySomeShown" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <line x1="6" y1="12" x2="18" y2="12" />
              </svg>
            </span>
            <span>{{ $t('overlays.selectAll') }}</span>
          </button>
          <div class="overlay-divider"></div>
          <button
            v-for="id in overlayIds"
            :key="id"
            type="button"
            class="overlay-option"
            :class="{ active: isOverlayShown(id) }"
            role="menuitemcheckbox"
            :aria-checked="isOverlayShown(id)"
            @click.stop="toggleOverlay(id)"
          >
            <span class="overlay-check" aria-hidden="true">
              <svg v-if="isOverlayShown(id)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </span>
            <span>{{ $t(`overlays.${id}`) }}</span>
          </button>
        </div>
      </div>
    </div>
  </GlobalNavbar>
</template>

<style scoped>
/* Mobile home button — hidden on desktop (the navbar's own home/nav links show
   there), revealed once those are hidden on the compact navbar (≤768). */
.mobile-home-btn {
  display: none;
  flex-shrink: 0;
  margin-right: 8px;
}

@media screen and (max-width: 960px) {
  .mobile-home-btn {
    display: inline-flex;
  }
}

/* Search sits immediately after the nav links. */
.search-section {
  display: flex;
  align-items: center;
  /* Grow to fill the middle slot, but shrink (down to nothing) before the
     view-controls collide with the right-hand global controls. */
  flex: 1 1 auto;
  min-width: 0;
}

.search-container {
  position: relative;
  width: 100%;
  max-width: 22ch;
  min-width: 0;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 0.75rem 0 2.25rem;
  border: 1px solid var(--input-border);
  border-radius: 18px;
  font-size: 0.9rem;
  color: var(--text-primary);
  background: var(--input-background);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.1);
}

.search-icon {
  position: absolute;
  left: 0.6rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.1rem;
  height: 1.1rem;
  color: var(--text-secondary);
  pointer-events: none;
}

/* View controls — pin, filter, sort. margin-left: auto pushes them to the
   right edge of the AppNavbar middle slot. */
.view-controls {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.vc-popover-wrap {
  position: relative;
}

/* Subtle in-group separator: list controls (pin/filter/sort) | card display (eye) */
.vc-divider {
  align-self: stretch;
  width: 1px;
  margin: 6px 3px;
  background: var(--border-color);
}

.vc-pin-wrap {
  position: relative;
  display: inline-flex;
}

/* The "sorting paused" nudge reuses the shared .modal-tooltip (studentModal.css,
   position: fixed) anchored to the pin button via positionAtElement. Raised
   above the sort/filter popovers (.vc-popover z-index 1100) so it stays
   visible when a sort attempt happens with the panel still open. */
.pin-hint {
  z-index: 1200;
}

.pin-hint-shake {
  animation: pin-hint-shake 0.45s ease-in-out;
}

@keyframes pin-hint-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

/* Pin keeps the round chip style (grey idle, yellow active) from student cards. */
.vc-pin-btn:hover,
.vc-pin-btn.active {
  background-color: transparent;
}

.vc-pin-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: #a6a6a6;
  transition: background-color 0.15s ease;
}

.vc-pin-btn:hover .vc-pin-chip,
.vc-pin-chip.active {
  background-color: var(--color-pin-active);
}

.vc-pin-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.7;
  transition: opacity 0.15s ease;
}

.vc-pin-btn:hover .vc-pin-icon,
.vc-pin-chip.active .vc-pin-icon {
  opacity: 1;
}

.vc-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 999px;
  background-color: var(--accent-color);
  color: var(--background-primary);
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 14px;
  text-align: center;
  pointer-events: none;
}

.vc-popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 1100;
}

/* Overlay-visibility ("eye") checklist popover */
.overlay-popover {
  min-width: 156px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

.overlay-popover-title {
  padding: 6px 10px 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-tertiary);
}

.overlay-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 6px;
  text-align: left;
}

.overlay-option:hover {
  background: var(--background-secondary);
}

.overlay-option.active {
  color: var(--accent-color);
  font-weight: 600;
}

.overlay-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border-color);
  border-radius: 4px;
  flex-shrink: 0;
  color: var(--accent-color);
}

.overlay-option.active .overlay-check {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
}

/* Indeterminate (some-but-not-all) state for the Select all row. */
.overlay-check.partial {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.overlay-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

</style>
