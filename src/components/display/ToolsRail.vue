<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const isExpanded = ref(false);
const railRef = ref<HTMLElement | null>(null);

const emit = defineEmits<{
  'open-bulk-modify': [];
}>();

function handleFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget as Node | null;
  if (!nextTarget || !railRef.value?.contains(nextTarget)) {
    isExpanded.value = false;
  }
}

function handleTriggerClick(event: MouseEvent) {
  const nextState = !isExpanded.value;
  isExpanded.value = nextState;

  if (!nextState) {
    const trigger = event.currentTarget as HTMLButtonElement | null;
    trigger?.blur();
  }
}

function handleDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null;
  if (target && railRef.value?.contains(target)) return;
  isExpanded.value = false;
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isExpanded.value = false;
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown);
  document.addEventListener('keydown', handleEscape);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown);
  document.removeEventListener('keydown', handleEscape);
});
</script>

<template>
  <section
    ref="railRef"
    class="tools-rail"
    :class="{ expanded: isExpanded }"
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
        @click="emit('open-bulk-modify')"
      >
        Bulk Modify Students
      </button>
    </div>
  </section>
</template>

<style scoped>
.tools-rail {
  position: fixed;
  left: 50%;
  bottom: 14px;
  transform: translate(-50%, calc(100% - 20px));
  width: min(30vw, 440px);
  min-width: 260px;
  z-index: 80;
  opacity: 1;
  transition: transform 0.2s ease;
}

.tools-rail::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4px);
  transform: translateX(-50%);
  width: 72px;
  height: 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-color) 68%, white 32%);
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--accent-color) 34%, var(--background-secondary)),
    color-mix(in srgb, var(--accent-color) 72%, var(--background-secondary)),
    color-mix(in srgb, var(--accent-color) 34%, var(--background-secondary))
  );
  box-shadow:
    0 10px 24px rgba(0, 0, 0, 0.4),
    0 3px 10px rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.tools-rail:hover,
.tools-rail:focus-within,
.tools-rail.expanded {
  transform: translate(-50%, 0);
}

.tools-rail-trigger {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-color) 36%, var(--border-color));
  background: color-mix(in srgb, var(--background-secondary) 90%, var(--background-primary) 10%);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow:
    0 18px 34px rgba(0, 0, 0, 0.4),
    0 8px 16px rgba(0, 0, 0, 0.24);
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.tools-rail-trigger:hover {
  border-color: var(--accent-color);
  box-shadow:
    0 20px 38px rgba(0, 0, 0, 0.44),
    0 10px 18px rgba(0, 0, 0, 0.28);
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(100% + 8px);
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--border-color) 75%, var(--text-primary) 25%);
  background: color-mix(in srgb, var(--background-secondary) 92%, var(--background-primary) 8%);
  backdrop-filter: blur(10px);
  box-shadow:
    0 14px 34px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.12);
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
    width: min(76vw, 360px);
    min-width: 220px;
    bottom: 10px;
    transform: translate(-50%, calc(100% - 18px));
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
