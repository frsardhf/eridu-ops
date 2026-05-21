<script setup lang="ts">
import { ref, computed } from 'vue';
import { getResourceDataByIdSync } from '@/lib/stores/resourceCacheStore';
import { getGiftIconUrl } from '@/lib/utils/iconUtils';
import { formatItemQuantity } from '@/lib/utils/materialUtils';
import { $t } from '@/locales';
import NumberStepper from '@/components/students/modal/shared/NumberStepper.vue';
import '@/styles/resourceDisplay.css';
import '@/styles/modalActions.css';

const props = defineProps<{
  nonFavorGiftsMap: Record<number, number>;
  neededCount: number;
}>();

const emit = defineEmits<{
  (e: 'confirm', selection: Record<number, number>): void;
  (e: 'cancel'): void;
}>();

const selection = ref<Record<number, number>>({});

const totalSelected = computed(() =>
  Object.values(selection.value).reduce((s, q) => s + q, 0)
);

const isReady = computed(() => totalSelected.value === props.neededCount);

function interpolate(key: string, vars: Record<string, number>): string {
  return $t(key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

// Only SR gifts can be used as conversion materials in-game
const giftEntries = computed(() =>
  Object.entries(props.nonFavorGiftsMap)
    .map(([id, qty]) => ({ id: Number(id), available: qty, resource: getResourceDataByIdSync(Number(id)) }))
    .filter(e => e.resource && e.resource.Rarity === 'SR')
);

// Per-row max respects both per-gift availability and the remaining global budget
function maxForEntry(id: number, available: number): number {
  const current = selection.value[id] ?? 0;
  const remainingBudget = props.neededCount - totalSelected.value;
  return Math.min(available, current + Math.max(0, remainingBudget));
}

function onStepperChange(id: number, value: number, available: number) {
  const clamped = Math.max(0, Math.min(available, isNaN(value) ? 0 : value));
  selection.value = { ...selection.value, [id]: clamped };
}

function confirm() {
  if (!isReady.value) return;
  emit('confirm', { ...selection.value });
}
</script>

<template>
  <Teleport to="body">
    <div class="convert-backdrop" @click.self="emit('cancel')">
      <div class="convert-modal">
        <div class="convert-header">
          <span class="convert-title">{{ $t('convertMaterialTitle') }}</span>
        </div>

        <p class="convert-desc">{{ interpolate('convertMaterialDesc', { needed: neededCount }) }}</p>

        <div class="convert-gift-grid">
          <div
            v-for="entry in giftEntries"
            :key="entry.id"
            class="convert-gift-card"
          >
            <div class="gift-header" :title="entry.resource!.Name">
              <div class="gift-icon-container">
                <img
                  :src="getGiftIconUrl(entry.resource!.Icon, false)"
                  :alt="entry.resource!.Name"
                  class="gift-icon"
                />
                <div class="resource-quantity">
                  {{ formatItemQuantity(entry.available) }}
                </div>
              </div>
            </div>
            <NumberStepper
              :value="selection[entry.id] ?? 0"
              :min="0"
              :max="maxForEntry(entry.id, entry.available)"
              :name="`convert-${entry.id}`"
              :aria-label="entry.resource!.Name"
              @change="(v) => onStepperChange(entry.id, v, entry.available)"
            />
          </div>
        </div>

        <div class="convert-counter" :class="{ ready: isReady }">
          {{ interpolate('convertMaterialSelected', { current: totalSelected, needed: neededCount }) }}
        </div>

        <p class="convert-inventory-note">{{ $t('convertMaterialInventoryNote') }}</p>

        <div class="convert-footer">
          <button class="modal-btn modal-btn-cancel" @click="emit('cancel')">{{ $t('cancel') }}</button>
          <button class="modal-btn modal-btn-convert" :disabled="!isReady" @click="confirm">
            {{ $t('convertMaterialConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.convert-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.convert-modal {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  min-width: 320px;
  max-width: 480px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.convert-header {
  display: flex;
  align-items: center;
  justify-content: center;
}

.convert-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-primary);
}

.convert-desc {
  font-size: 0.9em;
  color: var(--text-secondary);
  margin: 0;
  text-align: center;
}

.convert-gift-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  overflow-y: auto;
  max-height: 360px;
}

.convert-gift-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--card-background);
}

/* Reuse GiftCard icon structure */
.gift-header {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.gift-icon-container {
  position: relative;
  width: 90px;
  height: 90px;
}

.gift-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.convert-counter {
  text-align: center;
  font-size: 0.9em;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 6px;
}

.convert-counter.ready {
  color: var(--success-color, #4caf50);
  font-weight: 600;
}

.convert-inventory-note {
  font-size: 0.78em;
  color: var(--text-secondary);
  text-align: center;
  margin: 0;
  opacity: 0.8;
}

.convert-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
