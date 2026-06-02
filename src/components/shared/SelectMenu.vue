<script setup lang="ts" generic="T extends string | number">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useClickOutside } from '@/composables/dom/useClickOutside';

interface SelectOption { value: T; label: string }

const props = defineProps<{
  modelValue: T;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** Full-width form-field styling instead of the compact inline toolbar look. */
  block?: boolean;
  /** Horizontal anchor of the teleported popover relative to the trigger (default 'left'). */
  align?: 'left' | 'right';
}>();

const emit = defineEmits<{ 'update:modelValue': [T] }>();

const open = ref(false);
const wrapEl = ref<HTMLElement | null>(null);
const triggerEl = ref<HTMLElement | null>(null);
const popoverEl = ref<HTMLElement | null>(null);
// Popover is teleported to <body> (so an overflow ancestor can't clip it) and
// positioned `fixed` from the trigger's rect.
const popoverStyle = ref<Record<string, string>>({});

const selected = computed(() => props.options.find(o => o.value === props.modelValue));
const triggerLabel = computed(() => selected.value?.label ?? props.placeholder ?? '');
const isPlaceholder = computed(() => !selected.value);

function updatePosition() {
  // Anchor to the default trigger when present, else to the wrapper (custom #trigger slot).
  const el = triggerEl.value ?? wrapEl.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const MARGIN = 8;
  const CAP = 260;
  const spaceBelow = window.innerHeight - r.bottom - MARGIN;
  const spaceAbove = r.top - MARGIN;
  // Estimate height from option count to choose a direction without a render-measure flash.
  const wanted = Math.min(props.options.length * 34 + 8, CAP);
  const openUp = spaceBelow < wanted && spaceAbove > spaceBelow;

  const style: Record<string, string> = {
    minWidth: `${Math.round(r.width)}px`,
    // Clamp to the available space so the popover never runs off either edge.
    maxHeight: `${Math.round(Math.min(CAP, openUp ? spaceAbove : spaceBelow))}px`,
  };
  // Right-align hugs the trigger's right edge (keeps an edge-anchored icon menu on-screen).
  if (props.align === 'right') style.right = `${Math.round(window.innerWidth - r.right)}px`;
  else style.left = `${Math.round(r.left)}px`;
  if (openUp) style.bottom = `${Math.round(window.innerHeight - r.top + 6)}px`;
  else style.top = `${Math.round(r.bottom + 6)}px`;
  popoverStyle.value = style;
}

function toggle(event: Event) {
  event.stopPropagation();
  if (!open.value) updatePosition();
  open.value = !open.value;
}

function pick(value: T) {
  emit('update:modelValue', value);
  open.value = false;
}

function onClickOutside(event: MouseEvent) {
  const target = event.target as Node;
  if (open.value && !wrapEl.value?.contains(target) && !popoverEl.value?.contains(target)) {
    open.value = false;
  }
}

// The popover is detached (fixed), so close it when the page scrolls/resizes
// rather than letting it drift away from the trigger. But ignore scrolls that
// happen INSIDE the popover's own overflow (e.g. scrolling a long option list
// down to the last item) — those must not close it.
function closeOnViewportChange(event?: Event) {
  if (event?.type === 'scroll') {
    const t = event.target as Node | null;
    if (t && popoverEl.value && (t === popoverEl.value || popoverEl.value.contains(t))) return;
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
  <div ref="wrapEl" class="select-menu" :class="{ block }">
    <!-- Custom trigger via #trigger slot (gets { open, toggle }); default = label pill -->
    <slot name="trigger" :open="open" :toggle="toggle">
      <button
        ref="triggerEl"
        type="button"
        class="select-trigger"
        :class="{ open, placeholder: isPlaceholder }"
        :aria-label="ariaLabel || undefined"
        :aria-expanded="open"
        aria-haspopup="listbox"
        @click="toggle"
      >
        <span>{{ triggerLabel }}</span>
        <svg class="select-chev" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </slot>

    <Teleport to="body">
      <div v-if="open" ref="popoverEl" class="select-popover" :style="popoverStyle" role="listbox">
        <!-- Optional fixed content above the options (e.g. a sort-direction row) -->
        <slot name="header" />
        <button
          v-for="o in options"
          :key="String(o.value)"
          type="button"
          class="select-option"
          :class="{ active: o.value === modelValue }"
          role="option"
          :aria-selected="o.value === modelValue"
          @click.stop="pick(o.value)"
        >
          <span>{{ o.label }}</span>
          <svg v-if="o.value === modelValue" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.select-menu {
  position: relative;
  display: inline-block;
}

.select-menu.block {
  display: block;
  width: 100%;
}

.select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  transition: border-color 0.15s, color 0.15s;
}

/* Full-width, form-field proportions for the block variant. */
.select-menu.block .select-trigger {
  width: 100%;
  height: auto;
  padding: 5px 8px;
  justify-content: space-between;
  background: var(--input-background);
  border-color: var(--input-border);
  font-weight: 500;
}

.select-trigger:hover,
.select-trigger.open {
  border-color: var(--accent-color);
}

/* Compact (toolbar) triggers also tint their text on hover; form fields don't. */
.select-menu:not(.block) .select-trigger:hover,
.select-menu:not(.block) .select-trigger.open {
  color: var(--accent-color);
}

.select-trigger.placeholder {
  color: var(--input-placeholder);
}

.select-chev {
  flex: 0 0 auto;
  opacity: 0.7;
}

.select-popover {
  /* Teleported to <body>; positioned `fixed` from the trigger rect (top/left/
     min-width set inline). z-index sits above the entries modal (2100). */
  position: fixed;
  z-index: 3000;
  max-width: calc(100vw - 24px);
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--background-primary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  white-space: nowrap;
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
}

.select-option:hover {
  background: var(--background-secondary);
}

.select-option.active {
  color: var(--accent-color);
}
</style>
