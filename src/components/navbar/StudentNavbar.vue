<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { HeaderProps, SortOption } from '@/types/header';
import {
  downloadLocalStorageData
} from '@/consumables/utils/studentStorage';
import { currentLanguage, setLanguage, Language } from '@/consumables/stores/localizationStore';
import { $t } from '@/locales';
import { ThemeId } from '@/types/theme';
import { THEME_OPTIONS } from '@/consumables/utils/themeUtils';
import ImportModal from './ImportModal.vue';
import CreditsModal from './CreditsModal.vue';
import ContactModal from './ContactModal.vue';

const props = defineProps<HeaderProps>();
const dropdownOpen = ref(false);
const mobileMenuOpen = ref(false);
const showImportModal = ref(false);
const showCreditsModal = ref(false);
const showContactModal = ref(false);
const showThemeTray = ref(false);

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'setTheme': [themeId: ThemeId];
  'updateSort': [option: SortOption];
  'toggleDirection': [];
  'dataImported': [];
  'reinitializeData': [];
}>();

const SORT_OPTIONS: Array<{ value: SortOption; labelKey: string }> = [
  { value: 'id', labelKey: 'sort.id' },
  { value: 'name', labelKey: 'sort.name' },
  { value: 'default', labelKey: 'sort.default' },
  { value: 'bond', labelKey: 'sort.bond' },
  { value: 'level', labelKey: 'sort.level' },
  { value: 'grade', labelKey: 'sort.grade' },
  { value: 'school', labelKey: 'sort.school' },
  { value: 'club', labelKey: 'sort.club' }
];

const currentSortLabel = computed(() => {
  const selected = SORT_OPTIONS.find(option => option.value === props.currentSort);
  return selected ? $t(selected.labelKey) : $t('sort.default');
});

function updateSearch(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:searchQuery', target.value);
}

function onSelectTheme(themeId: ThemeId) {
  emit('setTheme', themeId);
  showThemeTray.value = false;
}

function updateSortOption(option: SortOption) {
  emit('updateSort', option);
  dropdownOpen.value = false;
  mobileMenuOpen.value = false;
}

function toggleDirection() {
  emit('toggleDirection');
}

function toggleDropdown(event: Event) {
  event.stopPropagation();
  dropdownOpen.value = !dropdownOpen.value;
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function toggleThemeTray(event: Event) {
  event.stopPropagation();
  showThemeTray.value = !showThemeTray.value;
}

function changeLanguage(language: Language) {
  setLanguage(language);
  mobileMenuOpen.value = false;
  emit('reinitializeData'); // Trigger data reinitialization with new language
}

function handleClickOutside(event: MouseEvent) {
  const dropdown = document.getElementById('sort-dropdown');
  const mobileMenu = document.getElementById('mobile-menu');
  const themeTray = document.getElementById('theme-tray');
  const themeTrayToggle = document.getElementById('theme-tray-toggle');
  
  if (dropdown && !dropdown.contains(event.target as Node) && dropdownOpen.value) {
    dropdownOpen.value = false;
  }
  
  if (themeTray && !themeTray.contains(event.target as Node) &&
      !themeTrayToggle?.contains(event.target as Node) &&
      showThemeTray.value) {
    showThemeTray.value = false;
  }
  
  if (mobileMenu && !mobileMenu.contains(event.target as Node) && 
      !document.getElementById('mobile-menu-toggle')?.contains(event.target as Node) && 
      mobileMenuOpen.value) {
    mobileMenuOpen.value = false;
  }
}

async function exportData() {
  await downloadLocalStorageData();
  mobileMenuOpen.value = false;
}

function openImportModal() {
  showImportModal.value = true;
  mobileMenuOpen.value = false;
}

function closeImportModal() {
  showImportModal.value = false;
}

function openCreditsModal() {
  showCreditsModal.value = true;
  mobileMenuOpen.value = false;
}

function closeCreditsModal() {
  showCreditsModal.value = false;
}

function handleImportSuccess() {
  emit('dataImported');
}

function openContactModal() {
  showContactModal.value = true;
  mobileMenuOpen.value = false;
}

function closeContactModal() {
  showContactModal.value = false;
}

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
        <div class="header-title-section mobile-hidden">
          <h1 class="header-title">{{ $t('students') }}</h1>
          <div class="header-divider"></div>
        </div>
        
        <div class="search-section">
          <div class="search-container" id="sort-dropdown">
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
              @input="updateSearch"
              type="text"
              class="search-input"
              :placeholder="$t('searchStudents')"
            />

            <div class="sort-container">
              <div class="sort-controls" :class="{ active: dropdownOpen }">
                <button
                  class="sort-icon-button"
                  type="button"
                  @click="toggleDirection"
                  :title="sortDirection === 'asc' ? $t('direction.ascending') : $t('direction.descending')"
                >
                  <span class="sort-direction-label">
                    {{ sortDirection === 'asc' ? '↑' : '↓' }} 
                  </span>
                </button>

                <button
                  class="sort-button"
                  type="button"
                  @click="toggleDropdown"
                >
                  <span class="sort-text">{{ currentSortLabel }}</span>
                  <span class="sort-arrow">▼</span>
                </button>
              </div>
            </div>

            <div class="sort-dropdown" v-if="dropdownOpen">
              <div
                v-for="option in SORT_OPTIONS"
                :key="option.value"
                class="sort-option"
                :class="{ 'active': currentSort === option.value }"
                @click.stop="updateSortOption(option.value)"
              >
                {{ $t(option.labelKey) }}
              </div>
            </div>
          </div>
        </div>

        <div class="right-controls">
          <div class="theme-tray-wrapper">
            <button
              id="theme-tray-toggle"
              class="theme-tray-toggle"
              type="button"
              aria-label="Theme colors"
              @click="toggleThemeTray"
            >
              <span class="theme-tray-toggle-dot"></span>
            </button>

            <div
              id="theme-tray"
              class="theme-tray"
              :class="{ open: showThemeTray }"
            >
              <div class="theme-swatch-row" role="radiogroup" aria-label="Theme">
                <button
                  v-for="theme in THEME_OPTIONS"
                  :key="theme.id"
                  class="theme-swatch"
                  :class="{ active: currentTheme === theme.id }"
                  type="button"
                  :title="theme.label"
                  :aria-label="`Theme ${theme.label}`"
                  :aria-checked="currentTheme === theme.id"
                  role="radio"
                  @click="onSelectTheme(theme.id)"
                >
                  <span
                    class="theme-swatch-inner"
                    :style="{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }"
                  ></span>
                </button>
              </div>
            </div>
          </div>
          
          <button 
            id="mobile-menu-toggle"
            class="hamburger-button"
            @click="toggleMobileMenu"
            aria-label="Menu"
          >
            <div class="hamburger-icon" :class="{ 'open': mobileMenuOpen }">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>
    </div>
    
    <div
      v-if="mobileMenuOpen"
      id="mobile-menu"
      class="mobile-menu open"
    >
      <div class="mobile-menu-container">
        <!-- Language section for mobile -->
        <div class="mobile-menu-section">
          <h3 class="mobile-menu-heading">Language / 言語</h3>
          <div class="mobile-menu-options">
            <button 
              class="mobile-menu-option" 
              :class="{ 'active': currentLanguage === 'en' }"
              @click="changeLanguage('en')"
            >
              English
            </button>
            <button 
              class="mobile-menu-option" 
              :class="{ 'active': currentLanguage === 'jp' }"
              @click="changeLanguage('jp')"
            >
              日本語
            </button>
          </div>
        </div>
        
        <div class="mobile-menu-section">
          <h3 class="mobile-menu-heading">{{ $t('data') }}</h3>
          <div class="mobile-menu-options">
            <button class="mobile-menu-option" @click="exportData">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="option-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {{ $t('exportData') }}
            </button>
            <button class="mobile-menu-option" @click="openImportModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="option-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {{ $t('importData') }}
            </button>
          </div>
        </div>
        
        <div class="mobile-menu-section">
          <h3 class="mobile-menu-heading">{{ $t('app') }}</h3>
          <div class="mobile-menu-options">
            <button class="mobile-menu-option" @click="openContactModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              {{ $t('contact') }}
            </button>
            <button class="mobile-menu-option" @click="openCreditsModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 14v-0.5c0-1.2 0.8-2 1.7-2.8 0.7-0.6 1.3-1.2 1.3-2.2 0-1.4-1.2-2.5-2.7-2.5-1.5 0-2.6 0.9-2.9 2.4"></path>
                <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor"></circle>
              </svg>
              {{ $t('credits') }}
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Import Modal -->
    <ImportModal 
      v-if="showImportModal"
      @close="closeImportModal"
      @import-success="handleImportSuccess"
    />
    
    <!-- Credits Modal -->
    <CreditsModal
      v-if="showCreditsModal"
      @close="closeCreditsModal"
    />

    <!-- Contact Modal -->
    <ContactModal
      v-if="showContactModal"
      @close="closeContactModal"
    />
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
  position: relative;
}

.header-content {
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.search-section {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
  justify-content: center;
  max-width: 600px;
  margin: 0 1rem;
}

.search-container {
  position: relative;
  width: 100%;
  max-width: 420px;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0.5rem 0.75rem 0.5rem 2.5rem;
  padding-right: 10rem;
  border: 1px solid var(--input-border);
  border-radius: 20px;
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--input-background);
  transition: all 0.2s;
}

.search-input:focus {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.1);
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: var(--text-secondary);
  pointer-events: none;
}

.sort-container {
  position: absolute;
  right: 0.4rem;
  top: 50%;
  transform: translateY(-50%);
}

.sort-controls {
  display: flex;
  align-items: center;
  height: 32px;
  border-radius: 999px;
  border: 1px solid var(--input-border);
  background-color: var(--background-secondary);
  overflow: hidden;
  transition: border-color 0.2s ease;
}

.sort-controls:hover,
.sort-controls.active {
  border-color: var(--accent-color);
}

.sort-controls:focus-within {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.35);
}

.sort-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  max-width: 120px;
  background-color: transparent;
  color: var(--text-primary);
  border: none;
  border-left: 1px solid var(--input-border);
  padding: 0 12px;
  font-size: 0.82em;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sort-button:hover {
  background-color: var(--background-secondary);
}

.sort-icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px 0 16px;
  width: 6px;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sort-icon-button:hover {
  background-color: var(--background-secondary);
}

.sort-button:focus-visible,
.sort-icon-button:focus-visible {
  outline: none;
}

.sort-direction-label {
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--text-primary);
  line-height: 1;
}

.sort-text {
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 84px;
}

.sort-arrow {
  font-size: 8px;
  margin-left: 4px;
  line-height: 1;
}

.sort-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 160px;
  margin-top: 5px;
  background-color: var(--background-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.sort-option {
  padding: 10px 12px;
  width: 100%;
  text-align: left;
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

.right-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.desktop-controls {
  display: flex;
  gap: 8px;
}

.data-button {
  background-color: var(--background-secondary);
  border: none;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.data-button:hover {
  background-color: var(--background-tertiary);
}

.theme-swatch-row {
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 7px 9px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-color-rgb), 0.28);
  background: var(--background-primary);
  background: color-mix(in srgb, var(--background-primary) 80%, white 20%);
  box-shadow: 0 8px 20px rgba(var(--background-hover-rgb), 0.22);
}

.theme-tray-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.theme-tray-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-color-rgb), 0.4);
  background: var(--background-secondary);
  background: color-mix(in srgb, var(--background-secondary) 78%, white 22%);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.theme-tray-toggle-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: linear-gradient(135deg, #4f46e5, #7c3aed 40%, #e61b72 70%, #ff6a00);
}

.theme-tray {
  position: absolute;
  top: calc(100% + 10px);
  right: -2px;
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 1200;
}

.theme-tray::before {
  content: '';
  position: absolute;
  top: -7px;
  right: 12px;
  width: 12px;
  height: 12px;
  background: var(--background-primary);
  border-left: 1px solid rgba(var(--accent-color-rgb), 0.28);
  border-top: 1px solid rgba(var(--accent-color-rgb), 0.28);
  transform: rotate(45deg);
}

.theme-tray.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.theme-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
}

.theme-swatch-inner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.theme-swatch.active {
  border-color: var(--accent-color);
  transform: scale(1.05);
}

.hamburger-button {
  background: transparent;
  border: none;
  padding: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 40px;
  height: 40px;
  transition: background-color 0.2s;
  border-radius: 50%;
}

.hamburger-button:hover {
  background-color: rgba(var(--background-hover-rgb), 0.1);
}

.hamburger-icon {
  width: 24px;
  height: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger-icon span {
  display: block;
  height: 3px;
  width: 100%;
  background-color: var(--text-primary);
  border-radius: 3px;
  transition: all 0.3s ease;
}

.hamburger-icon.open span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.hamburger-icon.open span:nth-child(2) {
  opacity: 0;
}

.hamburger-icon.open span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

.mobile-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 100%;
  max-width: 300px;
  max-height: 100vh;
  overflow-y: auto;
  background-color: var(--background-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 0 0 0 10px;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}

.mobile-menu.open {
  transform: translateX(0);
}

.mobile-menu-container {
  padding: 1rem;
}

.mobile-menu-section {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1rem;
}

.mobile-menu-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.mobile-menu-heading {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
}

.mobile-menu-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mobile-menu-option {
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.95rem;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color 0.2s;
}

.mobile-menu-option:hover {
  background-color: rgba(var(--background-hover-rgb), 0.1);
}

.mobile-menu-option.active {
  background-color: rgba(var(--accent-color-rgb), 0.1);
  font-weight: 500;
}

.option-icon {
  flex-shrink: 0;
}

.mobile-hidden {
  display: block;
}

@media screen and (max-width: 768px) {
  .page-header {
    padding: 1rem;
  }
  
  .header-main {
    align-items: center;
  }
  
  .mobile-hidden {
    display: none;
  }
  
  .header-title {
    font-size: 1.5rem;
  }
  
  .header-divider {
    width: 40px;
  }
  
  .search-section {
    max-width: none;
    gap: 5px;
  }
  
  .mobile-menu {
    max-width: 100%;
  }
  
  .search-container {
    max-width: 100%;
  }

  .search-input {
    padding-right: 8.25rem;
  }

  .sort-button {
    max-width: 95px;
    padding: 0 8px;
  }

  .sort-text {
    max-width: 68px;
  }

  .right-controls {
    gap: 8px;
  }

  .theme-swatch-row {
    gap: 2px;
    padding: 5px 7px;
  }

  .theme-tray-toggle {
    width: 28px;
    height: 28px;
  }

  .theme-tray-toggle-dot {
    width: 13px;
    height: 13px;
  }

  .theme-swatch {
    width: 18px;
    height: 18px;
  }

  .theme-swatch-inner {
    width: 13px;
    height: 13px;
  }

  .theme-tray {
    right: -4px;
  }
}

@media screen and (max-width: 480px) {
  .search-section {
    flex-grow: 1;
  }
  
  .search-container {
    max-width: none;
  }
}
</style>
