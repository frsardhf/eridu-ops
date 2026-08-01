<script setup lang="ts" generic="T extends string | number">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { $t } from '@/locales';

/**
 * Searchable single-value select: SelectMenu's sibling for long lists (50+
 * options) where type-to-filter beats scrolling. Options carry an optional
 * icon URL (student portraits etc.); the component stays data-agnostic, so
 * each consumer maps its own domain into { value, label, icon }.
 */
interface SearchOption {
  value: T;
  label: string;
  icon?: string;
}

const props = defineProps<{
  /** null = no selection (shows the placeholder; enables the clear row). */
  modelValue: T | null;
  options: SearchOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** Label for the clear row (rendered only when set and something is selected). */
  clearLabel?: string;
  /** Horizontal anchor of the teleported popover relative to the trigger (default 'left'). */
  align?: 'left' | 'right';
}>();

const emit = defineEmits<{ 'update:modelValue': [T | null] }>();

const open = ref(false);
const query = ref('');
const highlighted = ref(0);
const wrapEl = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLElement | null>(null);
const popoverEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const listEl = ref<HTMLElement | null>(null);
// Popover is teleported to <body> (so an overflow ancestor can't clip it) and
// positioned `fixed` from the trigger's rect, same contract as SelectMenu.
const popoverStyle = ref<Record<string, string>>({});

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) ?? null);
const triggerLabel = computed(() => selected.value?.label ?? props.placeholder ?? '');

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((o) => o.label.toLowerCase().includes(q));
});

watch(filtered, () => {
  highlighted.value = 0;
});

function updatePosition() {
  const el = triggerEl.value ?? wrapEl.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const MARGIN = 8;
  const CAP = 320;
  const spaceBelow = window.innerHeight - r.bottom - MARGIN;
  const spaceAbove = r.top - MARGIN;
  // Input row (~44) + option estimate, capped; pick a direction without a
  // render-measure flash.
  const wanted = Math.min(props.options.length * 36 + 52, CAP);
  const openUp = spaceBelow < wanted && spaceAbove > spaceBelow;

  const style: Record<string, string> = {
    minWidth: `${Math.round(Math.max(r.width, 220))}px`,
    maxHeight: `${Math.round(Math.min(CAP, openUp ? spaceAbove : spaceBelow))}px`,
  };
  if (props.align === 'right') style.right = `${Math.round(window.innerWidth - r.right)}px`;
  else style.left = `${Math.round(r.left)}px`;
  if (openUp) style.bottom = `${Math.round(window.innerHeight - r.top + 6)}px`;
  else style.top = `${Math.round(r.bottom + 6)}px`;
  popoverStyle.value = style;
}

function toggle(event: Event) {
  event.stopPropagation();
  if (!open.value) {
    updatePosition();
    open.value = true;
    query.value = '';
    highlighted.value = 0;
    nextTick(() => inputEl.value?.focus());
  } else {
    open.value = false;
  }
}

function pick(value: T | null) {
  emit('update:modelValue', value);
  open.value = false;
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    open.value = false;
    triggerEl.value?.focus();
    return;
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const n = filtered.value.length;
    if (!n) return;
    const step = event.key === 'ArrowDown' ? 1 : -1;
    highlighted.value = (highlighted.value + step + n) % n;
    nextTick(() => {
      listEl.value
        ?.querySelector<HTMLElement>('.search-select-option.highlighted')
        ?.scrollIntoView({ block: 'nearest' });
    });
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const option = filtered.value[highlighted.value];
    if (option) pick(option.value);
  }
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (open.value && !wrapEl.value?.contains(target) && !popoverEl.value?.contains(target)) {
    open.value = false;
  }
}

function popoverHasFocus() {
  const activeElement = document.activeElement;
  return activeElement instanceof Node && Boolean(popoverEl.value?.contains(activeElement));
}

// Detached (fixed) popover: close on outside scroll/resize so it can't drift
// from the trigger. Mobile keyboards resize or scroll the viewport while the
// search input stays focused, so keep the popover open and reposition it.
function closeOnViewportChange(event?: Event) {
  if (event?.type === 'scroll') {
    const t = event.target as Node | null;
    if (t && popoverEl.value && (t === popoverEl.value || popoverEl.value.contains(t))) return;
  }

  if (open.value && popoverHasFocus()) {
    updatePosition();
    return;
  }

  if (open.value) open.value = false;
}

useClickOutside(onClickOutside);
onMounted(() => {
  window.addEventListener('scroll', closeOnViewportChange, true);
  window.addEventListener('resize', closeOnViewportChange);
});
onUnmounted(() => {
  window.removeEventListener('scroll', closeOnViewportChange, true);
  window.removeEventListener('resize', closeOnViewportChange);
});
</script>

<template>
  <div ref="wrapEl" class="search-select">
    <button
      ref="triggerEl"
      type="button"
      class="search-select-trigger"
      :class="{ open, placeholder: !selected }"
      :aria-label="ariaLabel || undefined"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <img
        v-if="selected?.icon"
        class="search-select-trigger-icon"
        :src="selected.icon"
        alt=""
        aria-hidden="true"
      />
      <span class="search-select-trigger-label">{{ triggerLabel }}</span>
      <svg
        class="search-select-chev"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="open" ref="popoverEl" class="search-select-popover" :style="popoverStyle">
        <div class="search-select-input-row">
          <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
            <path
              fill="currentColor"
              d="m21 20.3-5.5-5.5a7 7 0 1 0-1.1 1.1l5.5 5.5 1.1-1.1zM4.5 10a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0z"
            />
          </svg>
          <input
            ref="inputEl"
            v-model="query"
            type="text"
            class="search-select-input"
            :placeholder="$t('search')"
            @keydown="onInputKeydown"
          />
        </div>

        <div ref="listEl" class="search-select-list" role="listbox">
          <button
            v-if="clearLabel && modelValue !== null"
            type="button"
            class="search-select-option clear"
            @click.stop="pick(null)"
          >
            <span class="search-select-label">{{ clearLabel }}</span>
          </button>
          <button
            v-for="(o, i) in filtered"
            :key="String(o.value)"
            type="button"
            class="search-select-option"
            :class="{ active: o.value === modelValue, highlighted: i === highlighted }"
            role="option"
            :aria-selected="o.value === modelValue"
            @mousemove="highlighted = i"
            @click.stop="pick(o.value)"
          >
            <img v-if="o.icon" class="search-select-icon" :src="o.icon" alt="" loading="lazy" />
            <span class="search-select-label">{{ o.label }}</span>
            <svg
              v-if="o.value === modelValue"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <p v-if="!filtered.length" class="search-select-empty">{{ $t('noResults') }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.search-select {
  position: relative;
  display: inline-block;
}

.search-select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  max-width: 220px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.search-select-trigger:hover,
.search-select-trigger.open {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.search-select-trigger.placeholder {
  color: var(--text-secondary);
}

.search-select-trigger-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}

.search-select-trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-select-chev {
  flex: 0 0 auto;
  opacity: 0.7;
}

.search-select-popover {
  /* Teleported to <body>; positioned `fixed` from the trigger rect. Same
     z-index tier as SelectMenu's popover (above modals). */
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  max-width: calc(100vw - 24px);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.search-select-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px;
  padding: 0 8px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
}

.search-select-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.85rem;
}

.search-select-list {
  overflow-y: auto;
  padding: 0 4px 4px;
  min-height: 0;
}

.search-select-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.search-select-option.highlighted {
  background: var(--background-secondary);
}

.search-select-option.active {
  color: var(--accent-color);
}

.search-select-option.clear {
  color: var(--text-secondary);
  font-weight: 500;
}

.search-select-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}

.search-select-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-select-empty {
  margin: 0;
  padding: 8px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}
</style>
