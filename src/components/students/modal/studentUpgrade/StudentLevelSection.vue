<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { createEditorKeydownHandler } from '@/consumables/utils/upgradeUtils';
import { $t } from '../../../../locales';

const props = defineProps<{
  characterLevels: { current: number; target: number; },
  totalXpNeeded: number
}>();

const emit = defineEmits<(
  e: 'update-level', current: number, target: number
) => void>();

const levelState = ref({
  current: props.characterLevels.current,
  target: props.characterLevels.target,
});

const editingField = ref<'current' | 'target' | null>(null);
const editValue = ref('');
const currentEditorRef = ref<HTMLInputElement | null>(null);
const targetEditorRef = ref<HTMLInputElement | null>(null);

watch(() => props.characterLevels, (newVal) => {
  if (newVal) {
    levelState.value.current = newVal.current;
    levelState.value.target = newVal.target;
    if (editingField.value) {
      editingField.value = null;
      editValue.value = '';
    }
  }
}, { deep: true, immediate: true });

// Centralized logic for processing level updates
const processLevelUpdate = (value: number, isTarget: boolean) => {
  if (isTarget) {
    // Target must be between current and 90
    value = Math.max(levelState.value.current, Math.min(90, value));
    levelState.value.target = value;
  } else {
    // Current must be between 1 and 90
    value = Math.max(1, Math.min(90, value));
    levelState.value.current = value;
    
    // If target is now less than current, bump it up
    if (levelState.value.target < value) {
      levelState.value.target = value;
    }
  }

  emit('update-level', levelState.value.current, levelState.value.target);
};

const parseEditValue = (rawValue: string, isTarget: boolean): number => {
  const parsed = parseInt(rawValue);
  if (Number.isNaN(parsed)) {
    return isTarget ? levelState.value.current : 1;
  }
  return parsed;
};

const startEdit = async (field: 'current' | 'target') => {
  if (field === 'target' && isMaxLevel.value) return;

  editingField.value = field;
  editValue.value = (field === 'current'
    ? levelState.value.current
    : levelState.value.target).toString();

  await nextTick();
  const editor = field === 'current' ? currentEditorRef.value : targetEditorRef.value;
  editor?.focus();
  editor?.select();
};

const commitEdit = () => {
  if (!editingField.value) return;
  const isTarget = editingField.value === 'target';
  const parsed = parseEditValue(editValue.value, isTarget);
  processLevelUpdate(parsed, isTarget);
  editingField.value = null;
  editValue.value = '';
};

const cancelEdit = () => {
  editingField.value = null;
  editValue.value = '';
};

const handleEditorKeydown = createEditorKeydownHandler(commitEdit, cancelEdit);

const isMaxLevel = computed(() => levelState.value.current === 90);
</script>

<template>
  <div class="modal-section-card" :class="{ 'student-level-section-max': isMaxLevel }">
    <div class="student-level-row" :class="{ 'student-level-row-max': isMaxLevel }">
      <div class="student-level-progress-pill">
        <span class="student-level-label">LEVEL</span>

        <button
          v-if="editingField !== 'current'"
          type="button"
          class="student-level-value-button"
          :aria-label="$t('currentLevel')"
          @click="startEdit('current')"
        >
          {{ levelState.current }}
        </button>
        <input
          v-else
          ref="currentEditorRef"
          v-model="editValue"
          name="current-level-input"
          type="number"
          class="student-level-editor-input"
          min="1"
          max="90"
          @blur="commitEdit"
          @keydown="handleEditorKeydown"
        />

        <template v-if="!isMaxLevel">
          <div class="student-level-arrow">→</div>
          <button
            v-if="editingField !== 'target'"
            type="button"
            class="student-level-value-button target"
            :aria-label="$t('targetLevel')"
            @click="startEdit('target')"
          >
            {{ levelState.target }}
          </button>
          <input
            v-else
            ref="targetEditorRef"
            v-model="editValue"
            name="target-level-input"
            type="number"
            class="student-level-editor-input target"
            :min="levelState.current"
            max="90"
            @blur="commitEdit"
            @keydown="handleEditorKeydown"
          />
        </template>
      </div>

      <div v-if="!isMaxLevel" class="student-level-chip student-level-chip-strong student-level-chip-exp">
        {{ $t('xpRequired') }}: {{ totalXpNeeded.toLocaleString() }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.upgrade-level-panel {
  width: 100%;
  max-width: none !important;
  align-self: stretch !important;
}

.student-level-row {
  display: grid;
  grid-template-columns: minmax(0, 6fr) minmax(0, 4fr);
  gap: 8px;
  align-items: stretch;
}

.student-level-row.student-level-row-max {
  grid-template-columns: 1fr;
}

.student-level-progress-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255, 201, 51, 0.35);
  background: linear-gradient(
    135deg,
    rgba(255, 201, 51, 0.24),
    rgba(51, 197, 255, 0.22)
  );
  padding: 4px 12px;
}

.student-level-label {
  font-style: italic;
  font-weight: 700;
  font-size: 0.74rem;
  color: var(--text-secondary);
  letter-spacing: 0.45px;
}

.student-level-value-button {
  border: 0;
  background: transparent;
  font-weight: 700;
  font-size: 0.98rem;
  color: var(--text-primary);
  line-height: 1;
  min-height: 28px;
  min-width: 28px;
  padding: 0 2px;
  border-radius: 6px;
  cursor: pointer;
}

.student-level-value-button.target {
  color: var(--accent-color);
}

.student-level-value-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.student-level-editor-input {
  width: 56px;
  height: 30px;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  text-align: center;
  background-color: var(--input-color, var(--background-primary));
  color: var(--text-primary);
  font-weight: 700;
  appearance: textfield;
  -moz-appearance: textfield;
}

.student-level-editor-input.target {
  color: var(--accent-color);
}

.student-level-editor-input::-webkit-outer-spin-button,
.student-level-editor-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.student-level-arrow {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-level-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
  min-height: 42px;
}

.student-level-chip-strong {
  font-weight: 700;
  color: var(--text-primary);
}

.student-level-chip-exp {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .student-level-row {
    grid-template-columns: 1fr;
  }

  .student-level-chip-exp {
    justify-content: flex-start;
  }
}
</style>
