<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { createEditorKeydownHandler } from '@/consumables/utils/upgradeUtils';
import { $t } from '@/locales';

const props = defineProps<{
  currentBond: number,
  newBondLevel: number,
  remainingXp: number,
  totalExp: number
}>();

const emit = defineEmits<(e: 'update-bond', value: number) => void>();

// Local state for the actual bond value
const bondState = ref(props.currentBond);
const editingBond = ref(false);
const editBondValue = ref(props.currentBond.toString());
const bondEditorRef = ref<HTMLInputElement | null>(null);

// Sync with prop changes from parent
watch(() => props.currentBond, (newVal) => {
  bondState.value = newVal;
  editingBond.value = false;
  editBondValue.value = newVal.toString();
}, { immediate: true });

const isMaxBond = computed(() => bondState.value === 100);

// Centralized logic for processing bond updates
const processBondUpdate = (value: number) => {
  // Clamp between 1 and 100
  value = Math.max(1, Math.min(100, value));
  bondState.value = value;
  emit('update-bond', value);
};

const parseBondValue = (rawValue: string): number => {
  const parsed = parseInt(rawValue.trim(), 10);
  return Number.isNaN(parsed) ? 1 : parsed;
};

const startBondEdit = async () => {
  editingBond.value = true;
  editBondValue.value = bondState.value.toString();
  await nextTick();
  bondEditorRef.value?.focus();
  bondEditorRef.value?.select();
};

const commitBondEdit = () => {
  processBondUpdate(parseBondValue(editBondValue.value));
  editingBond.value = false;
};

const cancelBondEdit = () => {
  editingBond.value = false;
  editBondValue.value = bondState.value.toString();
};

const handleEditorKeydown = createEditorKeydownHandler(commitBondEdit, cancelBondEdit);
</script>

<template>
  <div class="modal-section-card bond-section" :class="{ 'bond-section-max': isMaxBond }">
    <div class="bond-summary-row">
      <div v-if="!isMaxBond" class="bond-progress-pill">
        <div class="bond-progress-track">
          <div class="bond-icon-container">
            <img
              src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
              alt="Current Bond"
              class="bond-icon"
            />
            <button
              v-if="!editingBond"
              type="button"
              class="bond-number-button"
              :aria-label="$t('currentBond')"
              @click="startBondEdit"
            >
              {{ bondState }}
            </button>
            <input
              v-else
              ref="bondEditorRef"
              v-model="editBondValue"
              name="bond-input"
              type="number"
              class="bond-number-input"
              min="1"
              max="100"
              @blur="commitBondEdit"
              @keydown="handleEditorKeydown"
            />
          </div>

          <template v-if="totalExp > 0">
            <div class="bond-arrow">→</div>

            <div class="bond-icon-container">
              <img
                src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
                alt="New Bond"
                class="bond-icon"
              />
              <span class="bond-number">{{ newBondLevel }}</span>
            </div>
          </template>
        </div>
      </div>

      <div v-else class="bond-max-banner">
        <div class="max-bond-badge">
          <img
            src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
            alt="Max Bond"
            class="max-bond-icon"
          />
          <button
            v-if="!editingBond"
            type="button"
            class="bond-number-button max-bond-number-button"
            :aria-label="$t('currentBond')"
            @click="startBondEdit"
          >
            {{ bondState }}
          </button>
          <input
            v-else
            ref="bondEditorRef"
            v-model="editBondValue"
            name="bond-input"
            type="number"
            class="bond-number-input max-bond-number-input"
            min="1"
            max="100"
            @blur="commitBondEdit"
            @keydown="handleEditorKeydown"
          />
        </div>
        <div class="max-banner-title">{{ $t('maxBond') }}</div>
      </div>
    </div>

    <div v-if="!isMaxBond && remainingXp > 0" class="bond-stats-row">
      <div class="stat-chip">
        {{ remainingXp }} {{ $t('expToNextLevel') }}
      </div>

      <div class="stat-chip strong-chip total-chip">
        {{ $t('totalExp') }}: {{ totalExp.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.bond-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bond-summary-row {
  display: flex;
  align-items: center;
  gap: 0;
}

.bond-summary-row > * {
  width: 100%;
}

.bond-progress-track {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.bond-arrow {
  font-size: 0.95rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bond-progress-pill,
.bond-max-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  min-height: 40px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  padding: 3px 10px;
}

.bond-max-banner {
  border-color: rgba(255, 105, 180, 0.35);
  background: linear-gradient(
    90deg,
    rgba(255, 105, 180, 0.14) 0%,
    rgba(235, 51, 255, 0.14) 100%
  );
}

.bond-icon-container,
.max-bond-badge {
  position: relative;
  width: 34px;
  height: 34px;
}

.bond-icon,
.max-bond-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scale(1.18);
  transform-origin: center;
}

.bond-number,
.max-bond-number,
.bond-number-button,
.bond-number-input {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  font-weight: 700;
  font-size: 0.82rem;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.bond-number-button {
  border: 0;
  background: transparent;
  padding: 0;
  line-height: 1;
  cursor: pointer;
}

.bond-number-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
  border-radius: 4px;
}

.bond-number-input {
  width: 28px;
  height: 18px;
  border: 0;
  background: transparent;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 700;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  appearance: textfield;
  -moz-appearance: textfield;
}

.bond-number-input::-webkit-outer-spin-button,
.bond-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.max-banner-title {
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  background: linear-gradient(135deg, rgb(255, 105, 180), rgb(255, 146, 51));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.bond-stats-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.stat-chip {
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
}

.strong-chip {
  font-weight: 700;
  color: var(--text-primary);
}

.total-chip {
  margin-left: auto;
}

.muted-chip {
  opacity: 0.85;
}

/* Responsive design */
@media (max-width: 480px) {
  .bond-section {
    padding: 10px;
  }

  .bond-summary-row {
    gap: 0;
  }

  .bond-progress-pill,
  .bond-max-banner {
    min-width: 0;
    flex-wrap: wrap;
    justify-content: center;
  }

  .total-chip {
    margin-left: 0;
  }
}
</style>
