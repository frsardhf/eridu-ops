<script setup lang="ts">
import { currentLanguage, setLanguage, type Language } from '@/lib/stores/localizationStore';
import { $t } from '@/locales';

function toggleLanguage() {
  setLanguage(currentLanguage.value === 'en' ? 'jp' : 'en');
}

const nextLanguageLabel = (): string => (currentLanguage.value === 'en' ? 'JP' : 'EN');
</script>

<template>
  <div class="landing">
    <div class="landing-controls">
      <button
        type="button"
        class="lang-toggle"
        :aria-label="`Switch to ${nextLanguageLabel()}`"
        @click="toggleLanguage"
      >
        {{ nextLanguageLabel() }}
      </button>
    </div>

    <div class="landing-content">
      <img src="/millennium.ico" alt="" class="landing-logo" />
      <h1 class="landing-title">EriduOps</h1>

      <nav class="landing-nav">
        <RouterLink to="/students" class="landing-button">{{ $t('students') }}</RouterLink>
        <RouterLink to="/bonds" class="landing-button">{{ $t('bonds') }}</RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.landing {
  position: fixed;
  inset: 0;
  background-color: var(--background-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

.landing-controls {
  display: flex;
  justify-content: flex-end;
  padding: 16px 20px;
}

.lang-toggle {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: border-color 0.15s, color 0.15s;
}

.lang-toggle:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.landing-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
}

.landing-logo {
  width: 96px;
  height: 96px;
  border-radius: 16px;
  image-rendering: pixelated;
}

.landing-title {
  margin: 0;
  font-size: 2.6rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-primary);
}

.landing-nav {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.landing-button {
  min-width: 180px;
  padding: 16px 32px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, color 0.15s, background 0.15s;
}

.landing-button:hover {
  transform: translateY(-2px);
  border-color: var(--accent-color);
  color: var(--accent-color);
  background: var(--background-tertiary, var(--background-secondary));
}

.landing-button:active {
  transform: translateY(0);
}

@media (max-width: 576px) {
  .landing-title {
    font-size: 2rem;
  }

  .landing-button {
    min-width: 140px;
    padding: 14px 24px;
    font-size: 1rem;
  }
}
</style>
