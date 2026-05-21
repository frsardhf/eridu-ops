<script setup lang="ts">
import { $t } from '@/locales';
import '@/styles/modalActions.css';

const emit = defineEmits<{
  (e: 'confirm', mode: 'greedy' | 'aware'): void;
  (e: 'cancel'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <div class="sync-backdrop" @click.self="emit('cancel')">
      <div class="sync-modal">
        <div class="sync-header">
          <span class="sync-title">{{ $t('syncGiftsModeTitle') }}</span>
        </div>

        <div class="sync-options">
          <button class="sync-option sync-option-greedy" @click="emit('confirm', 'greedy')">
            <span class="sync-option-label">{{ $t('syncGiftsModeGreedy') }}</span>
            <span class="sync-option-desc">{{ $t('syncGiftsModeGreedyDesc') }}</span>
          </button>

          <button class="sync-option sync-option-aware" @click="emit('confirm', 'aware')">
            <span class="sync-option-label">{{ $t('syncGiftsModeAware') }}</span>
            <span class="sync-option-desc">{{ $t('syncGiftsModeAwareDesc') }}</span>
          </button>
        </div>

        <div class="sync-footer">
          <button class="modal-btn modal-btn-cancel" @click="emit('cancel')">{{ $t('cancel') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sync-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.sync-modal {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 20px;
  min-width: 300px;
  max-width: 440px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sync-header {
  text-align: center;
}

.sync-title {
  font-size: 1.1em;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sync-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--secondary-bg, rgba(0,0,0,0.05));
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  width: 100%;
}

.sync-option-greedy:hover {
  border-color: var(--accent-color);
  background: rgba(var(--accent-color-rgb), 0.08);
}

.sync-option-aware:hover {
  border-color: var(--success-color, #4caf50);
  background: rgba(76, 175, 80, 0.08);
}

.sync-option-label {
  font-size: 0.95em;
  font-weight: 600;
  color: var(--text-primary);
}

.sync-option-desc {
  font-size: 0.8em;
  color: var(--text-secondary);
  line-height: 1.4;
}

.sync-footer {
  display: flex;
  justify-content: flex-end;
}

</style>
