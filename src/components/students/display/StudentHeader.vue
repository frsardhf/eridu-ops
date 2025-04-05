<script setup lang="ts">
import { defineProps, defineEmits, ref, onMounted, onBeforeUnmount } from 'vue';
import { HeaderProps } from '../../../types/header';
import { SortOption } from '../../../consumables/hooks/useStudentData';

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
.page-header {
  padding: 1.5rem 2rem;
  background: linear-gradient(
    to right,
    var(--header-gradient-start),
    var(--header-gradient-end)
  );
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.header-title-section {
  flex-shrink: 0;
}

.header-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  padding: 0;
  letter-spacing: -0.025em;
}

.header-divider {
  height: 3px;
  width: 60px;
  background: var(--accent-color);
  margin-top: 0.5rem;
  border-radius: 2px;
}

.search-container {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  padding-right: 2.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  color: black;
  background: white;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #a0a5ff;
  box-shadow: 0 0 0 3px rgba(100, 108, 255, 0.1);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: #94a3b8;
  pointer-events: none;
}

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

/* Theme toggle styles */
.theme-toggle {
  margin-left: 1rem;
  display: flex;
  align-items: center;
}

.switch {
  position: relative;
  display: inline-block;
  width: 46px;
  height: 26px;
  margin: 3px 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  height: 28px;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #e9e9ea;
  transition: .4s;
  border-radius: 26px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
  border: 0.5px solid rgba(0, 0, 0, 0.04);
}

.slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

input:checked + .slider {
  background-color: var(--accent-color);
}

input:checked + .slider:before {
  transform: translateX(18px);
}

/* Media Queries */
@media screen and (max-width: 768px) {
  .page-header {
    padding: 1rem;
  }

  .header-main {
    flex-direction: column;
    align-items: stretch;
    gap: 0.3rem;
  }

  .header-title {
    font-size: 1.75rem;
  }

  .search-section {
    max-width: none;
    margin-bottom: 0;
  }

  .theme-toggle {
    margin-left: 0;
  }
}

@media screen and (min-width: 1600px) {
  .student-grid {
    gap: 1.5rem;
  }
}
</style>