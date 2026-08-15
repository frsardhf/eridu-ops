<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import GlobalNavbar from '@/components/navbar/GlobalNavbar.vue';
import CraftingFodderCard from '@/components/crafting/CraftingFodderCard.vue';
import DataLoadErrorBanner from '@/components/shared/DataLoadErrorBanner.vue';
import { useCraftingFodder } from '@/lib/hooks/useCraftingFodder';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { $t } from '@/locales';
import type { CraftingFodderStage } from '@/types/crafting';
import { useAnalytics } from '@/lib/hooks/useAnalytics';

const GlobalInventoryModal = defineAsyncComponent(
  () => import('@/components/inventory/GlobalInventoryModal.vue'),
);

const { isReady } = useStudentData();
const {
  thresholds,
  rarityFilter,
  allRarities,
  subcategories,
  hasSession,
  needsRefresh,
  stage1Materials,
  stage2Materials,
  summary,
  toggleRarity,
  resetThresholds,
  refreshSession,
  resetProgress,
  resetMaterial,
  setRemainingCrafts,
} = useCraftingFodder();
const { track } = useAnalytics();

const rulesOpen = ref(false);
const hideCompleted = ref(false);
const showInventory = ref(false);
const searchQuery = ref('');
const selectedTypes = ref<string[]>([]);

watch(
  isReady,
  (ready) => {
    if (ready && !hasSession.value) refreshSession();
  },
  { immediate: true },
);

const hasViewFilters = computed(
  () => Boolean(searchQuery.value.trim()) || selectedTypes.value.length > 0 || hideCompleted.value,
);

function applyViewFilters(items: typeof stage1Materials.value) {
  const query = searchQuery.value.trim().toLocaleLowerCase();

  return items.filter((item) => {
    if (hideCompleted.value && item.remainingCrafts === 0) return false;
    if (
      selectedTypes.value.length > 0 &&
      !selectedTypes.value.includes(item.material.SubCategory ?? '')
    ) {
      return false;
    }
    if (!query) return true;

    return (
      item.material.Name.toLocaleLowerCase().includes(query) ||
      String(item.material.Id).includes(query)
    );
  });
}

const stages = computed<
  {
    key: CraftingFodderStage;
    label: string;
    items: typeof stage1Materials.value;
    totalItems: number;
    capacity: number;
    assigned: number;
  }[]
>(() => [
  {
    key: 'stage1',
    label: $t('craftingFodder.stage1'),
    items: applyViewFilters(stage1Materials.value),
    totalItems: stage1Materials.value.length,
    capacity: summary.value.stage1Capacity,
    assigned: summary.value.stage1Planned,
  },
  {
    key: 'stage2',
    label: $t('craftingFodder.stage2'),
    items: applyViewFilters(stage2Materials.value),
    totalItems: stage2Materials.value.length,
    capacity: summary.value.stage2Capacity,
    assigned: summary.value.stage2Planned,
  },
]);

function subcategoryLabel(subcategory: string): string {
  if (subcategory === 'CDItem') return $t('craftingFodder.cdItem');
  if (subcategory === 'BookItem') return $t('craftingFodder.bookItem');
  return $t('craftingFodder.artifact');
}

function materialTypeCountLabel(count: number): string {
  return $t(
    count === 1 ? 'craftingFodder.materialTypeSingular' : 'craftingFodder.materialTypePlural',
  );
}

function toggleType(subcategory: string) {
  if (selectedTypes.value.includes(subcategory)) {
    selectedTypes.value = selectedTypes.value.filter((value) => value !== subcategory);
  } else {
    selectedTypes.value = [...selectedTypes.value, subcategory];
  }
  track({ name: 'filter_changed', feature: 'crafting_plan', action: 'changed' });
}

function clearTypes(): void {
  selectedTypes.value = [];
  track({ name: 'filter_changed', feature: 'crafting_plan', action: 'reset' });
}

function toggleCompleted(): void {
  hideCompleted.value = !hideCompleted.value;
  track({ name: 'filter_changed', feature: 'crafting_plan', action: 'changed' });
}

function openInventory(): void {
  showInventory.value = true;
  track({ name: 'feature_opened', feature: 'inventory', action: 'opened' });
}

function refreshPlan(): void {
  refreshSession();
  track({ name: 'workflow_completed', feature: 'crafting_plan', action: 'refreshed' });
}

function resetAllProgress(): void {
  resetProgress();
  track({ name: 'plan_action', feature: 'crafting_plan', action: 'reset' });
}

function resetRuleRow(subcategory: string): void {
  resetThresholds(subcategory);
  track({ name: 'setting_changed', feature: 'crafting_plan', action: 'reset' });
}

function toggleStageRarity(rarity: string): void {
  toggleRarity(rarity);
  track({ name: 'filter_changed', feature: 'crafting_plan', action: 'changed' });
}

function updateRemaining(materialId: number, stage: CraftingFodderStage, value: number): void {
  setRemainingCrafts(materialId, stage, value);
  track({ name: 'plan_action', feature: 'crafting_plan', action: 'adjusted' });
}

function resetMaterialProgress(materialId: number, stage: CraftingFodderStage): void {
  resetMaterial(materialId, stage);
  track({ name: 'plan_action', feature: 'crafting_plan', action: 'reset' });
}
</script>

<template>
  <div class="crafting-page">
    <GlobalNavbar />

    <main class="crafting-body">
      <DataLoadErrorBanner />

      <div class="crafting-toolbar">
        <label class="crafting-search">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path
              fill="currentColor"
              d="m21 20.3-5.5-5.5a7 7 0 1 0-1.1 1.1l5.5 5.5 1.1-1.1zM4.5 10a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0z"
            />
          </svg>
          <input
            id="crafting-material-search"
            v-model="searchQuery"
            name="crafting-material-search"
            type="search"
            :placeholder="$t('craftingFodder.searchPlaceholder')"
            :aria-label="$t('craftingFodder.searchPlaceholder')"
          />
        </label>

        <div
          class="crafting-type-toggle"
          role="group"
          :aria-label="$t('craftingFodder.materialType')"
        >
          <button
            type="button"
            :class="{ active: selectedTypes.length === 0 }"
            :aria-pressed="selectedTypes.length === 0"
            @click="clearTypes"
          >
            {{ $t('craftingFodder.allTypes') }}
          </button>
          <button
            v-for="subcategory in subcategories"
            :key="subcategory"
            type="button"
            :class="{ active: selectedTypes.includes(subcategory) }"
            :aria-pressed="selectedTypes.includes(subcategory)"
            @click="toggleType(subcategory)"
          >
            {{ subcategoryLabel(subcategory) }}
          </button>
        </div>

        <button
          type="button"
          class="crafting-btn crafting-toggle"
          :class="{ active: hideCompleted }"
          :aria-pressed="hideCompleted"
          @click="toggleCompleted"
        >
          {{ $t('craftingFodder.hideComplete') }}
        </button>

        <div class="crafting-toolbar-actions">
          <button type="button" class="crafting-btn" @click="openInventory">
            {{ $t('craftingFodder.openInventory') }}
          </button>
          <button
            type="button"
            class="crafting-btn crafting-toggle"
            :class="{ active: rulesOpen }"
            :aria-expanded="rulesOpen"
            @click="rulesOpen = !rulesOpen"
          >
            {{ $t('craftingFodder.planSettings') }}
          </button>
          <button
            type="button"
            class="crafting-btn primary"
            :disabled="!isReady"
            @click="refreshPlan"
          >
            {{ $t('craftingFodder.refreshPlan') }}
          </button>
        </div>
      </div>

      <div class="crafting-metrics">
        <span>
          <strong>{{ summary.remaining.toLocaleString() }}</strong>
          {{ $t('craftingFodder.craftsRemaining') }}
        </span>
        <span class="metric-separator">·</span>
        <span :title="$t('craftingFodder.capacityHint')">
          <strong>{{ summary.stage1Capacity.toLocaleString() }}</strong>
          {{ $t('craftingFodder.stage1Capacity') }}
        </span>
        <span class="metric-separator">·</span>
        <span :title="$t('craftingFodder.capacityHint')">
          <strong>{{ summary.stage2Capacity.toLocaleString() }}</strong>
          {{ $t('craftingFodder.stage2Capacity') }}
        </span>
        <span class="metric-separator">·</span>
        <span>
          <strong>{{ summary.completed.toLocaleString() }}</strong>
          {{ $t('craftingFodder.craftsRecorded') }}
        </span>
        <span class="crafting-subtitle">{{ $t('craftingFodder.subtitle') }}</span>
      </div>

      <div v-if="needsRefresh" class="refresh-notice" role="status">
        <span>{{ $t('craftingFodder.refreshNotice') }}</span>
        <button type="button" @click="refreshPlan">
          {{ $t('craftingFodder.refreshPlan') }}
        </button>
      </div>

      <section v-if="rulesOpen" class="plan-settings">
        <div class="plan-settings-header">
          <span>{{ $t('craftingFodder.rulesHint') }}</span>
          <button
            type="button"
            class="crafting-btn"
            :disabled="!summary.hasProgress"
            @click="resetAllProgress"
          >
            {{ $t('craftingFodder.resetProgress') }}
          </button>
        </div>

        <div class="rules-content">
          <div class="threshold-section">
            <div class="section-label">{{ $t('craftingFodder.keepAtLeast') }}</div>
            <div class="threshold-grid">
              <div class="threshold-cell threshold-corner"></div>
              <div
                v-for="rarity in allRarities"
                :key="rarity"
                class="threshold-cell threshold-rarity"
              >
                {{ rarity }}
              </div>
              <div class="threshold-cell threshold-reset-heading">
                {{ $t('craftingFodder.reset') }}
              </div>

              <template v-for="subcategory in subcategories" :key="subcategory">
                <div class="threshold-cell threshold-subcategory">
                  {{ subcategoryLabel(subcategory) }}
                </div>
                <input
                  v-for="rarity in allRarities"
                  :key="`${subcategory}-${rarity}`"
                  :id="`crafting-threshold-${subcategory}-${rarity}`"
                  :name="`crafting-threshold-${subcategory}-${rarity}`"
                  v-model.number="thresholds[subcategory][rarity]"
                  class="threshold-input"
                  type="number"
                  min="0"
                  :aria-label="`${subcategoryLabel(subcategory)} ${rarity}`"
                />
                <button
                  type="button"
                  class="threshold-reset"
                  :title="$t('craftingFodder.resetRow')"
                  :aria-label="`${$t('craftingFodder.resetRow')}: ${subcategoryLabel(subcategory)}`"
                  @click="resetRuleRow(subcategory)"
                >
                  ↺
                </button>
              </template>
            </div>
          </div>

          <div class="rarity-section">
            <div class="section-label">{{ $t('craftingFodder.stage1Filter') }}</div>
            <div class="rarity-chips">
              <button
                v-for="rarity in allRarities"
                :key="rarity"
                type="button"
                class="rarity-chip"
                :class="{ active: rarityFilter.includes(rarity) }"
                :aria-pressed="rarityFilter.includes(rarity)"
                @click="toggleStageRarity(rarity)"
              >
                {{ rarity }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div v-if="!isReady" class="page-state">{{ $t('loading') }}...</div>

      <section v-else class="stages-workspace">
        <div class="stages-grid">
          <section v-for="stage in stages" :key="stage.key" class="stage-panel">
            <div class="stage-heading">
              <div class="stage-title">
                <h2>{{ stage.label }}</h2>
                <span class="material-count">
                  <template v-if="hasViewFilters">{{ stage.items.length }} / </template>
                  {{ stage.totalItems }} {{ materialTypeCountLabel(stage.totalItems) }}
                </span>
              </div>
              <div class="stage-capacity" :title="$t('craftingFodder.capacityHint')">
                <strong>{{ stage.capacity.toLocaleString() }}</strong>
                {{ $t('craftingFodder.possible') }}
                <span>·</span>
                <strong>{{ stage.assigned.toLocaleString() }}</strong>
                {{ $t('craftingFodder.assigned') }}
              </div>
            </div>

            <div v-if="stage.items.length" class="fodder-grid">
              <CraftingFodderCard
                v-for="item in stage.items"
                :key="item.material.Id"
                :item="item"
                :field-id="`${stage.key}-${item.material.Id}`"
                @update:remaining="updateRemaining(item.material.Id, stage.key, $event)"
                @reset="resetMaterialProgress(item.material.Id, stage.key)"
              />
            </div>
            <p v-else-if="stage.totalItems > 0" class="page-state">
              {{ $t('craftingFodder.noMatches') }}
            </p>
            <p v-else class="page-state">{{ $t('craftingFodder.noFodder') }}</p>
          </section>
        </div>
      </section>
    </main>

    <GlobalInventoryModal v-if="showInventory" @close="showInventory = false" />
  </div>
</template>

<style scoped>
.crafting-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--background-primary);
  color: var(--text-primary);
}

.crafting-body {
  flex: 1;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
}

.crafting-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.crafting-search {
  height: 30px;
  min-width: 150px;
  max-width: 260px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 180px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-secondary);
}

.crafting-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 0.88rem;
}

.crafting-type-toggle {
  height: 30px;
  padding: 2px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
}

.crafting-type-toggle button {
  height: 100%;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}

.crafting-type-toggle button:hover {
  color: var(--accent-color);
}

.crafting-type-toggle button.active {
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--accent-color);
}

.crafting-toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.crafting-btn {
  height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
}

.crafting-btn:hover:not(:disabled) {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.crafting-btn.primary {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: #fff;
  font-weight: 700;
}

.crafting-btn.primary:hover:not(:disabled) {
  color: #fff;
  opacity: 0.9;
}

.crafting-toggle.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, transparent);
  color: var(--accent-color);
}

button:disabled {
  opacity: 0.45;
  cursor: default;
}

.crafting-metrics {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.crafting-metrics strong {
  margin-right: 3px;
  color: var(--text-primary);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.metric-separator {
  opacity: 0.5;
}

.crafting-subtitle {
  margin-left: auto;
  font-size: 0.8rem;
}

.refresh-notice {
  margin-bottom: 12px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid color-mix(in srgb, var(--color-warning) 65%, var(--border-color));
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-warning) 12%, var(--card-background));
  color: var(--text-primary);
  font-size: 0.8rem;
}

.refresh-notice button {
  padding: 4px 8px;
  border: 0;
  border-radius: 5px;
  background: var(--color-warning);
  color: #111827;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.plan-settings {
  margin-bottom: 14px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--card-background);
}

.plan-settings-header {
  min-height: 38px;
  padding: 4px 10px 4px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.rules-content {
  padding: 12px 14px 14px;
  display: grid;
  grid-template-columns: minmax(460px, 2fr) minmax(170px, 1fr);
  gap: 28px;
}

.section-label {
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.threshold-grid {
  display: grid;
  grid-template-columns: minmax(86px, auto) repeat(4, minmax(56px, 1fr)) 42px;
  gap: 5px;
  align-items: center;
}

.threshold-cell {
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: center;
}

.threshold-subcategory {
  text-align: left;
  white-space: nowrap;
}

.threshold-reset-heading {
  font-size: 0.62rem;
}

.threshold-input {
  width: 100%;
  min-width: 0;
  height: 30px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  outline: 0;
  background: var(--input-background);
  color: var(--text-primary);
  font-size: 0.78rem;
  text-align: center;
}

.threshold-input:focus {
  border-color: var(--accent-color);
}

.threshold-reset {
  width: 30px;
  height: 30px;
  margin: 0 auto;
  padding: 0;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.threshold-reset:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.rarity-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rarity-chip {
  min-width: 48px;
  padding: 5px 12px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--background-primary);
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.rarity-chip.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 14%, var(--background-primary));
  color: var(--accent-color);
}

.stages-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  align-items: start;
}

.stage-panel {
  min-width: 0;
}

.stage-heading {
  margin-bottom: 9px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.stage-heading h2 {
  margin: 0;
  font-size: 0.92rem;
}

.stage-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-count {
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.stage-capacity {
  color: var(--text-secondary);
  font-size: 0.7rem;
  white-space: nowrap;
}

.stage-capacity strong {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.stage-capacity span {
  padding: 0 3px;
}

.fodder-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 9px;
}

.page-state {
  min-height: 100px;
  margin: 0;
  display: grid;
  place-items: center;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

@media (max-width: 1200px) {
  .stages-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .crafting-toolbar-actions {
    margin-left: 0;
  }

  .crafting-subtitle {
    width: 100%;
    margin-left: 0;
  }

  .rules-content {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .fodder-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .crafting-search {
    max-width: none;
    flex-basis: 100%;
  }

  .crafting-type-toggle {
    width: 100%;
  }

  .crafting-type-toggle button {
    min-width: 0;
    padding-inline: 5px;
    flex: 1;
  }

  .crafting-toolbar > .crafting-toggle {
    flex: 1;
  }

  .crafting-toolbar-actions {
    width: 100%;
  }

  .crafting-toolbar-actions .crafting-btn {
    min-width: 0;
    padding-inline: 8px;
    flex: 1;
  }

  .crafting-metrics {
    gap: 5px 7px;
  }

  .plan-settings-header {
    align-items: flex-start;
  }

  .rules-content {
    overflow-x: visible;
  }

  .threshold-section {
    min-width: 0;
  }

  .threshold-grid {
    grid-template-columns: 72px repeat(4, minmax(42px, 1fr)) 32px;
    gap: 4px;
  }

  .threshold-subcategory {
    font-size: 0.65rem;
  }

  .threshold-reset-heading {
    font-size: 0;
  }

  .threshold-reset-heading::after {
    content: '↺';
    font-size: 0.72rem;
  }

  .threshold-reset {
    width: 28px;
    height: 28px;
  }

  .stage-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .fodder-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
  }
}

@media (max-width: 480px) {
  .crafting-body {
    padding: 12px;
  }

  .crafting-toolbar-actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .fodder-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
