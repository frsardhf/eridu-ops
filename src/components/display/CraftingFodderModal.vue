<script setup lang="ts">
import { $t } from '@/locales';
import { useCraftingFodder } from '@/consumables/hooks/useCraftingFodder';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { getItemIconUrl } from '@/consumables/utils/iconUtils';
import { formatLargeNumber } from '@/consumables/utils/materialUtils';
import type { RecyclableMaterial } from '@/consumables/hooks/useCraftingFodder';

const emit = defineEmits<{ close: [] }>();

const {
  thresholds,
  rarityFilter,
  allRarities,
  subcategories,
  recyclableStage1,
  recyclableStage2,
  toggleRarity,
} = useCraftingFodder();

const subcatLabel = (sub: string): string => {
  const key = sub === 'CDItem' ? 'craftingFodder.cdItem'
    : sub === 'BookItem' ? 'craftingFodder.bookItem'
    : 'craftingFodder.artifact';
  return $t(key);
};

useDocumentListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Escape') emit('close');
});
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">{{ $t('craftingFodder.title') }}</h2>
        <button class="icon-btn close-btn" type="button" @click="emit('close')" :aria-label="$t('close')">×</button>
      </div>

      <!-- Threshold grid: 3 subcat rows × 4 rarity cols -->
      <section class="section">
        <div class="section-label">{{ $t('craftingFodder.keepAtLeast') }}</div>
        <div class="threshold-grid">
          <!-- header row -->
          <div class="th-cell th-corner"></div>
          <div class="th-cell th-rarity" v-for="rar in allRarities" :key="rar">{{ rar }}</div>
          <!-- data rows (one per subcategory) -->
          <template v-for="sub in subcategories" :key="sub">
            <div class="th-cell th-subcat">{{ subcatLabel(sub) }}</div>
            <input
              v-for="rar in allRarities"
              :key="`${sub}-${rar}`"
              class="threshold-input"
              type="number"
              min="0"
              v-model.number="thresholds[sub][rar]"
            />
          </template>
        </div>
      </section>

      <!-- Rarity filter chips -->
      <section class="section">
        <div class="section-label">{{ $t('craftingFodder.stage1Filter') }}</div>
        <div class="chip-row">
          <button
            v-for="rar in allRarities"
            :key="rar"
            class="rarity-chip"
            :class="{ active: rarityFilter.includes(rar) }"
            type="button"
            @click="toggleRarity(rar)"
          >{{ rar }}</button>
        </div>
      </section>

      <!-- Stage previews: side by side on ≥500px, stacked below -->
      <div class="previews-row">
        <!-- Stage 1 preview -->
        <section class="section preview-section">
          <div class="section-label">{{ $t('craftingFodder.stage1') }}</div>
          <div v-if="recyclableStage1.length > 0" class="fodder-grid">
            <div
              v-for="m in recyclableStage1"
              :key="m.material.Id"
              class="fodder-item"
              :title="`${m.material.Name}: ${m.recyclableQty}`"
            >
              <img
                :src="getItemIconUrl(m.material.Icon, 'item', m.material.Tier)"
                :alt="m.material.Name"
                class="fodder-icon"
              />
              <span class="fodder-qty">{{ formatLargeNumber(m.recyclableQty) }}</span>
            </div>
          </div>
          <p v-else class="empty-state">{{ $t('craftingFodder.noFodder') }}</p>
        </section>

        <div class="previews-divider" aria-hidden="true"></div>

        <!-- Stage 2 preview -->
        <section class="section preview-section">
          <div class="section-label">{{ $t('craftingFodder.stage2') }}</div>
          <div v-if="recyclableStage2.length > 0" class="fodder-grid">
            <div
              v-for="m in recyclableStage2"
              :key="m.material.Id"
              class="fodder-item"
              :title="`${m.material.Name}: ${m.recyclableQty}`"
            >
              <img
                :src="getItemIconUrl(m.material.Icon, 'item', m.material.Tier)"
                :alt="m.material.Name"
                class="fodder-icon"
              />
              <span class="fodder-qty">{{ formatLargeNumber(m.recyclableQty) }}</span>
            </div>
          </div>
          <p v-else class="empty-state">{{ $t('craftingFodder.noFodder') }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(2px);
}

.modal-container {
  width: min(780px, 94vw);
  max-height: 85vh;
  overflow-y: auto;
  background: var(--background-primary);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  animation: modal-appear 0.22s ease;
}

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ── */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}

.icon-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.close-btn {
  border-color: transparent;
}

/* ── Sections ── */
.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Threshold grid ── */
.threshold-grid {
  display: grid;
  grid-template-columns: auto repeat(4, 1fr);
  gap: 4px;
  align-items: center;
}

.th-cell {
  font-size: 0.75rem;
  font-weight: 600;
  text-align: center;
  color: var(--text-secondary);
  padding: 2px 4px;
}

.th-corner {
  /* empty top-left cell */
}

.th-subcat {
  text-align: left;
  white-space: nowrap;
}

.threshold-input {
  width: 100%;
  min-width: 0;
  height: 28px;
  padding: 0 4px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.82rem;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
  transition: border-color 0.15s;
}

.threshold-input:focus {
  outline: none;
  border-color: var(--accent-color);
}

/* ── Rarity chips ── */
.chip-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rarity-chip {
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.rarity-chip.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 18%, var(--background-primary));
  color: var(--accent-color);
}

.rarity-chip:hover:not(.active) {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

/* ── Side-by-side stage previews ── */
.previews-row {
  display: flex;
  gap: 0;
  align-items: flex-start;
}

.preview-section {
  flex: 1;
  min-width: 0;
}

.previews-divider {
  width: 1px;
  align-self: stretch;
  background: var(--border-color);
  margin: 0 14px;
  flex-shrink: 0;
}

@media (max-width: 500px) {
  .previews-row {
    flex-direction: column;
  }
  .previews-divider {
    width: auto;
    height: 1px;
    margin: 4px 0;
  }
}

/* ── Fodder icon grid ── */
.fodder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(56px, 1fr));
  gap: 4px;
}

.fodder-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
}

.fodder-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fodder-qty {
  position: absolute;
  bottom: 1px;
  right: 2px;
  font-size: 0.68rem;
  font-weight: 700;
  color: #000;
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.9);
  line-height: 1;
}

/* ── Empty state ── */
.empty-state {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  padding: 4px 0;
}
</style>
