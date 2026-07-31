<script setup lang="ts">
import { computed } from 'vue';
import { $t } from '@/locales';
import type { CraftingFodderDisplayMaterial } from '@/lib/hooks/useCraftingFodder';

const props = defineProps<{
  item: CraftingFodderDisplayMaterial;
  fieldId: string;
}>();

const emit = defineEmits<{
  'update:remaining': [value: number];
  reset: [];
}>();

const isComplete = computed(() => props.item.plannedCrafts > 0 && props.item.remainingCrafts === 0);

function updateRemaining(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  emit('update:remaining', Number.isFinite(value) ? value : props.item.remainingCrafts);
}
</script>

<template>
  <article class="crafting-card" :class="{ 'is-complete': isComplete }">
    <div class="crafting-portrait">
      <img :src="item.iconUrl" :alt="item.material.Name" loading="lazy" />
      <span v-if="isComplete" class="complete-badge" :title="$t('craftingFodder.complete')">✓</span>
    </div>

    <div class="material-name" :title="item.material.Name">
      <span>{{ item.material.Name }}</span>
    </div>

    <div class="metric-row metric-row--crafts">
      <div class="craft-controls">
        <button
          type="button"
          class="step-btn"
          :disabled="item.remainingCrafts <= 0"
          :title="$t('craftingFodder.recordOne')"
          :aria-label="$t('craftingFodder.recordOne')"
          @click="emit('update:remaining', item.remainingCrafts - 1)"
        >
          −
        </button>
        <label class="craft-count">
          <input
            :id="`crafting-remaining-${fieldId}`"
            :name="`crafting-remaining-${fieldId}`"
            type="number"
            min="0"
            :max="item.plannedCrafts"
            :value="item.remainingCrafts"
            :aria-label="$t('craftingFodder.craftsLeft')"
            @input="updateRemaining"
          />
          <span class="craft-separator">/</span>
          <span class="craft-total">{{ item.plannedCrafts }}</span>
        </label>
        <button
          type="button"
          class="step-btn"
          :disabled="item.remainingCrafts >= item.plannedCrafts"
          :title="$t('craftingFodder.undoOne')"
          :aria-label="$t('craftingFodder.undoOne')"
          @click="emit('update:remaining', item.remainingCrafts + 1)"
        >
          +
        </button>
      </div>
    </div>

    <div class="metric-row">
      <span class="metric-label">{{ $t('craftingFodder.fodderLeft') }}</span>
      <strong>{{ item.recyclableQty.toLocaleString() }}</strong>
    </div>

    <div class="metric-row">
      <span class="metric-label">{{ $t('craftingFodder.finalExcess') }}</span>
      <div class="excess-value">
        <strong>+{{ item.excessItems.toLocaleString() }}</strong>
        <button
          v-if="item.remainingCrafts < item.plannedCrafts"
          type="button"
          class="card-reset"
          :title="$t('craftingFodder.resetMaterial')"
          :aria-label="$t('craftingFodder.resetMaterial')"
          @click="emit('reset')"
        >
          ↺
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.crafting-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-background);
  transition:
    border-color 0.18s,
    box-shadow 0.18s;
}

.crafting-card:hover {
  border-color: color-mix(in srgb, var(--accent-color) 58%, var(--border-color));
}

.crafting-card.is-complete {
  border-color: color-mix(in srgb, var(--color-positive) 70%, var(--border-color));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-positive) 18%, transparent);
}

.crafting-portrait {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--background-primary);
}

.crafting-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.18s;
}

.is-complete .crafting-portrait img {
  opacity: 0.78;
}

.complete-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--color-positive);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.material-name {
  height: 48px;
  box-sizing: border-box;
  padding: 7px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 0.76rem;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  overflow: hidden;
}

.material-name span {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.metric-row {
  min-height: 28px;
  padding: 4px 7px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border-top: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--background-secondary) 72%, transparent);
  color: var(--text-primary);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
}

.metric-row--crafts {
  min-height: 40px;
  justify-content: center;
  padding-inline: 9px;
}

.metric-label {
  color: var(--text-secondary);
  white-space: nowrap;
}

.craft-controls {
  width: 100%;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 4px;
}

.step-btn,
.card-reset {
  border: 0;
  color: var(--text-primary);
  background: transparent;
  cursor: pointer;
}

.step-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 5px;
  display: grid;
  place-items: center;
  background: var(--background-primary);
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
}

.step-btn:hover:not(:disabled) {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, var(--background-primary));
}

.step-btn:disabled {
  opacity: 0.32;
  cursor: default;
}

.craft-count {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 2px;
  font-weight: 800;
  white-space: nowrap;
}

.craft-count input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  border-bottom: 1px solid transparent;
  outline: 0;
  background: transparent;
  color: var(--accent-color);
  font: inherit;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.craft-separator,
.craft-total {
  text-align: center;
}

.craft-count input:focus {
  border-bottom-color: var(--accent-color);
}

.craft-count input::-webkit-inner-spin-button,
.craft-count input::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

.excess-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-reset {
  width: 20px;
  height: 20px;
  padding: 0;
  border-radius: 4px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.card-reset:hover {
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
}

@media (max-width: 520px) {
  .material-name {
    height: 42px;
    padding: 6px;
    font-size: 0.7rem;
  }

  .metric-row {
    padding-inline: 6px;
    font-size: 0.68rem;
  }

  .metric-row--crafts {
    min-height: 36px;
  }
}
</style>
