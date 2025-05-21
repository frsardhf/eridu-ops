<script setup lang="ts">
import { defineProps, defineEmits, ref, onMounted, onBeforeUnmount } from 'vue';
import { HeaderProps, SortOption } from '../../types/header';
import { 
  downloadLocalStorageData
} from '../../consumables/utils/studentStorage';
import { currentLanguage, setLanguage, Language } from '../../consumables/stores/localizationStore';
import { $t } from '../../locales';
import ImportModal from './ImportModal.vue';
import CreditsModal from './CreditsModal.vue';
import ContactModal from './ContactModal.vue';

const props = defineProps<HeaderProps>();
const dropdownOpen = ref(false);
const mobileMenuOpen = ref(false);
const showImportModal = ref(false);
const showCreditsModal = ref(false);
const showContactModal = ref(false);
const showLanguageMenu = ref(false);

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'toggleTheme': [];
  'updateSort': [option: SortOption];
  'toggleDirection': [];
  'dataImported': [];
  'reinitializeData': [];
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
  mobileMenuOpen.value = false;
}

function toggleDirection(event: Event) {
  event.stopPropagation();
  emit('toggleDirection');
}

function toggleDropdown(event: Event) {
  event.stopPropagation();
  dropdownOpen.value = !dropdownOpen.value;
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

function toggleLanguageMenu(event: Event) {
  event.stopPropagation();
  showLanguageMenu.value = !showLanguageMenu.value;
}

function changeLanguage(language: Language) {
  setLanguage(language);
  showLanguageMenu.value = false;
  mobileMenuOpen.value = false;
  emit('reinitializeData'); // Trigger data reinitialization with new language
}

function handleClickOutside(event: MouseEvent) {
  const dropdown = document.getElementById('sort-dropdown');
  const mobileMenu = document.getElementById('mobile-menu');
  const languageMenu = document.getElementById('language-menu');
  
  if (dropdown && !dropdown.contains(event.target as Node) && dropdownOpen.value) {
    dropdownOpen.value = false;
  }
  
  if (languageMenu && !languageMenu.contains(event.target as Node) && 
      !document.getElementById('language-toggle')?.contains(event.target as Node) && 
      showLanguageMenu.value) {
    showLanguageMenu.value = false;
  }
  
  if (mobileMenu && !mobileMenu.contains(event.target as Node) && 
      !document.getElementById('mobile-menu-toggle')?.contains(event.target as Node) && 
      mobileMenuOpen.value) {
    mobileMenuOpen.value = false;
  }
}

function exportData() {
  downloadLocalStorageData();
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
          <div class="search-container">
            <input
              id="search-input"
              name="search-input"
              :value="searchQuery"
              @input="updateSearch"
              type="text"
              class="search-input"
              :placeholder="$t('searchStudents')"
            />
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </div>
          
          <div class="sort-container desktop-only" id="sort-dropdown">
            <button 
              class="sort-button"
              :class="{ 'active': dropdownOpen }"
              type="button"
            >
              <span 
                class="sort-icon" 
                @click="toggleDirection"
                :title="sortDirection === 'asc' ? $t('direction.ascending') : $t('direction.descending')"
              >
                <svg v-if="sortDirection === 'asc'" xmlns="http://www.w3.org/2000/svg" 
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                  stroke-width="2">
                  <path d="M12 5v14M19 12l-7-7-7 7"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 19V5M5 12l7 7 7-7"/>
                </svg>
              </span>
              <span 
                class="sort-text"
                @click="toggleDropdown"
              >
                {{ 
                  currentSort === 'id' ? $t('sort.id') : 
                  currentSort === 'name' ? $t('sort.name') : 
                  currentSort === 'bond' ? $t('sort.bond') : 
                  currentSort === 'level' ? $t('sort.level') : 
                  currentSort === 'grade' ? $t('sort.grade') : $t('sort.default') 
                }}
                <span class="sort-arrow">▼</span>
              </span>
            </button>
            <div class="sort-dropdown" v-if="dropdownOpen">
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'id' }"
                @click.stop="updateSortOption('id')"
              >
                {{ $t('sort.id') }}
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'name' }"
                @click.stop="updateSortOption('name')"
              >
                {{ $t('sort.name') }}
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'default' }"
                @click.stop="updateSortOption('default')"
              >
                {{ $t('sort.default') }}
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'bond' }"
                @click.stop="updateSortOption('bond')"
              >
                {{ $t('sort.bond') }}
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'level' }"
                @click.stop="updateSortOption('level')"
              >
                {{ $t('sort.level') }}
              </div>
              <div 
                class="sort-option" 
                :class="{ 'active': currentSort === 'grade' }"
                @click.stop="updateSortOption('grade')"
              >
                {{ $t('sort.grade') }}
              </div>
            </div>
          </div>
        </div>

        <div class="right-controls">
          <!-- Language selector -->
          <div class="language-toggle" id="language-menu">
            <button 
              id="language-toggle"
              class="language-button"
              @click="toggleLanguageMenu"
              :title="currentLanguage === 'en' ? 'English' : '日本語'"
            >
              {{ currentLanguage === 'en' ? 'EN' : 'JP' }}
            </button>
            <div class="language-dropdown" v-if="showLanguageMenu">
              <div 
                class="language-option" 
                :class="{ 'active': currentLanguage === 'en' }"
                @click="changeLanguage('en')"
              >
                English
              </div>
              <div 
                class="language-option" 
                :class="{ 'active': currentLanguage === 'jp' }"
                @click="changeLanguage('jp')"
              >
                日本語
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
    
    <div class="mobile-menu" :class="{ 'open': mobileMenuOpen }" id="mobile-menu">
      <div class="mobile-menu-container">
        <div class="mobile-menu-content">
          <div class="mobile-menu-section">
            <h3 class="mobile-menu-heading">{{ $t('sort.default') }}</h3>
            <div class="mobile-menu-options">
              <button 
                class="mobile-menu-option" 
                :class="{ 'active': currentSort === 'id' }"
                @click="updateSortOption('id')"
              >
                {{ $t('sort.id') }}
              </button>
              <button 
                class="mobile-menu-option" 
                :class="{ 'active': currentSort === 'name' }"
                @click="updateSortOption('name')"
              >
                {{ $t('sort.name') }}
              </button>
              <button 
                class="mobile-menu-option" 
                :class="{ 'active': currentSort === 'default' }"
                @click="updateSortOption('default')"
              >
                {{ $t('sort.default') }}
              </button>
              <button 
                class="mobile-menu-option" 
                :class="{ 'active': currentSort === 'bond' }"
                @click="updateSortOption('bond')"
              >
                {{ $t('sort.bond') }}
              </button>
              <button 
                class="mobile-menu-option" 
                :class="{ 'active': currentSort === 'level' }"
                @click="updateSortOption('level')"
              >
                {{ $t('sort.level') }}
              </button>
              <button 
                class="mobile-menu-option" 
                :class="{ 'active': currentSort === 'grade' }"
                @click="updateSortOption('grade')"
              >
                {{ $t('sort.grade') }}
              </button>
            </div>
            
            <div class="mobile-menu-direction">
              <span class="direction-label">{{ $t('direction.ascending') }}:</span>
              <button 
                class="direction-button"
                @click="toggleDirection($event)"
              >
                {{ sortDirection === 'asc' ? $t('direction.ascending') : $t('direction.descending') }}
                <svg v-if="sortDirection === 'asc'" xmlns="http://www.w3.org/2000/svg" 
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                  stroke-width="2">
                  <path d="M12 5v14M19 12l-7-7-7 7"/>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" 
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 19V5M5 12l7 7 7-7"/>
                </svg>
              </button>
            </div>
          </div>
          
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
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  padding-right: 2.5rem;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  font-size: 0.95rem;
  color: var(--text-primary);
  background: var(--input-background);
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(var(--accent-color-rgb), 0.1);
}

.search-icon {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.25rem;
  height: 1.25rem;
  color: var(--text-secondary);
  pointer-events: none;
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

.right-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Language selector styles */
.language-toggle {
  position: relative;
}

.language-button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  min-width: 36px;
  border-radius: 18px;
  background-color: var(--background-secondary);
  color: var(--text-primary);
  border: none;
  padding: 0 10px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.language-button:hover {
  background-color: var(--background-tertiary);
}

.language-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 120px;
  margin-top: 5px;
  background-color: var(--background-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.language-option {
  padding: 10px 0;
  width: 100%;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.language-option:hover {
  background-color: var(--background-secondary);
}

.language-option.active {
  background-color: var(--background-tertiary);
  font-weight: 500;
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

.theme-toggle {
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
  background-color: var(--background-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 0 0 0 10px;
  z-index: 1000;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
  height: calc(100vh - 100%); /* Full viewport height minus header height */
  display: flex;
  flex-direction: column;
}

.mobile-menu.open {
  transform: translateX(0);
}

.mobile-menu-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.mobile-menu-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
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

.desktop-only {
  display: none;
}

.mobile-hidden {
  display: block;
}

@media screen and (min-width: 769px) {
  .desktop-only {
    display: block;
  }
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