<script setup lang="ts">
import { ref, computed } from 'vue';
import { useNavbarSettings, type Language } from '@/lib/hooks/useNavbarSettings';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { $t } from '@/locales';
import { ThemeId } from '@/types/theme';
import CreditsModal from './modals/CreditsModal.vue';
import ContactModal from './modals/ContactModal.vue';

// ── Props / emits ─────────────────────────────────────────────────────────────
defineProps<{
  currentTheme: ThemeId;
}>();

const emit = defineEmits<{
  setTheme: [themeId: ThemeId];
}>();

// ── State ─────────────────────────────────────────────────────────────────────
const { currentLanguage, setLanguage, THEME_OPTIONS } = useNavbarSettings();

const showThemeTray = ref(false);
const showCreditsModal = ref(false);
const showContactModal = ref(false);
const trayEl = ref<HTMLElement | null>(null);
const toggleEl = ref<HTMLButtonElement | null>(null);

// ── Handlers ──────────────────────────────────────────────────────────────────
function toggleThemeTray(event: Event) {
  event.stopPropagation();
  showThemeTray.value = !showThemeTray.value;
}

function onSelectTheme(themeId: ThemeId) {
  emit('setTheme', themeId);
  showThemeTray.value = false;
}

function toggleLanguage() {
  setLanguage(currentLanguage.value === 'en' ? 'jp' : 'en');
}

const langLabel = computed(() => currentLanguage.value === 'en' ? 'English' : '日本語');
const langSwitchTarget = computed(() => currentLanguage.value === 'en' ? '日本語' : 'English');

function handleClickOutside(event: MouseEvent) {
  if (!showThemeTray.value) return;
  const target = event.target as Node;
  if (
    trayEl.value && !trayEl.value.contains(target) &&
    toggleEl.value && !toggleEl.value.contains(target)
  ) {
    showThemeTray.value = false;
  }
}

useClickOutside(handleClickOutside);
</script>

<template>
  <div class="global-controls">
    <!-- Language toggle -->
    <button
      type="button"
      class="gc-lang-toggle"
      :aria-label="`Switch to ${langSwitchTarget}`"
      @click="toggleLanguage"
    >
      {{ langLabel }}
    </button>

    <!-- Theme picker -->
    <div class="gc-theme-tray-wrapper">
      <button
        ref="toggleEl"
        class="gc-theme-tray-toggle"
        type="button"
        :aria-label="$t('app')"
        @click="toggleThemeTray"
      >
        <span class="gc-theme-tray-toggle-dot"></span>
      </button>

      <div
        ref="trayEl"
        class="gc-theme-tray"
        :class="{ open: showThemeTray }"
      >
        <div class="gc-theme-swatch-row" role="radiogroup" aria-label="Theme">
          <button
            v-for="theme in THEME_OPTIONS"
            :key="theme.id"
            class="gc-theme-swatch"
            :class="{ active: currentTheme === theme.id }"
            type="button"
            :title="theme.label"
            :aria-label="`Theme ${theme.label}`"
            :aria-checked="currentTheme === theme.id"
            role="radio"
            @click="onSelectTheme(theme.id)"
          >
            <span
              class="gc-theme-swatch-inner"
              :style="{ background: `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})` }"
            ></span>
          </button>
        </div>
      </div>
    </div>

    <!-- Contact -->
    <button
      type="button"
      class="gc-icon-btn"
      :aria-label="$t('contact')"
      :title="$t('contact')"
      @click="showContactModal = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    </button>

    <!-- Credits -->
    <button
      type="button"
      class="gc-icon-btn"
      :aria-label="$t('credits')"
      :title="$t('credits')"
      @click="showCreditsModal = true"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 14v-0.5c0-1.2 0.8-2 1.7-2.8 0.7-0.6 1.3-1.2 1.3-2.2 0-1.4-1.2-2.5-2.7-2.5-1.5 0-2.6 0.9-2.9 2.4"></path>
        <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor"></circle>
      </svg>
    </button>

    <CreditsModal v-if="showCreditsModal" @close="showCreditsModal = false" />
    <ContactModal v-if="showContactModal" @close="showContactModal = false" />
  </div>
</template>

<style scoped>
.global-controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.gc-lang-toggle {
  height: 32px;
  padding: 0 10px;
  min-width: 72px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s;
}

.gc-lang-toggle:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.gc-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.15s, color 0.15s;
}

.gc-icon-btn svg {
  display: block;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: currentColor;
  fill: none;
  overflow: visible;
}

.gc-icon-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.gc-theme-tray-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.gc-theme-tray-toggle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(var(--accent-color-rgb), 0.4);
  background: color-mix(in srgb, var(--card-background) 78%, white 22%);
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.gc-theme-tray-toggle-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.85);
  background: linear-gradient(135deg, #4f46e5, #7c3aed 40%, #e61b72 70%, #ff6a00);
}

.gc-theme-tray {
  position: absolute;
  top: calc(100% + 10px);
  right: -2px;
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  z-index: 1200;
}

.gc-theme-tray::before {
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

.gc-theme-tray.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.gc-theme-swatch-row {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 7px 9px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-color-rgb), 0.28);
  background: color-mix(in srgb, var(--background-primary) 80%, white 20%);
  box-shadow: 0 8px 20px rgba(var(--background-hover-rgb), 0.22);
}

.gc-theme-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid transparent;
  padding: 0;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.gc-theme-swatch-inner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.35);
}

.gc-theme-swatch.active {
  border-color: var(--accent-color);
  transform: scale(1.05);
}

@media screen and (max-width: 576px) {
  .global-controls {
    gap: 6px;
  }

  .gc-lang-toggle {
    height: 28px;
    min-width: 60px;
    font-size: 0.72rem;
    padding: 0 8px;
  }

  .gc-icon-btn,
  .gc-theme-tray-toggle {
    width: 28px;
    height: 28px;
  }

  .gc-theme-tray-toggle-dot {
    width: 16px;
    height: 16px;
  }
}
</style>
