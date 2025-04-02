<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { HeaderProps } from '../../../types/header'

const props = defineProps<HeaderProps>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
  'toggleTheme': [];
}>();

function updateSearch(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:searchQuery', target.value);
}

function onToggleTheme() {
  emit('toggleTheme');
}
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
        </div>

        <div class="theme-toggle">
          <label class="switch" for="theme-toggle">
            <input 
              id="theme-toggle"
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