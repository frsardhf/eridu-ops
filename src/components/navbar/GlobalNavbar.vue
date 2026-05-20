<script setup lang="ts">
import { useStudentData } from '@/lib/hooks/useStudentData';
import { $t } from '@/locales';
import GlobalControls from './GlobalControls.vue';
import '@/styles/navbar.css';

const { currentTheme, setTheme } = useStudentData();
</script>

<template>
  <header class="app-navbar">
    <div class="app-navbar-content gn-grid">
      <div class="gn-left">
        <RouterLink to="/" class="app-navbar-brand" aria-label="EriduOps home">
          <span class="app-navbar-brand-eridu">Eridu</span><span class="app-navbar-brand-ops">Ops</span>
        </RouterLink>

        <nav class="gn-nav">
          <RouterLink to="/students" class="app-navbar-link" active-class="active">
            {{ $t('students') }}
          </RouterLink>
          <RouterLink to="/bonds" class="app-navbar-link" active-class="active">
            {{ $t('bonds') }}
          </RouterLink>
        </nav>
      </div>

      <div class="gn-controls">
        <GlobalControls :current-theme="currentTheme" @set-theme="setTheme" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.gn-grid {
  display: grid;
  grid-template-columns: 1fr minmax(0, 520px) 1fr;
  align-items: center;
  gap: 12px;
}

.gn-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.gn-nav {
  display: flex;
  gap: 4px;
}

.gn-controls {
  grid-column: 3;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

@media screen and (max-width: 576px) {
  .gn-grid {
    display: flex;
    gap: 8px;
  }

  .gn-controls {
    margin-left: auto;
    justify-content: unset;
  }

  .gn-nav {
    gap: 2px;
  }
}
</style>
