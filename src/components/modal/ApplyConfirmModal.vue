<script setup lang="ts">
import { ref } from 'vue';
import { MaterialPreviewItem } from '@/types/upgrade';
import { getItemIconUrl } from '@/consumables/utils/iconUtils';
import { formatLargeNumber, isExpBall } from '@/consumables/utils/materialUtils';
import { $t } from '@/locales';
import '@/styles/resourceDisplay.css';

defineProps<{
  previewItems: MaterialPreviewItem[];
}>();

const emit = defineEmits<{
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

type ViewMode = 'consumed' | 'remaining';
const viewMode = ref<ViewMode>('consumed');

function getIconUrl(item: MaterialPreviewItem): string {
  const { Id, Icon, Tier } = item.material;
  if (isExpBall(Id)) {
    // XP balls live in the equipment image folder but never use the _piece suffix
    return `https://schaledb.com/images/equipment/icon/${Icon}.webp`;
  }
  return getItemIconUrl(Icon, item.type === 'equipments' ? 'equipment' : 'item', Tier);
}
</script>

<template>
  <Teleport to="body">
    <div class="confirm-backdrop" @click.self="emit('cancel')">
      <div class="confirm-modal">
        <div class="confirm-header">
          <span class="confirm-title">{{ $t('confirmApplyUpgrade') }}</span>
          <div class="view-toggle">
            <button
              class="toggle-btn toggle-used"
              :class="{ active: viewMode === 'consumed' }"
              @click="viewMode = 'consumed'"
            >{{ $t('used') }}</button>
            <button
              class="toggle-btn toggle-leftover"
              :class="{ active: viewMode === 'remaining' }"
              @click="viewMode = 'remaining'"
            >{{ $t('leftover') }}</button>
          </div>
        </div>

        <div class="confirm-body">
          <p v-if="previewItems.length === 0" class="empty-msg">
            {{ $t('noMaterialsToConsume') }}
          </p>
          <div v-else class="resources-grid">
            <div
              v-for="item in previewItems"
              :key="`${item.type}-${item.material.Id}`"
              class="resource-item"
              :title="item.material.Name"
            >
              <div class="resource-content">
                <img
                  :src="getIconUrl(item)"
                  :alt="item.material.Name"
                  class="resource-icon"
                />
                <span
                  v-if="viewMode === 'consumed'"
                  class="resource-quantity quantity-consumed"
                >{{ formatLargeNumber(item.needed) }}</span>
                <span
                  v-else
                  class="resource-quantity positive"
                >{{ formatLargeNumber(item.remaining) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="confirm-footer">
          <button class="cancel-btn" type="button" @click="emit('cancel')">{{ $t('cancel') }}</button>
          <button class="apply-btn" type="button" @click="emit('confirm')">{{ $t('confirm') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  backdrop-filter: blur(2px);
}

.confirm-modal {
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  width: 90%;
  max-width: 720px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: modal-appear 0.2s ease;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.confirm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.confirm-title {
  font-size: 1rem;
  font-weight: 700;
}

/* ── Used / Leftover toggle ── */
.view-toggle {
  display: flex;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.toggle-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.12s, color 0.12s;
}
.toggle-btn + .toggle-btn {
  border-left: 1px solid var(--border-color);
}
.toggle-btn:hover {
  color: var(--text-primary);
}
.toggle-btn.active {
  border-left-color: transparent;
}
.toggle-used.active {
  color: #1f4fd6;
  background: color-mix(in srgb, #1f4fd6 18%, var(--card-background));
}
.toggle-leftover.active {
  color: #2e7d32;
  background: color-mix(in srgb, #2e7d32 18%, var(--card-background));
}

.confirm-body {
  overflow-y: auto;
  flex: 1;
  background: var(--card-background);
  border-radius: 8px;
  margin: 6px 8px 4px;
}

.empty-msg {
  padding: 12px 16px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* Consumed overlay — amber, reuses same text-shadow as .resource-quantity */
:deep(.quantity-consumed) {
  color: #e57c00 !important;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
}

.cancel-btn {
  padding: 5px 14px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.15s;
}
.cancel-btn:hover {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.apply-btn {
  padding: 5px 16px;
  border: none;
  border-radius: 5px;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
  transition: opacity 0.15s;
}
.apply-btn:hover { opacity: 0.85; }

@media (max-width: 480px) {
  .confirm-modal {
    width: 100%;
    max-width: 100%;
    max-height: 90vh;
    border-radius: 12px 12px 0 0;
    border-bottom: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
  }
  .confirm-backdrop {
    align-items: flex-end;
  }
}
</style>
