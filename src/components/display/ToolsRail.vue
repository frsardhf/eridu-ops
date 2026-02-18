<script setup lang="ts">
import { onMounted, ref } from 'vue';

const isExpanded = ref(false);
const railRef = ref<HTMLElement | null>(null);
const isCoarsePointer = ref(false);

const emit = defineEmits<{
  'open-bulk-modify': [];
}>();

function openRail() {
  isExpanded.value = true;
}

function closeRail() {
  isExpanded.value = false;
}

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null;
  if (!nextTarget || !railRef.value?.contains(nextTarget)) {
    closeRail();
  }
}

function handleTriggerClick() {
  if (!isCoarsePointer.value) return;
  isExpanded.value = !isExpanded.value;
}

function openBulkModify() {
  emit('open-bulk-modify');
}

onMounted(() => {
  isCoarsePointer.value = window.matchMedia('(hover: none), (pointer: coarse)').matches;
});
</script>

<template>
  <section
    ref="railRef"
    class="tools-rail"
    :class="{ expanded: isExpanded }"
    @mouseenter="openRail"
    @mouseleave="closeRail"
    @focusin="openRail"
    @focusout="handleFocusOut"
  >
    <button
      class="tools-rail-trigger"
      type="button"
      @click="handleTriggerClick"
      :aria-expanded="isExpanded"
      aria-controls="tools-rail-panel"
    >
      <span class="trigger-left">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 6a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm0 6a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1Zm15-11h3v3h-3V7Zm0 7h3v3h-3v-3Z"
          />
        </svg>
        <span class="trigger-title">Tools</span>
      </span>

      <span class="trigger-right">
        <span class="future-chip"></span>
        <span class="future-chip"></span>
        <span class="future-chip"></span>
        <svg class="trigger-chevron" :class="{ open: isExpanded }" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path fill="currentColor" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.18l3.71-3.95a.75.75 0 0 1 1.1 1.02l-4.25 4.52a.75.75 0 0 1-1.1 0L5.2 8.25a.75.75 0 0 1 .02-1.04Z" />
        </svg>
      </span>
    </button>

    <div
      id="tools-rail-panel"
      class="tools-rail-panel"
      v-show="isExpanded"
    >
      <button
        class="tools-action-btn"
        type="button"
        @click="openBulkModify"
      >
        Bulk Modify Students
      </button>
    </div>
  </section>
</template>

<style scoped>
.tools-rail {
  width: 100%;
  padding: 6px 14px 0;
  flex-shrink: 0;
  background: var(--background-primary);
}

.tools-rail-trigger {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.tools-rail-trigger:hover {
  border-color: var(--accent-color);
}

.tools-rail-trigger:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

.expanded .tools-rail-trigger {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.trigger-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.trigger-title {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.trigger-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.future-chip {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-color) 48%, var(--background-secondary));
}

.trigger-chevron {
  transition: transform 0.2s ease;
}

.trigger-chevron.open {
  transform: rotate(180deg);
}

.tools-rail-panel {
  margin-top: 6px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--background-secondary);
  padding: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tools-action-btn {
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.tools-action-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.tools-action-btn:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

@media (max-width: 768px) {
  .tools-rail {
    padding: 6px 10px 0;
  }

  .tools-rail-trigger {
    min-height: 44px;
    border-radius: 12px;
  }

  .tools-action-btn {
    width: 100%;
  }
}
</style>
