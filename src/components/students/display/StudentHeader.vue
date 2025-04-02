<script setup lang="ts">
import { defineProps, defineEmits, ref, onMounted, onBeforeUnmount } from 'vue';
import { HeaderProps } from '../../../types/header';
import { SortOption, SortDirection } from '../../../consumables/hooks/useStudentData';

const props = defineProps<HeaderProps>();
const dropdownOpen = ref(false);

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'toggleTheme': [];
  'updateSort': [option: SortOption];
  'toggleDirection': [];
}>();

function updateSearch(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:searchQuery', target.value);
}

function onToggleTheme() {
  emit('toggleTheme');
}

function updateSortOption(option: SortOption) {
  emit('updateSort', option);
  dropdownOpen.value = false;
}

function toggleDirection(event: Event) {
  event.stopPropagation(); // Prevent the dropdown from toggling
  emit('toggleDirection');
}

function toggleDropdown(event: Event) {
  event.stopPropagation();
  dropdownOpen.value = !dropdownOpen.value;
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const dropdown = document.getElementById('sort-dropdown');
  if (dropdown && !dropdown.contains(event.target as Node) && dropdownOpen.value) {
    dropdownOpen.value = false;
  }
}

// Use proper lifecycle hooks
onMounted(() => {
  window.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside);
});
</script>

<template>
  <header class="page-header">
    <div class="header-content">
      <div class="header-main">
        <div class="header-title-section">
          <h1 class="header-title">Students</h1>
          <div class="header-divider"></div>
        </div>
        
        <div class="search-section">
          <div class="search-container">
            <input
              id="search-input"
              name="search-input"
              :value="searchQuery"
              @input="updateSearch"
              type="text"
              class="search-input"
              placeholder="Search students..."
            />
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          
          <div class="sort-container" id="sort-dropdown">
            <button 
              class="sort-button"
              :class="{ 'active': dropdownOpen }"
              type="button"
            >
              <!-- Make sort direction icon clickable -->
              <span 
                class="sort-icon" 
                @click="toggleDirection"
                title="Toggle sort direction"
              >
                <svg v-if="sortDirection === 'asc'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M19 12l-7-7-7 7"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 19V5M5 12l7 7 7-7"/>
                </svg>
              </span>
              <!-- Make the text part clickable for dropdown -->
              <span 
                class="sort-text"
                @click="toggleDropdown"
              >
                {{ currentSort === 'id' ? 'ID' : currentSort === 'name' ? 'Name' : 'Default' }}
                <span class="sort-arrow">▼</span>
              </span>
            </button>
            <div class="sort-dropdown" v-if="dropdownOpen">
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'id' }"
                @click.stop="updateSortOption('id')"
              >
                ID
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'name' }"
                @click.stop="updateSortOption('name')"
              >
                Name
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'default' }"
                @click.stop="updateSortOption('default')"
              >
                Default
              </div>
            </div>
          </div>
        </div>

        <div class="theme-toggle">
          <label class="switch" for="theme-toggle">
            <input 
              id="theme-toggle"
              name="theme-toggle"
              type="checkbox" 
              :checked="isDarkMode"
              @change="onToggleTheme"
              aria-label="Toggle dark mode"
            >
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.search-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sort-container {
  position: relative;
}

.sort-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 36px;
  width: 120px;
  border-radius: 20px;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  border: none;
  padding: 0 15px;
  font-size: 0.9em;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.sort-button:hover, .sort-button.active {
  background-color: var(--background-tertiary);
}

.sort-icon {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}

.sort-icon:hover {
  opacity: 0.8;
}

.sort-text {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
  cursor: pointer;
}

.sort-arrow {
  font-size: 8px;
  margin-left: 4px;
  line-height: 1;
}

.sort-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 120px;
  margin-top: 5px;
  background-color: var(--background-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.sort-option {
  padding: 10px 0;
  width: 100%;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sort-option:hover {
  background-color: var(--background-secondary);
}

.sort-option.active {
  background-color: var(--background-tertiary);
  font-weight: 500;
}
</style>