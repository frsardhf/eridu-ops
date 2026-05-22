<script setup lang="ts">
import { computed, ref } from 'vue';
import { SortOption } from '@/types/header';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { $t } from '@/locales';
import GlobalNavbar from './GlobalNavbar.vue';
import FilterPanel from './FilterPanel.vue';
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

const dropdownOpen = ref(false);
const showFilterPanel = ref(false);
const filterWrapEl = ref<HTMLElement | null>(null);
const sortWrapEl = ref<HTMLElement | null>(null);

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

function updateSearch(event: Event) {
  emit('update:searchQuery', (event.target as HTMLInputElement).value);
}

function toggleDropdown(event: Event) {
  event.stopPropagation();
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value) showFilterPanel.value = false;
}

function toggleFilterPanel(event: Event) {
  event.stopPropagation();
  showFilterPanel.value = !showFilterPanel.value;
  if (showFilterPanel.value) dropdownOpen.value = false;
}

function updateSortOption(option: SortOption) {
  emit('updateSort', option);
  dropdownOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (dropdownOpen.value && sortWrapEl.value && !sortWrapEl.value.contains(target)) {
    dropdownOpen.value = false;
  }
  if (showFilterPanel.value && filterWrapEl.value && !filterWrapEl.value.contains(target)) {
    showFilterPanel.value = false;
  }
}

useClickOutside(handleClickOutside);
</script>

<template>
  <GlobalNavbar :compact="true">
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
      <button
        class="app-navbar-icon-btn vc-pin-btn"
        type="button"
        :title="$t('sort.pinned')"
        @click.stop="emit('togglePinned')"
      >
        <span class="vc-pin-chip" :class="{ active: isPinnedMode }">
          <img src="/assets/push-pin.png" class="vc-pin-icon" aria-hidden="true" />
        </span>
      </button>

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
          :class="{ active: dropdownOpen }"
          type="button"
          :title="currentSortLabel"
          @click="toggleDropdown"
        >
          <svg width="26" height="20" viewBox="0 0 576 512" aria-hidden="true">
            <path fill="currentColor" d="M450.7 38c8.3 6 13.3 15.7 13.3 26v96h16c17.7 0 32 14.3 32 32s-14.3 32-32 32H432 384c-17.7 0-32-14.3-32-32s14.3-32 32-32h16V108.4l-5.9 2c-16.8 5.6-34.9-3.5-40.5-20.2s3.5-34.9 20.2-40.5l48-16c9.8-3.3 20.5-1.6 28.8 4.4zM160 32c9 0 17.5 3.8 23.6 10.4l88 96c11.9 13 11.1 33.3-2 45.2s-33.3 11.1-45.2-2L192 146.3V448c0 17.7-14.3 32-32 32s-32-14.3-32-32V146.3L95.6 181.6c-11.9 13-32.2 13.9-45.2 2s-13.9-32.2-2-45.2l88-96C142.5 35.8 151 32 160 32zM445.7 364.9A32 32 0 1 0 418.3 307a32 32 0 1 0 27.4 57.9zm-40.7 54.9C369.6 408.4 344 375.2 344 336c0-48.6 39.4-88 88-88s88 39.4 88 88c0 23.5-7.5 46.3-21.5 65.2L449.7 467c-10.5 14.2-30.6 17.2-44.8 6.7s-17.2-30.6-6.7-44.8l6.8-9.2z"/>
          </svg>
        </button>
        <div v-if="dropdownOpen" class="sort-popover vc-popover">
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
          <div class="sort-options-list">
            <button
              v-for="option in SORT_OPTIONS"
              :key="option.value"
              type="button"
              class="sort-option"
              :class="{ active: currentSort === option.value }"
              @click.stop="updateSortOption(option.value)"
            >
              <span>{{ $t(option.labelKey) }}</span>
              <svg v-if="currentSort === option.value" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </GlobalNavbar>
</template>

<style scoped>
/* Search sits immediately after the nav links. */
.search-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.search-container {
  position: relative;
  width: 20ch;
  max-width: 100%;
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
  margin-left: auto;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 10px;
}

.vc-popover-wrap {
  position: relative;
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
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: #a6a6a6;
  transition: background-color 0.15s ease;
}

.vc-pin-btn:hover .vc-pin-chip,
.vc-pin-chip.active {
  background-color: var(--color-pin-active);
}

.vc-pin-icon {
  width: 14px;
  height: 14px;
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

/* Sort popover */
.sort-popover {
  min-width: 100px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 4px;
}

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

.sort-options-list {
  display: flex;
  flex-direction: column;
}

.sort-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.sort-option:hover {
  background: var(--background-secondary);
}

.sort-option.active {
  color: var(--accent-color);
  font-weight: 600;
}

@media screen and (max-width: 768px) {
  .search-section {
    flex-grow: 1;
    min-width: 0;
  }

  .search-container {
    width: 100%;
    max-width: 100%;
  }

  .view-controls {
    gap: 0;
  }
}
</style>
