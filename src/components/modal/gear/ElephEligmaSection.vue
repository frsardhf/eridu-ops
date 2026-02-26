<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  elephNeeded: number;
  gradeInfos: { owned?: number; price?: number; purchasable?: number; };
}>();

const emit = defineEmits<{
  (e: 'update-info', owned: number, price: number, purchasable: number): void;
}>();

const gradeState = ref({
  owned: props.gradeInfos?.owned || 0,
  price: props.gradeInfos?.price || 1,
  purchasable: props.gradeInfos?.purchasable || 20
});

const ownedInputFocused = ref(false);
const ownedInputEl = ref<HTMLInputElement | null>(null);
const fallbackElephIcon = 'https://schaledb.com/images/item/icon/item_icon_secretstone.webp';

const elephIcon = computed(() => {
  if (String(props.student?.Id) === '10099') {
    return 'https://schaledb.com/images/item/icon/item_icon_secretstone_ch0258.webp';
  }
  if (!props.student?.ElephIcon) return '';
  return `https://schaledb.com/images/item/icon/${props.student.ElephIcon}.webp`;
});

watch(() => props.gradeInfos, (newVal) => {
  if (newVal) {
    gradeState.value.owned = newVal.owned ?? 0;
    gradeState.value.price = newVal.price ?? 1;
    gradeState.value.purchasable = newVal.purchasable ?? 20;
  }
}, { deep: true, immediate: true });

const updateValue = (event: Event, field: 'owned' | 'price' | 'purchasable') => {
  const input = event.target as HTMLInputElement;
  const value = parseInt(input.value, 10) || 0;

  const limits = {
    owned: { min: 0, max: 520 },
    price: { min: 1, max: 5 },
    purchasable: { min: 1, max: 20 }
  };

  const clampedValue = Math.max(limits[field].min, Math.min(limits[field].max, value));
  gradeState.value[field] = clampedValue;

  emit('update-info', gradeState.value.owned, gradeState.value.price, gradeState.value.purchasable);
};

const forceOwnedInputFocus = () => {
  ownedInputEl.value?.focus();
};

const formatValue = (value: number) => {
  if (!value || value === 0) return '';
  return `×${value}`;
};
</script>

<template>
  <div class="modal-section-card eleph-eligma-card">
    <div class="eleph-grid">
      <div class="eleph-owned-card" @click="forceOwnedInputFocus">
        <div class="eleph-owned-header">
          <div class="gift-icon-container">
            <img
              :src="elephIcon || fallbackElephIcon"
              alt="Eleph"
              class="gift-icon"
            />

            <div
              v-if="!ownedInputFocused && gradeState.owned"
              class="eleph-owned-quantity"
            >
              {{ formatValue(gradeState.owned) }}
            </div>

            <div class="input-container">
              <input
                id="eleph-owned-input"
                ref="ownedInputEl"
                type="number"
                :value="gradeState.owned"
                class="resource-input"
                min="0"
                max="520"
                @input="(e) => updateValue(e, 'owned')"
                @focus="ownedInputFocused = true"
                @blur="ownedInputFocused = false"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="eleph-side">
        <div class="eleph-inputs-row">
          <label class="eleph-inline-field" for="eligma-price-input">
            <span class="eleph-field-label">{{ $t('price') }}</span>
            <input
              id="eligma-price-input"
              type="number"
              :value="gradeState.price"
              @input="(e) => updateValue(e, 'price')"
              class="resource-input-container"
              min="1"
              max="5"
            />
          </label>

          <label class="eleph-inline-field" for="eligma-purchasable-input">
            <span class="eleph-field-label">{{ $t('purchasable') }}</span>
            <input
              id="eligma-purchasable-input"
              type="number"
              :value="gradeState.purchasable"
              @input="(e) => updateValue(e, 'purchasable')"
              class="resource-input-container"
              min="1"
              max="20"
            />
          </label>
        </div>

        <div class="eleph-summary-chip strong">
          {{ $t('elephsNeeded') }}: {{ elephNeeded }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.eleph-eligma-card {
  width: 100%;
  align-self: stretch;
  box-sizing: border-box;
}

.eleph-grid {
  display: grid;
  grid-template-columns: minmax(132px, 160px) minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.eleph-owned-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--card-background);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: text;
}

.eleph-owned-header {
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

.input-container {
  position: relative;
}

.eleph-owned-quantity {
  position: absolute;
  bottom: 0;
  right: 1px;
  font-size: 1em;
  color: var(--text-tertiary);
  font-weight: 600;
  text-shadow:
    -0.8px -0.8px 0 #fff,
    0 -0.8px 0 #fff,
    0.8px -0.8px 0 #fff,
    -0.8px 0 0 #fff,
    0.8px 0 0 #fff,
    -0.8px 0.8px 0 #fff,
    0 0.8px 0 #fff,
    0.8px 0.8px 0 #fff;
  z-index: 1;
}

.eleph-owned-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.eleph-side {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  gap: 8px;
  min-width: 0;
}

.eleph-inputs-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.eleph-inline-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 38px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--background-primary);
}

.eleph-field-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.eleph-summary-chip {
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
  white-space: nowrap;
}

.eleph-summary-chip.strong {
  font-weight: 700;
  color: var(--text-primary);
}

.resource-input-container {
  width: 54px;
  height: 30px;
  padding: 3px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-align: center;
  background-color: var(--input-color, var(--background-primary));
  color: var(--text-primary);
  font-size: 0.92rem;
  transition: border-color 0.2s ease;
  appearance: textfield;
  -moz-appearance: textfield;
}

.resource-input-container::-webkit-outer-spin-button,
.resource-input-container::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.resource-input-container:focus {
  border-color: var(--accent-color, #4a90e2);
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.2);
}

@media (max-width: 768px) {
  .eleph-grid {
    grid-template-columns: minmax(118px, 150px) minmax(0, 1fr);
  }
}

@media (max-width: 560px) {
  .eleph-grid {
    grid-template-columns: 1fr;
  }

  .eleph-inputs-row {
    grid-template-columns: 1fr;
  }

  .eleph-summary-chip {
    text-align: center;
  }
}
</style>
