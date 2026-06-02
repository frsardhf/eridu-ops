<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { SortOption } from '@/types/header';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { $t } from '@/locales';
import GlobalNavbar from './GlobalNavbar.vue';
import FilterPanel from './FilterPanel.vue';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import { StudentFilters, countActiveFilters } from '@/types/filter';

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
  'updateFilter': [key: keyof StudentFilters, value: any[]];
  'clearFilters': [];
}>();

const showFilterPanel = ref(false);
const filterWrapEl = ref<HTMLElement | null>(null);

const activeFilterCount = computed(() =>
  props.filters ? countActiveFilters(props.filters) : 0
);

const SORT_OPTIONS: Array<{ value: SortOption; labelKey: string }> = [
  { value: 'id', labelKey: 'sort.id' },
  { value: 'name', labelKey: 'sort.name' },
  { value: 'default', labelKey: 'sort.default' },
  { value: 'bond', labelKey: 'sort.bond' },
  { value: 'level', labelKey: 'sort.level' },
  { value: 'grade', labelKey: 'sort.grade' },
  { value: 'school', labelKey: 'sort.school' },
  { value: 'club', labelKey: 'sort.club' },
];

const currentSortLabel = computed(() => {
  const selected = SORT_OPTIONS.find(o => o.value === props.currentSort);
  return selected ? $t(selected.labelKey) : $t('sort.default');
});

const sortSelectOptions = computed(() =>
  SORT_OPTIONS.map(o => ({ value: o.value, label: $t(o.labelKey) }))
);

function onSortChange(option: SortOption) {
  emit('updateSort', option);
}

// Pin button: show a transient hint that sorting is paused, but only when
// pinned mode is being turned ON.
const showPinHint = ref(false);
let pinHintTimer: ReturnType<typeof setTimeout> | null = null;

function onPinClick() {
  const willActivate = !props.isPinnedMode;
  emit('togglePinned');
  if (pinHintTimer) clearTimeout(pinHintTimer);
  if (willActivate) {
    showPinHint.value = true;
    pinHintTimer = setTimeout(() => { showPinHint.value = false; }, 4000);
  } else {
    showPinHint.value = false;
  }
}

onUnmounted(() => { if (pinHintTimer) clearTimeout(pinHintTimer); });

function updateSearch(event: Event) {
  emit('update:searchQuery', (event.target as HTMLInputElement).value);
}

// Not `.stop` — the click must bubble to window so the sort SelectMenu's own
// click-outside closes it when the filter button is pressed.
function toggleFilterPanel() {
  showFilterPanel.value = !showFilterPanel.value;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (showFilterPanel.value && filterWrapEl.value && !filterWrapEl.value.contains(target)) {
    showFilterPanel.value = false;
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
          class="app-navbar-icon-btn vc-pin-btn"
          type="button"
          :title="$t('sort.pinned')"
          @click.stop="onPinClick"
        >
          <span class="vc-pin-chip" :class="{ active: isPinnedMode }">
            <img :src="isPinnedMode ? '/assets/thumbtacks-active.png' : '/assets/thumbtacks.png'" class="vc-pin-icon" aria-hidden="true" />
          </span>
        </button>
        <Transition name="pin-hint">
          <div v-if="showPinHint" class="pin-hint" role="status">
            {{ $t('sort.pinnedHint') }}
          </div>
        </Transition>
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
      <SelectMenu
        :model-value="currentSort ?? 'default'"
        :options="sortSelectOptions"
        align="right"
        @update:model-value="onSortChange"
      >
        <template #trigger="{ open, toggle }">
          <button
            class="app-navbar-icon-btn"
            :class="{ active: open }"
            type="button"
            :title="currentSortLabel"
            @click="(e) => { showFilterPanel = false; toggle(e); }"
          >
            <svg width="26" height="20" viewBox="0 0 576 512" aria-hidden="true">
              <path fill="currentColor" d="M450.7 38c8.3 6 13.3 15.7 13.3 26v96h16c17.7 0 32 14.3 32 32s-14.3 32-32 32H432 384c-17.7 0-32-14.3-32-32s14.3-32 32-32h16V108.4l-5.9 2c-16.8 5.6-34.9-3.5-40.5-20.2s3.5-34.9 20.2-40.5l48-16c9.8-3.3 20.5-1.6 28.8 4.4zM160 32c9 0 17.5 3.8 23.6 10.4l88 96c11.9 13 11.1 33.3-2 45.2s-33.3 11.1-45.2-2L192 146.3V448c0 17.7-14.3 32-32 32s-32-14.3-32-32V146.3L95.6 181.6c-11.9 13-32.2 13.9-45.2 2s-13.9-32.2-2-45.2l88-96C142.5 35.8 151 32 160 32zM445.7 364.9A32 32 0 1 0 418.3 307a32 32 0 1 0 27.4 57.9zm-40.7 54.9C369.6 408.4 344 375.2 344 336c0-48.6 39.4-88 88-88s88 39.4 88 88c0 23.5-7.5 46.3-21.5 65.2L449.7 467c-10.5 14.2-30.6 17.2-44.8 6.7s-17.2-30.6-6.7-44.8l6.8-9.2z"/>
            </svg>
          </button>
        </template>
        <template #header>
          <button
            type="button"
            class="sort-direction-row"
            @click.stop="emit('toggleDirection')"
          >
            <span class="sort-direction-arrow">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
            <span class="sort-direction-label">
              {{ sortDirection === 'asc' ? $t('direction.ascending') : $t('direction.descending') }}
            </span>
          </button>
          <div class="sort-divider"></div>
        </template>
      </SelectMenu>
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

@media screen and (max-width: 768px) {
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

.vc-pin-wrap {
  position: relative;
  display: inline-flex;
}

/* Transient "sorting paused" hint shown when pinned mode is switched on. */
.pin-hint {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 1100;
  width: max-content;
  max-width: 220px;
  padding: 7px 10px;
  border-radius: 8px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  pointer-events: none;
}

.pin-hint-enter-active,
.pin-hint-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.pin-hint-enter-from,
.pin-hint-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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

/* Sort popover chrome comes from SelectMenu; these style its #header slot
   (rendered inside the teleported popover — scoped data-attr travels with it). */
.sort-direction-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 6px;
  text-align: left;
}

.sort-direction-row:hover {
  background: var(--background-secondary);
}

.sort-direction-arrow {
  font-weight: 700;
  color: var(--accent-color);
  width: 14px;
  text-align: center;
}

.sort-direction-label {
  font-weight: 600;
}

.sort-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

@media screen and (max-width: 768px) {
  /* Let search use the full width once the nav links are hidden. */
  .search-container {
    max-width: 100%;
  }

  .view-controls {
    gap: 0;
  }
}
</style>
