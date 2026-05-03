<script setup lang="ts">
import { ref, computed } from 'vue';
import { $t } from '@/locales';
import { saveItemsInventory, saveEquipmentInventory } from '@/consumables/utils/studentStorage';
import {
  getAllItemsFromCache,
  updateItemInCache,
  getAllEquipmentFromCache,
  updateEquipmentInCache,
  getResourceDataByIdSync,
  getEquipmentDataByIdSync,
} from '@/consumables/stores/resourceCacheStore';
import type { CachedResource } from '@/types/resource';
import { MATERIAL, EQUIPMENT } from '@/types/resource';
import { applyFilters } from '@/consumables/utils/filterUtils';
import ResourceCard from '@/components/inventory/ResourceCard.vue';
import { getItemIconUrl } from '@/consumables/utils/iconUtils';

type InventoryType = 'items' | 'equipment';
type Step = 'type' | 'upload' | 'review';

const PARSER_BASE = (import.meta.env.VITE_PARSER_URL as string | undefined) ?? '/api';

interface ParsedItem {
  row: number;
  col: number;
  itemId: string;
  rarity: string;
  quantity: number;
  confidence: number;
}

const emit = defineEmits<{
  'close': [];
  'inventory-updated': [];
}>();

const step = ref<Step>('type');
const inventoryType = ref<InventoryType>('items');
const isDragging = ref(false);
const isLoading = ref(false);
const loadingProgress = ref({ current: 0, total: 1 });
const errorMessage = ref('');
const parsedResults = ref<ParsedItem[]>([]);
const hasLowConfidence = ref(false);

// Keyed by `${row}-${col}` (position-stable even when item is changed)
const editedQuantities = ref<Record<string, number>>({});
const editedItemIds    = ref<Record<string, string>>({});
const activeSearchPos  = ref<string | null>(null);
const searchQuery      = ref('');

// ── Position key helpers ──────────────────────────────────────────────────
function posKey(item: ParsedItem): string {
  return `${item.row}-${item.col}`;
}

// Rows per screenshot: equipment grid is 5 rows, items grid is 4 rows.
// Used in the template for gridTemplateRows / gridRow calculations.
const rowsPerGroup = computed(() => inventoryType.value === 'equipment' ? 5 : 4);

// ── Grouped results (one group per screenshot) ────────────────────────────
const groupedResults = computed(() => {
  // Read inventoryType directly to avoid computed-chain reactivity edge cases.
  const rpg = inventoryType.value === 'equipment' ? 5 : 4;
  const groups: ParsedItem[][] = [];
  for (const item of parsedResults.value) {
    const idx = Math.floor(item.row / rpg);
    if (!groups[idx]) groups[idx] = [];
    groups[idx].push(item);
  }
  return groups;
});

// ── Item search ──────────────────────────────────────────────────────────
const searchResults = computed<CachedResource[]>(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return [];
  const isEquipment = inventoryType.value === 'equipment';
  const raw = isEquipment ? getAllEquipmentFromCache() : getAllItemsFromCache();
  // Mirror the same filter used in ItemsGrid / EquipmentGrid so blueprints
  // and other non-inventory items are excluded (avoids broken icons).
  const eligible = applyFilters(raw, isEquipment ? EQUIPMENT : MATERIAL);
  return (Object.values(eligible) as CachedResource[])
    .filter(item => item.Name.toLowerCase().includes(q))
    // For equipment, skip Tier ≤ 1 (exp items + T1 pieces per user preference).
    .filter(item => !isEquipment || (item.Tier ?? 0) > 1)
    .slice(0, 8);
});

function openSearch(pk: string) {
  activeSearchPos.value = pk;
  searchQuery.value = '';
}

function closeSearch() {
  activeSearchPos.value = null;
  searchQuery.value = '';
}

function selectSearchResult(itemId: number) {
  if (!activeSearchPos.value) return;
  editedItemIds.value[activeSearchPos.value] = String(itemId);
  closeSearch();
}

// ── Resource lookup ───────────────────────────────────────────────────────
function getEffectiveResource(item: ParsedItem): CachedResource | null {
  const id = editedItemIds.value[posKey(item)] ?? item.itemId;
  return inventoryType.value === 'equipment'
    ? getEquipmentDataByIdSync(parseInt(id))
    : getResourceDataByIdSync(parseInt(id));
}

// ── Upload flow ───────────────────────────────────────────────────────────
function selectType(type: InventoryType) {
  inventoryType.value = type;
  step.value = 'upload';
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files?.length) processFiles(Array.from(files).slice(0, 3));
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    processFiles(Array.from(input.files).slice(0, 3));
    input.value = '';
  }
}

async function processFiles(files: File[]) {
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) {
    errorMessage.value = 'Please select image files (PNG, JPG, or WebP).';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  loadingProgress.value = { current: 0, total: imageFiles.length };

  try {
    const requests = imageFiles.map((file, idx) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('inventoryType', inventoryType.value);
      return fetch(`${PARSER_BASE}/inventory/parse`, {
        method: 'POST',
        body: formData,
      }).then(async res => {
        loadingProgress.value.current++;
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).error || `HTTP ${res.status}`);
        }
        const data = await res.json() as { results: ParsedItem[] };
        // Offset rows by screenshot index × rpg so posKeys stay unique across screenshots.
        const rpg = inventoryType.value === 'equipment' ? 5 : 4;
        return data.results.map(r => ({ ...r, row: r.row + idx * rpg }));
      });
    });

    const allResults = (await Promise.all(requests)).flat();
    parsedResults.value = allResults;
    hasLowConfidence.value = allResults.some(r => r.confidence < 0.8);

    editedQuantities.value = {};
    editedItemIds.value = {};
    allResults.forEach(r => {
      editedQuantities.value[`${r.row}-${r.col}`] = r.quantity;
    });

    step.value = 'review';
  } catch (e: any) {
    errorMessage.value = $t('parseFailed') + (e?.message ? ` (${e.message})` : '');
  } finally {
    isLoading.value = false;
  }
}

// ── Review actions ────────────────────────────────────────────────────────
function confidenceLabel(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

function updateQuantity(pk: string, event: Event) {
  const val = parseInt((event.target as HTMLInputElement).value);
  editedQuantities.value[pk] = isNaN(val) ? 0 : val;
}

function removeItem(pk: string) {
  parsedResults.value = parsedResults.value.filter(r => posKey(r) !== pk);
  delete editedQuantities.value[pk];
  delete editedItemIds.value[pk];
  hasLowConfidence.value = parsedResults.value.some(r => r.confidence < 0.8);
}

function goReupload() {
  parsedResults.value = [];
  editedQuantities.value = {};
  editedItemIds.value = {};
  activeSearchPos.value = null;
  errorMessage.value = '';
  step.value = 'upload';
}

async function applyResults() {
  const quantityMap: Record<string, number> = {};
  parsedResults.value.forEach(r => {
    const pk = posKey(r);
    const effectiveId = editedItemIds.value[pk] ?? r.itemId;
    quantityMap[effectiveId] = editedQuantities.value[pk] ?? r.quantity;
  });

  if (inventoryType.value === 'items') {
    await saveItemsInventory(quantityMap);
    const cache = getAllItemsFromCache();
    for (const [id, item] of Object.entries(cache)) {
      if (quantityMap[id] !== undefined) {
        updateItemInCache(Number(id), { ...item, QuantityOwned: quantityMap[id] } as CachedResource);
      }
    }
  } else {
    await saveEquipmentInventory(quantityMap);
    const cache = getAllEquipmentFromCache();
    for (const [id, item] of Object.entries(cache)) {
      if (quantityMap[id] !== undefined) {
        updateEquipmentInCache(Number(id), { ...item, QuantityOwned: quantityMap[id] } as CachedResource);
      }
    }
  }

  emit('inventory-updated');
  emit('close');
}

function closeModal(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close');
}

const showGuide = ref(false);
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="modal-container" :class="`step-${step}`">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <h2 class="modal-title">{{ $t('inventoryScreenshot') }}</h2>
          <button
            class="help-btn"
            :class="{ active: showGuide }"
            type="button"
            aria-label="Scanner guide"
            @click="showGuide = !showGuide"
          >?</button>
        </div>
        <button class="close-button" @click="emit('close')" :aria-label="$t('close')">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <!-- Collapsible guide panel -->
      <div v-if="showGuide" class="guide-panel">
        <div class="guide-section">
          <p class="guide-section-title">Before scanning</p>
          <ul class="guide-list">
            <li>Set inventory sort to <strong>ascending or descending by Item ID</strong> (the game default). Name / usage / owned sort is not supported.</li>
            <li>Up to <strong>3 screenshots per scan</strong>. Scroll to a new page and add each screenshot separately.</li>
            <li>Select the correct type: <strong>Items</strong> or <strong>Equipment</strong> — the grids differ.</li>
          </ul>
        </div>
        <div class="guide-section">
          <p class="guide-section-title">Screenshots</p>
          <ul class="guide-list">
            <li>Optimised for <strong>FHD (1920 × 1080)</strong>. Higher resolutions (2K / 4K) work fine — the parser locates the inventory panel by aspect ratio.</li>
            <li><strong>Items</strong> tab detects: EXP materials, artifacts, CD items, book items, and gifts (4 rows per page).</li>
            <li><strong>Equipment</strong> tab detects: T2+ equipment pieces (5 rows per page). T1 pieces and EXP equipment are excluded.</li>
          </ul>
        </div>
        <div class="guide-section">
          <p class="guide-section-title">Reviewing results</p>
          <ul class="guide-list">
            <li><span class="swatch swatch--med"></span> Orange = moderate confidence (50–80%); <span class="swatch swatch--low"></span> red = low confidence (&lt;50%). Inspect these first.</li>
            <li>Hover any card to reveal controls: <strong>✏</strong> change item · edit quantity field · <strong>×</strong> remove.</li>
            <li>Applying only updates quantities for <strong>detected items</strong> — undetected cells are left unchanged.</li>
          </ul>
        </div>
        <div class="guide-section">
          <p class="guide-section-title">Known limitations</p>
          <ul class="guide-list">
            <li>OCR may confuse similar digits (1 ↔ 7, 3 ↔ 5) on very small quantities.</li>
            <li>The icon model may misidentify visually similar items within the same design family (e.g. blu-ray series).</li>
            <li>Items at 0 quantity show lower confidence because the OCR has no digit to read.</li>
          </ul>
        </div>
      </div>

      <div class="modal-content">

        <!-- Step 1: Choose type -->
        <template v-if="step === 'type'">
          <p class="step-label">{{ $t('selectInventoryType') }}</p>
          <div class="type-buttons">
            <button class="type-btn" @click="selectType('items')">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              {{ $t('items') }}
            </button>
            <button class="type-btn" @click="selectType('equipment')">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              </svg>
              {{ $t('equipment') }}
            </button>
          </div>
        </template>

        <!-- Step 2: Upload -->
        <template v-else-if="step === 'upload'">
          <div class="step-nav">
            <button class="back-btn" @click="step = 'type'">← {{ $t('items') === $t(inventoryType) ? $t('items') : $t('equipment') }}</button>
          </div>

          <div
            class="dropzone"
            :class="{ dragging: isDragging, 'has-status': isLoading || !!errorMessage }"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
          >
            <input
              type="file"
              id="screenshot-input"
              class="file-input"
              accept="image/png,image/jpeg,image/webp"
              multiple
              @change="handleFileSelect"
            />

            <div v-if="isLoading" class="status-message">
              <span class="loader"></span>
              <p>
                {{ $t('parsingScreenshot') }}
                <span v-if="loadingProgress.total > 1">
                  ({{ loadingProgress.current }}/{{ loadingProgress.total }})
                </span>
              </p>
            </div>

            <div v-else-if="errorMessage" class="status-message error">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{{ errorMessage }}</p>
              <label for="screenshot-input" class="browse-button">{{ $t('uploadScreenshot') }}</label>
            </div>

            <div v-else class="dropzone-content">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p class="dropzone-text">{{ $t('dragDropScreenshot') }}</p>
              <p class="dropzone-subtext">{{ $t('or') }}</p>
              <label for="screenshot-input" class="browse-button">{{ $t('browseFiles') }}</label>
            </div>
          </div>
        </template>

        <!-- Step 3: Review -->
        <template v-else-if="step === 'review'">
          <div class="review-header">
            <span class="review-title">{{ $t('parseResults') }}</span>
            <span class="review-count">{{ parsedResults.length }} items</span>
          </div>

          <div v-if="hasLowConfidence" class="warning-banner">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {{ $t('lowConfidenceWarning') }}
          </div>

          <div v-if="parsedResults.length === 0" class="empty-results">
            {{ $t('noItemsDetected') }}
          </div>

          <!-- Click-away backdrop for item search -->
          <div v-if="activeSearchPos" class="search-backdrop" @click="closeSearch" />

          <div v-if="parsedResults.length > 0" class="results-groups">
            <div
              v-for="(group, groupIdx) in groupedResults"
              :key="groupIdx"
              class="screenshot-group"
              :class="`group-${groupIdx % 2}`"
            >
              <div class="group-label">#{{ groupIdx + 1 }}</div>
              <div class="results-grid" :style="{ gridTemplateRows: `repeat(${rowsPerGroup}, auto)` }">
            <div
              v-for="item in group"
              :key="posKey(item)"
              class="result-card-wrapper"
              :style="{
                gridColumn: item.col + 1,
                gridRow: (item.row % rowsPerGroup) + 1,
              }"
              :class="{
                'conf-low': item.confidence < 0.5,
                'conf-med': item.confidence >= 0.5 && item.confidence < 0.8
              }"
            >
              <!-- Active search: inline overlay replaces the card -->
              <div
                v-if="activeSearchPos === posKey(item)"
                class="item-search-panel"
                :class="{
                  'anchor-right': item.col >= 3,
                  'anchor-top': (item.row % rowsPerGroup) >= rowsPerGroup - 2,
                }"
              >
                <input
                  class="item-search-input"
                  v-model="searchQuery"
                  placeholder="Search item…"
                  autofocus
                  @keydown.escape="closeSearch"
                />
                <div class="item-search-results">
                  <div
                    v-for="res in searchResults"
                    :key="res.Id"
                    class="item-search-option"
                    @click="selectSearchResult(res.Id)"
                  >
                    <img
                      :src="getItemIconUrl(res.Icon, inventoryType === 'equipment' ? 'equipment' : 'item', res.Tier)"
                      class="search-opt-icon"
                    />
                    <span class="search-opt-name">{{ res.Name }}</span>
                  </div>
                  <div v-if="searchQuery && !searchResults.length" class="item-search-empty">No results</div>
                </div>
              </div>

              <!-- Normal card view -->
              <template v-else>
                <ResourceCard
                  v-if="getEffectiveResource(item)"
                  :item="getEffectiveResource(item)!"
                  :value="editedQuantities[posKey(item)]"
                  :item-type="inventoryType === 'equipment' ? 'equipment' : 'resource'"
                  :input-tab-index="-1"
                  @update:value="updateQuantity(posKey(item), $event)"
                />
                <div v-else class="result-card-placeholder" />

                <!-- Remove button (×) — top-left, shown on hover -->
                <button
                  class="card-remove-btn"
                  @click.stop="removeItem(posKey(item))"
                  title="Remove item"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>

                <!-- Edit button (pencil) — top-right, shown on hover -->
                <button
                  class="card-edit-btn"
                  @click.stop="openSearch(posKey(item))"
                  title="Change item"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>


                <!-- Blue dot (bottom-right) — item was manually changed -->
                <span
                  v-if="editedItemIds[posKey(item)]"
                  class="edited-dot"
                  title="Icon changed"
                />
              </template>
            </div>
              </div>
            </div>
          </div>

          <div class="review-actions">
            <button class="reupload-btn" @click="goReupload">{{ $t('reupload') }}</button>
            <button
              class="apply-btn"
              :disabled="parsedResults.length === 0"
              @click="applyResults"
            >
              {{ $t('applyInventory') }}
            </button>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-container {
  background-color: var(--background-primary);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-appear 0.25s ease;
}

/* Width adapts to step content */
.modal-container.step-type   { width: min(340px, 90vw); }
.modal-container.step-upload { width: min(420px, 90vw); }
.modal-container.step-review { width: min(560px, 90vw); }

@keyframes modal-appear {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.help-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.help-btn:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}
.help-btn.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color);
}

.close-button {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: color 0.2s;
}
.close-button:hover { color: var(--text-primary); }

/* Guide panel */
.guide-panel {
  border-bottom: 1px solid var(--border-color);
  background: var(--background-secondary);
  padding: 10px 16px 8px;
  flex-shrink: 0;
  overflow-y: auto;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.guide-section { display: flex; flex-direction: column; gap: 3px; }

.guide-section-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.guide-list {
  margin: 0;
  padding: 0 0 0 14px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.65;
}
.guide-list li { list-style: disc; }
.guide-list strong { color: var(--text-primary); font-weight: 600; }

.swatch {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  vertical-align: middle;
  margin-right: 2px;
}
.swatch--med { background: color-mix(in srgb, #f59e0b 55%, transparent); }
.swatch--low { background: color-mix(in srgb, #ef4444 55%, transparent); }

.modal-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

/* Step 1 */
.step-label {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0 0 14px;
}

.type-buttons {
  display: flex;
  gap: 12px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-secondary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.18s ease;
}
.type-btn:hover {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 10%, var(--background-secondary));
}

/* Step 2 */
.step-nav {
  margin-bottom: 12px;
}

.back-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}
.back-btn:hover { color: var(--text-primary); }

.dropzone {
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  padding: 24px 16px;
  text-align: center;
  transition: all 0.2s ease;
  background: var(--background-secondary);
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dropzone.dragging {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--background-secondary));
}
.dropzone.has-status { border-style: solid; }

.file-input { display: none; }

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
}
.dropzone-text {
  margin: 8px 0 2px;
  font-size: 0.95rem;
  color: var(--text-primary);
}
.dropzone-subtext {
  margin: 2px 0;
  font-size: 0.85rem;
}

.status-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-primary);
}
.status-message.error { color: #e57373; }

.browse-button {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 6px 18px;
  border-radius: 20px;
  margin-top: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: opacity 0.2s;
  display: inline-block;
}
.browse-button:hover { opacity: 0.85; }


.loader {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border-color);
  border-bottom-color: var(--accent-color);
  border-radius: 50%;
  display: inline-block;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Step 3 */
.review-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 10px;
}
.review-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}
.review-count {
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, #f59e0b 14%, var(--background-secondary));
  border: 1px solid color-mix(in srgb, #f59e0b 40%, transparent);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
  color: #d97706;
  margin-bottom: 10px;
}

.empty-results {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
  padding: 24px 0;
}

.results-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}

.screenshot-group {
  border-radius: 6px;
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.screenshot-group.group-0 { background: var(--background-secondary); }
.screenshot-group.group-1 { background: color-mix(in srgb, var(--accent-color) 5%, var(--background-secondary)); }

.group-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-bottom: 1px solid var(--border-color);
}

/* 5-column grid matching the game's inventory layout.
   grid-template-rows is set dynamically via :style (4 rows for items, 5 for equipment).
   Items are placed via explicit grid-column/grid-row so that missing cells
   (low-confidence drops or partial pages) never shift their neighbours. */
.results-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 4px;
}

.result-card-wrapper {
  position: relative;
}

.result-card-placeholder {
  aspect-ratio: 1;
  background: var(--background-primary);
  border-radius: 4px;
}

/* Low-confidence background tint on the card wrapper */
.result-card-wrapper.conf-med { background: color-mix(in srgb, #f59e0b 18%, transparent); border-radius: 4px; }
.result-card-wrapper.conf-low { background: color-mix(in srgb, #ef4444 18%, transparent); border-radius: 4px; }


/* Blue dot (bottom-right) — item was manually changed */
.edited-dot {
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  z-index: 2;
  pointer-events: none;
}

/* Remove button (×) — top-left, visible only on hover */
.card-remove-btn {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 3;
  padding: 0;
}
.result-card-wrapper:hover .card-remove-btn { opacity: 1; }
.card-remove-btn:hover { background: rgba(239, 68, 68, 0.75); }

/* Edit button (pencil) — top-right, visible only on hover */
.card-edit-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 3;
  padding: 0;
}
.result-card-wrapper:hover .card-edit-btn { opacity: 1; }

/* Item search panel — overlays the cell, expands downward.
   Anchors left by default; cols 3-4 use .anchor-right to stay within the modal. */
.item-search-panel {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 200px;
  width: max-content;
  max-width: 260px;
  z-index: 20;
  background: var(--background-primary);
  border: 1px solid var(--accent-color);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.item-search-panel.anchor-right {
  left: auto;
  right: 0;
}
.item-search-panel.anchor-top {
  top: auto;
  bottom: 0;
}

.item-search-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.75rem;
  padding: 4px 6px;
  outline: none;
  box-sizing: border-box;
}

.item-search-results {
  overflow-y: auto;
  max-height: 160px;
}

.item-search-option {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--text-primary);
}
.item-search-option:hover { background: var(--background-secondary); }

.search-opt-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}
.search-opt-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-search-empty {
  padding: 6px;
  font-size: 0.72rem;
  color: var(--text-secondary);
  text-align: center;
}

/* Backdrop dismisses search when clicking outside the panel */
.search-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.reupload-btn {
  padding: 7px 16px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.88rem;
  transition: all 0.15s;
}
.reupload-btn:hover {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.apply-btn {
  padding: 7px 20px;
  border: none;
  border-radius: 6px;
  background: var(--accent-color);
  color: white;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
  transition: opacity 0.15s;
}
.apply-btn:hover:not(:disabled) { opacity: 0.85; }
.apply-btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
