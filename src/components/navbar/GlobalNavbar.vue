<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref } from 'vue';
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
import ContactModal from './modals/ContactModal.vue';
import CreditsModal from './modals/CreditsModal.vue';
import '@/styles/navbar.css';

// The navbar mounts on every page; its heavy, rarely-opened modals load as
// their own chunks on first open. Contact/Credits stay eager: they're small
// and the landing page also imports them statically.
const ImportModal = defineAsyncComponent(() => import('./modals/ImportModal.vue'));
const InventoryScreenshotModal = defineAsyncComponent(() => import('./modals/InventoryScreenshotModal.vue'));
const WhatsNewModal = defineAsyncComponent(() => import('./modals/WhatsNewModal.vue'));

defineProps<{
  compact?: boolean;
}>();

const { currentTheme, setTheme, reinitializeData } = useStudentData();
const { exportData, currentLanguage, setLanguage } = useNavbarSettings();

// Language toggle is mirrored into the mobile menu (the top-bar toggle hides ≤480).
const langLabel = computed(() => (currentLanguage.value === 'en' ? 'English' : '日本語'));
function toggleLanguage() {
  setLanguage(currentLanguage.value === 'en' ? 'jp' : 'en');
}

const mobileMenuOpen = ref(false);
const showImportModal = ref(false);
const showScreenshotModal = ref(false);
const showWhatsNewModal = ref(false);
const showContactModal = ref(false);
const showCreditsModal = ref(false);
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

function openContactModal() {
  showContactModal.value = true;
  mobileMenuOpen.value = false;
}

function openCreditsModal() {
  showCreditsModal.value = true;
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
          <RouterLink to="/hall" class="app-navbar-link" active-class="active">
            {{ $t('bond100.nav') }}
          </RouterLink>
        </nav>
      </div>

      <!-- Middle: page-specific controls (search, filters, etc.) -->
      <div class="an-middle">
        <slot />
      </div>

      <!-- Right: theme picker, language, credits + hamburger -->
      <div class="an-right">
        <GlobalControls
          :current-theme="currentTheme"
          @set-theme="setTheme"
          @open-contact="openContactModal"
          @open-credits="openCreditsModal"
        />
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
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="option-icon">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              {{ $t('whatsNew') }}
            </button>
            <!-- compact-only: shown once the matching top-bar control collapses
                 (Contact/Credits ≤960, Language ≤480) -->
            <button class="mobile-menu-option compact-only" type="button" @click="openContactModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="option-icon">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              {{ $t('contact') }}
            </button>
            <button class="mobile-menu-option compact-only" type="button" @click="openCreditsModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="option-icon">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 14v-0.5c0-1.2 0.8-2 1.7-2.8 0.7-0.6 1.3-1.2 1.3-2.2 0-1.4-1.2-2.5-2.7-2.5-1.5 0-2.6 0.9-2.9 2.4"/>
                <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor"/>
              </svg>
              {{ $t('credits') }}
            </button>
            <button class="mobile-menu-option compact-only-sm" type="button" :aria-label="`Language: ${langLabel}`" @click="toggleLanguage">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="option-icon">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              {{ langLabel }}
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
  <ContactModal v-if="showContactModal" @close="showContactModal = false" />
  <CreditsModal v-if="showCreditsModal" @close="showCreditsModal = false" />
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

/* Menu entries shown only once the matching top-bar control collapses: Contact
   and Credits at the tablet breakpoint, Language at the phone breakpoint. */
.compact-only,
.compact-only-sm {
  display: none;
}

@media screen and (max-width: 960px) {
  .compact-only {
    display: flex;
  }
}

@media screen and (max-width: 480px) {
  .compact-only-sm {
    display: flex;
  }
}

/* On compact navbars (search pages), hide nav links so search can expand;
   SearchNavbar's mobile home button takes over for navigation. Matches the
   960px point where Contact/Credits collapse into the menu. */
@media screen and (max-width: 960px) {
  .an-left--compact {
    display: none;
  }
}

@media screen and (max-width: 768px) {
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
