<script setup lang="ts">
import { SortDirection, SortOption } from '@/types/header';
import { $t } from '@/locales';

defineProps<{
  currentSort: SortOption;
  sortDirection: SortDirection;
}>();

const emit = defineEmits<{
  'updateSort': [option: SortOption];
  'toggleDirection': [];
}>();

// Two side-by-side groups: inherent SchaleDB attributes vs user progression
// (form-backed investment keys; see toComparableValue in sortUtils).
const SORT_SECTIONS: Array<{ labelKey: string; options: SortOption[] }> = [
  { labelKey: 'sort.sectionInfo', options: ['id', 'name', 'default', 'school', 'club'] },
  { labelKey: 'sort.sectionProgress', options: ['bond', 'level', 'grade', 'equipment', 'skill', 'potential'] },
];
</script>

<template>
  <div class="sort-panel" role="menu">
    <div class="sort-panel-header">
      <span class="sort-panel-title">{{ $t('sort.method') }}</span>
      <button
        type="button"
        class="sort-direction-btn"
        @click="emit('toggleDirection')"
      >
        <span class="sort-direction-arrow" aria-hidden="true">{{ sortDirection === 'asc' ? '↑' : '↓' }}</span>
        <span>{{ sortDirection === 'asc' ? $t('direction.ascending') : $t('direction.descending') }}</span>
      </button>
    </div>

    <div class="sort-panel-body">
      <div
        v-for="section in SORT_SECTIONS"
        :key="section.labelKey"
        class="sort-section"
        role="group"
        :aria-label="$t(section.labelKey)"
      >
        <div class="sort-section-label">{{ $t(section.labelKey) }}</div>
        <button
          v-for="option in section.options"
          :key="option"
          type="button"
          class="sort-option"
          :class="{ active: option === currentSort }"
          role="menuitemradio"
          :aria-checked="option === currentSort"
          @click="emit('updateSort', option)"
        >
          <span>{{ $t(`sort.${option}`) }}</span>
          <svg v-if="option === currentSort" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Popover chrome mirrors FilterPanel; positioning (top/right/z-index) comes
   from the parent's .vc-popover class, same as the filter panel. */
.sort-panel {
  width: 280px;
  background-color: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

@media (min-width: 769px) {
  .sort-panel {
    width: 420px;
  }
}

.sort-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border-color);
}

.sort-panel-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.sort-direction-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
}

.sort-direction-btn:hover {
  background: var(--background-secondary);
}

.sort-direction-arrow {
  font-weight: 700;
  color: var(--accent-color);
  width: 12px;
  text-align: center;
}

/* Two columns side by side so the whole list fits without scrolling. */
.sort-panel-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 10px;
  padding: 8px 10px 10px;
}

.sort-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sort-section + .sort-section {
  border-left: 1px solid var(--border-color);
  padding-left: 10px;
}

.sort-section-label {
  padding: 2px 8px 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sort-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
}

.sort-option:hover {
  background: var(--background-secondary);
}

.sort-option.active {
  color: var(--accent-color);
}

.sort-option svg {
  flex-shrink: 0;
}
</style>
