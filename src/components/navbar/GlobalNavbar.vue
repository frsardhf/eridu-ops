<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { useNavbarSettings } from '@/lib/hooks/useNavbarSettings';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { $t } from '@/locales';
import { CHANGELOG } from '@/lib/constants/changelog';
import {
  getLastSeenChangelogId,
  setLastSeenChangelogId,
} from '@/lib/utils/settingsStorage';
import GlobalControls from './GlobalControls.vue';
import ImportModal from './modals/ImportModal.vue';
import InventoryScreenshotModal from './modals/InventoryScreenshotModal.vue';
import WhatsNewModal from './modals/WhatsNewModal.vue';
import '@/styles/navbar.css';

defineProps<{
  compact?: boolean;
}>();

const { currentTheme, setTheme, reinitializeData } = useStudentData();
const { exportData } = useNavbarSettings();

const mobileMenuOpen = ref(false);
const showImportModal = ref(false);
const showScreenshotModal = ref(false);
const showWhatsNewModal = ref(false);
const menuToggleEl = ref<HTMLButtonElement | null>(null);
const menuEl = ref<HTMLElement | null>(null);

// Auto-open the What's New modal once when the latest entry's id doesn't
// match the user's lastSeen marker. Brand-new visitors hit this too (undefined
// !== latest.id) — by product decision they see the latest entry on first load.
onMounted(() => {
  const latest = CHANGELOG[0];
  if (latest && getLastSeenChangelogId() !== latest.id) {
    showWhatsNewModal.value = true;
  }
});

function openWhatsNewModal() {
  showWhatsNewModal.value = true;
  mobileMenuOpen.value = false;
}

function closeWhatsNewModal() {
  showWhatsNewModal.value = false;
  // Mark the latest entry as seen on every close — covers both auto-open and
  // manual reopen so a user who explicitly opened it doesn't get re-prompted.
  const latest = CHANGELOG[0];
  if (latest) setLastSeenChangelogId(latest.id);
}

function toggleMobileMenu() {
  mobileMenuOpen.value = !mobileMenuOpen.value;
}

async function handleExportData() {
  await exportData();
  mobileMenuOpen.value = false;
}

function openImportModal() {
  showImportModal.value = true;
  mobileMenuOpen.value = false;
}

function openScreenshotModal() {
  showScreenshotModal.value = true;
  mobileMenuOpen.value = false;
}

function handleClickOutside(event: MouseEvent) {
  if (!mobileMenuOpen.value) return;
  const target = event.target as Node;
  if (
    menuEl.value && !menuEl.value.contains(target) &&
    menuToggleEl.value && !menuToggleEl.value.contains(target)
  ) {
    mobileMenuOpen.value = false;
  }
}

useClickOutside(handleClickOutside);
</script>

<template>
  <header class="app-navbar">
    <div class="app-navbar-content an-layout">
      <!-- Left: home icon + page nav links -->
      <div class="an-left" :class="{ 'an-left--compact': compact }">
        <RouterLink to="/" class="app-navbar-home-btn" aria-label="Home">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </RouterLink>
        <nav class="an-nav">
          <RouterLink to="/students" class="app-navbar-link" active-class="active">
            {{ $t('students') }}
          </RouterLink>
          <RouterLink to="/bonds" class="app-navbar-link" active-class="active">
            {{ $t('bonds') }}
          </RouterLink>
        </nav>
      </div>

      <!-- Middle: page-specific controls (search, filters, etc.) -->
      <div class="an-middle">
        <slot />
      </div>

      <!-- Right: theme picker, language, credits + hamburger -->
      <div class="an-right">
        <GlobalControls :current-theme="currentTheme" @set-theme="setTheme" />
        <button
          ref="menuToggleEl"
          class="hamburger-button"
          type="button"
          :aria-expanded="mobileMenuOpen"
          aria-label="Menu"
          @click="toggleMobileMenu"
        >
          <div class="hamburger-icon" :class="{ open: mobileMenuOpen }">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </button>
      </div>
    </div>

    <div v-if="mobileMenuOpen" ref="menuEl" class="an-mobile-menu">
      <div class="mobile-menu-container">
        <div class="mobile-menu-section">
          <h3 class="mobile-menu-heading">{{ $t('data') }}</h3>
          <div class="mobile-menu-options">
            <button class="mobile-menu-option" type="button" @click="handleExportData">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="option-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {{ $t('exportData') }}
            </button>
            <button class="mobile-menu-option" type="button" @click="openImportModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="option-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {{ $t('importData') }}
            </button>
            <button class="mobile-menu-option" type="button" @click="openScreenshotModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="option-icon">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              {{ $t('scanInventory') }}
            </button>
          </div>
        </div>

        <div class="mobile-menu-section">
          <h3 class="mobile-menu-heading">{{ $t('app') }}</h3>
          <div class="mobile-menu-options">
            <button class="mobile-menu-option" type="button" @click="openWhatsNewModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="option-icon">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              {{ $t('whatsNew') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>

  <ImportModal
    v-if="showImportModal"
    @close="showImportModal = false"
    @import-success="reinitializeData"
  />
  <InventoryScreenshotModal
    v-if="showScreenshotModal"
    @close="showScreenshotModal = false"
    @inventory-updated="reinitializeData"
  />
  <WhatsNewModal
    v-if="showWhatsNewModal"
    @close="closeWhatsNewModal"
  />
</template>

<style scoped>
.an-layout {
  display: flex;
  align-items: center;
  gap: 12px;
}

.an-left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.an-nav {
  display: flex;
  gap: 4px;
}

/* Fills remaining space; slot content can use margin-left: auto internally. */
.an-middle {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.an-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Hamburger ────────────────────────────────────────────────────────────── */
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
  border-radius: 50%;
  transition: background-color 0.2s;
  flex-shrink: 0;
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

/* ── Mobile menu panel ────────────────────────────────────────────────────── */
.an-mobile-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 100%;
  max-width: 300px;
  background-color: var(--background-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  border-radius: 0 0 0 10px;
  z-index: 1000;
  overflow-y: auto;
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
  margin: 0 0 0.75rem;
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
  width: 100%;
}

.mobile-menu-option:hover {
  background-color: rgba(var(--background-hover-rgb), 0.1);
}

.option-icon {
  flex-shrink: 0;
}

@media screen and (max-width: 768px) {
  /* On compact navbars (search pages), hide nav links so search can expand. */
  .an-left--compact {
    display: none;
  }

  .an-mobile-menu {
    max-width: 100%;
  }
}

@media screen and (max-width: 576px) {
  .an-layout {
    gap: 8px;
  }

  .an-nav {
    gap: 2px;
  }

  .an-right {
    gap: 4px;
  }
}
</style>
