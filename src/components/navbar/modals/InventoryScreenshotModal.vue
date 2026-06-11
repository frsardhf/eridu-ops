<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { $t } from '@/locales';
import { saveItemsInventory, saveEquipmentInventory } from '@/lib/services/studentPersistenceService';
import {
  getAllItemsFromCache,
  updateItemInCache,
  getAllEquipmentFromCache,
  updateEquipmentInCache,
  getResourceDataByIdSync,
  getEquipmentDataByIdSync,
} from '@/lib/stores/resourceCacheStore';
import type { CachedResource } from '@/types/resource';
import { MATERIAL, EQUIPMENT } from '@/types/resource';
import { applyFilters } from '@/lib/utils/filterUtils';
import ResourceCard from '@/components/inventory/ResourceCard.vue';
import { getItemIconUrl } from '@/lib/utils/iconUtils';

type InventoryType = 'items' | 'equipment';
type Step = 'type' | 'upload' | 'review';

const PARSER_BASE = (import.meta.env.VITE_PARSER_URL as string | undefined) ?? '/api';

// Upload validation thresholds.
// - MIME allowlist matches the <input accept> attr so drag-drop / paste paths
//   can't sneak in HEIC, GIF, BMP, etc. that would either be rejected by the
//   backend or waste a Gemini call on an unparseable image.
// - Dimensions are gated to FHD landscape (1920×1080) and above in the 16:9
//   family. Below FHD the icon CLIP matching degrades because cells fall under
//   ~100px and CLIP's 224×224 input requires aggressive upsampling. The 1900
//   floor leaves ~20px of slop for Snipping Tool / DPI rounding (e.g. 1919×1079).
// - Aspect ratio band 1.70–1.85 covers 16:9 with pixel tolerance while rejecting
//   16:10 (1.60), 21:9 ultrawide (2.37), and portrait phone screenshots.
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/webp'];
const MIN_WIDTH = 1900;
const MIN_ASPECT = 1.70;
const MAX_ASPECT = 1.85;

// Up to 3 screenshots per request — matches the backend's batched-Gemini cap
// (multi-grid OCR is reliable up to 3 grids). Each is downscaled to FHD width
// before upload so 3 shots stay well under the 10 MB request limit and the
// parser stays at its tuned resolution.
const MAX_SCREENSHOTS = 3;
const FHD_WIDTH = 1920;

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
}>();

const step = ref<Step>('type');
const inventoryType = ref<InventoryType>('items');
const isDragging = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');
const parsedResults = ref<ParsedItem[]>([]);
const hasLowConfidence = ref(false);

// Transient success banner shown on the upload step after Apply lands.
// The modal stays open after applying so the user can scan more screenshots
// without re-opening it from the navbar each time.
const lastAppliedCount = ref(0);
let appliedTimer: ReturnType<typeof setTimeout> | null = null;

// Two-phase progress bar:
//   Fast path (Gemini): typically ~20s — bar fills 0→85% in 30s.
//   Slow path (Florence-2 CPU fallback): ~4 min — bar crawls 85→95% over 210s.
// The switch happens automatically at 30s if the response hasn't arrived yet.
const FAST_SECONDS = 30;   // Gemini expected ceiling
const SLOW_SECONDS = 240;  // Florence-2 CPU fallback ceiling
const elapsedSeconds = ref(0);
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

const isSlowPath = computed(() => elapsedSeconds.value >= FAST_SECONDS);

const progressPercent = computed(() => {
  if (!isSlowPath.value) {
    // Fast phase: 0 → 85% in the first 30s
    return Math.min(85, Math.round((elapsedSeconds.value / FAST_SECONDS) * 85));
  }
  // Slow phase: 85% → 95% over the remaining ~210s
  const slowElapsed = elapsedSeconds.value - FAST_SECONDS;
  return Math.min(95, 85 + Math.round((slowElapsed / (SLOW_SECONDS - FAST_SECONDS)) * 10));
});

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const elapsedFormatted   = computed(() => formatTime(elapsedSeconds.value));
const remainingFormatted = computed(() =>
  formatTime(Math.max(0, SLOW_SECONDS - elapsedSeconds.value)),
);

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
  // Mirror the same filter used in ResourceGrid so blueprints and other
  // non-inventory items are excluded (avoids broken icons).
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
  const files = Array.from(event.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
  if (files.length) processFiles(files);
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  if (files.length) {
    processFiles(files);
    input.value = '';
  }
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };
    img.src = url;
  });
}

// Returns an error message string if the file is invalid, else null.
async function validateImageFile(file: File): Promise<string | null> {
  // MIME allowlist — stricter than <input accept> so drag/paste can't slip in HEIC/GIF/BMP.
  if (!ALLOWED_MIME.includes(file.type)) return $t('scanModal.errInvalidMime');
  let dims: { width: number; height: number };
  try {
    dims = await readImageDimensions(file);
  } catch {
    return $t('scanModal.errDecodeFailed');
  }
  const { width, height } = dims;
  if (width < height) return $t('scanModal.errNotLandscape', { width, height });
  if (width < MIN_WIDTH) return $t('scanModal.errTooSmall', { minWidth: MIN_WIDTH, width, height });
  const ratio = width / height;
  if (ratio < MIN_ASPECT || ratio > MAX_ASPECT) return $t('scanModal.errBadAspect', { width, height });
  return null;
}

// Downscale to FHD width (preserving aspect) so payload stays small and the
// parser sees its tuned resolution. Already-FHD-or-smaller files pass through.
async function downscaleToFHD(file: File): Promise<Blob> {
  let dims: { width: number; height: number };
  try {
    dims = await readImageDimensions(file);
  } catch {
    return file;
  }
  if (dims.width <= FHD_WIDTH) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('decode failed'));
      im.src = url;
    });
    const scale = FHD_WIDTH / dims.width;
    const canvas = document.createElement('canvas');
    canvas.width = FHD_WIDTH;
    canvas.height = Math.round(dims.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    return blob ?? file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function processFiles(fileList: File[]) {
  if (fileList.length === 0) return;
  if (fileList.length > MAX_SCREENSHOTS) {
    errorMessage.value = $t('scanModal.errTooMany', { max: MAX_SCREENSHOTS });
    return;
  }

  // Validate every file up front so the user learns about a bad one before upload.
  for (const f of fileList) {
    const err = await validateImageFile(f);
    if (err) {
      errorMessage.value = err;
      return;
    }
  }

  isLoading.value = true;
  errorMessage.value = '';

  elapsedSeconds.value = 0;
  const startedAt = Date.now();
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value = Math.floor((Date.now() - startedAt) / 1000);
  }, 1000);

  try {
    const blobs = await Promise.all(fileList.map(downscaleToFHD));
    const formData = new FormData();
    blobs.forEach((b, i) => formData.append('images', b, `screenshot-${i}.png`));
    formData.append('inventoryType', inventoryType.value);
    const res = await fetch(`${PARSER_BASE}/inventory/parse`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || `HTTP ${res.status}`);
    }
    const data = await res.json() as { results: ParsedItem[] };

    parsedResults.value = data.results;
    hasLowConfidence.value = data.results.some(r => r.confidence < 0.8);

    editedQuantities.value = {};
    editedItemIds.value = {};
    data.results.forEach(r => {
      editedQuantities.value[`${r.row}-${r.col}`] = r.quantity;
    });

    step.value = 'review';
  } catch (e: any) {
    errorMessage.value = $t('parseFailed') + (e?.message ? ` (${e.message})` : '');
  } finally {
    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }
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

  const appliedCount = Object.keys(quantityMap).length;

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

  // No global reinit here: the per-id cache updates above are the full effect
  // of an inventory edit, so dependents react without reloading the world.

  // Reset to upload step instead of closing — user can scan more screenshots.
  // Inventory type is preserved so a 10-page items scan doesn't re-prompt the
  // type selector on every page.
  parsedResults.value = [];
  editedQuantities.value = {};
  editedItemIds.value = {};
  activeSearchPos.value = null;
  errorMessage.value = '';
  hasLowConfidence.value = false;
  step.value = 'upload';

  lastAppliedCount.value = appliedCount;
  if (appliedTimer) clearTimeout(appliedTimer);
  appliedTimer = setTimeout(() => {
    lastAppliedCount.value = 0;
    appliedTimer = null;
  }, 4000);
}

onBeforeUnmount(() => {
  if (appliedTimer) clearTimeout(appliedTimer);
  if (elapsedTimer) clearInterval(elapsedTimer);
});

function closeModal(event: MouseEvent) {
  if (event.target === event.currentTarget) emit('close');
}

const showGuide = ref(false);

// ── Lightbox ──────────────────────────────────────────────────────────────
const GUIDE_IMGS = {
  itemsCorrect: ['/examples/scanner/items-correct-1.png', '/examples/scanner/items-correct-2.png'],
  itemsClipped: ['/examples/scanner/items-clipped-1.png', '/examples/scanner/items-clipped-2.png'],
  equipCorrect: ['/examples/scanner/equipment-correct-1.png', '/examples/scanner/equipment-correct-2.png'],
  equipClipped: ['/examples/scanner/equipment-clipped-1.png', '/examples/scanner/equipment-clipped-2.png'],
} as const;

const lightboxImages = ref<readonly string[]>([]);
const lightboxIndex  = ref(0);
const lightboxOpen   = computed(() => lightboxImages.value.length > 0);

function openLightbox(set: readonly string[], index: number) {
  lightboxImages.value = set;
  lightboxIndex.value  = index;
}
function closeLightbox()  { lightboxImages.value = []; }
function lightboxPrev()   { lightboxIndex.value = (lightboxIndex.value - 1 + lightboxImages.value.length) % lightboxImages.value.length; }
function lightboxNext()   { lightboxIndex.value = (lightboxIndex.value + 1) % lightboxImages.value.length; }

function onKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return;
  if (e.key === 'Escape')     { e.stopPropagation(); closeLightbox(); }
  if (e.key === 'ArrowLeft')  lightboxPrev();
  if (e.key === 'ArrowRight') lightboxNext();
}
useDocumentListener('keydown', onKeydown);

function onPaste(e: ClipboardEvent) {
  if (step.value !== 'upload') return;
  const imageItem = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
  if (!imageItem) return;
  const file = imageItem.getAsFile();
  if (!file) return;
  e.preventDefault();
  processFiles([file]);
}
useDocumentListener('paste', onPaste);
</script>

<template>
  <div class="modal-backdrop" @click="closeModal">
    <div class="modal-container" :class="`step-${step}`">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-left">
          <h2 class="modal-title">{{ $t('inventoryScreenshot') }}</h2>
          <button
            class="icon-btn help-btn"
            :class="{ active: showGuide }"
            type="button"
            aria-label="Scanner guide"
            @click="showGuide = !showGuide"
          >?</button>
        </div>
        <button class="icon-btn close-btn" type="button" :aria-label="$t('close')" @click="emit('close')">×</button>
      </div>

      <!-- Collapsible guide panel -->
      <div v-if="showGuide" class="guide-panel">
        <div class="guide-section">
          <p class="guide-section-title">{{ $t('scanGuide.beforeScanning.title') }}</p>
          <ul class="guide-list">
            <li v-html="$t('scanGuide.beforeScanning.sortOrder')"></li>
            <li v-html="$t('scanGuide.beforeScanning.onePerScan')"></li>
            <li v-html="$t('scanGuide.beforeScanning.selectType')"></li>
          </ul>
        </div>
        <div class="guide-section">
          <p class="guide-section-title">{{ $t('scanGuide.screenshots.title') }}</p>
          <ul class="guide-list">
            <li v-html="$t('scanGuide.screenshots.resolution')"></li>
            <li v-html="$t('scanGuide.screenshots.itemsTab')"></li>
            <li v-html="$t('scanGuide.screenshots.equipmentTab')"></li>
          </ul>
        </div>
        <div class="guide-section">
          <p class="guide-section-title">{{ $t('scanGuide.reviewing.title') }}</p>
          <ul class="guide-list">
            <li><span class="swatch swatch--med"></span> <span v-html="$t('scanGuide.reviewing.confidence')"></span></li>
            <li v-html="$t('scanGuide.reviewing.hoverControls')"></li>
            <li v-html="$t('scanGuide.reviewing.appliesDetected')"></li>
          </ul>
        </div>
        <div class="guide-section">
          <p class="guide-section-title">{{ $t('scanGuide.limitations.title') }}</p>
          <ul class="guide-list">
            <li v-html="$t('scanGuide.limitations.iconSimilarity')"></li>
          </ul>
        </div>

        <!-- Screenshot example table -->
        <div class="guide-section">
          <p class="guide-section-title">{{ $t('scanGuide.examples.title') }}</p>
          <div class="eg-grid">
            <div class="eg-th eg-th--good">{{ $t('scanGuide.examples.correct') }}</div>
            <div class="eg-th eg-th--bad">{{ $t('scanGuide.examples.clipped') }}</div>

            <div class="eg-cell">
              <div class="eg-thumb-pair">
                <img class="eg-thumb" src="/examples/scanner/items-correct-1.png" alt="Items correct 1" @click="openLightbox(GUIDE_IMGS.itemsCorrect, 0)" />
                <img class="eg-thumb" src="/examples/scanner/items-correct-2.png" alt="Items correct 2" @click="openLightbox(GUIDE_IMGS.itemsCorrect, 1)" />
              </div>
            </div>
            <div class="eg-cell eg-cell--bad">
              <div class="eg-thumb-pair">
                <img class="eg-thumb" src="/examples/scanner/items-clipped-1.png" alt="Items clipped 1" @click="openLightbox(GUIDE_IMGS.itemsClipped, 0)" />
                <img class="eg-thumb" src="/examples/scanner/items-clipped-2.png" alt="Items clipped 2" @click="openLightbox(GUIDE_IMGS.itemsClipped, 1)" />
              </div>
              <p class="eg-bad-caption">{{ $t('scanGuide.examples.clippedCaption') }}</p>
            </div>

            <div class="eg-cell">
              <div class="eg-thumb-pair">
                <img class="eg-thumb" src="/examples/scanner/equipment-correct-1.png" alt="Equipment correct 1" @click="openLightbox(GUIDE_IMGS.equipCorrect, 0)" />
                <img class="eg-thumb" src="/examples/scanner/equipment-correct-2.png" alt="Equipment correct 2" @click="openLightbox(GUIDE_IMGS.equipCorrect, 1)" />
              </div>
            </div>
            <div class="eg-cell eg-cell--bad">
              <div class="eg-thumb-pair">
                <img class="eg-thumb" src="/examples/scanner/equipment-clipped-1.png" alt="Equipment clipped 1" @click="openLightbox(GUIDE_IMGS.equipClipped, 0)" />
                <img class="eg-thumb" src="/examples/scanner/equipment-clipped-2.png" alt="Equipment clipped 2" @click="openLightbox(GUIDE_IMGS.equipClipped, 1)" />
              </div>
            </div>
          </div>
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
            <button class="back-btn" @click="step = 'type'">← {{ $t(inventoryType) }}</button>
          </div>

          <div v-if="lastAppliedCount > 0" class="apply-success">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ lastAppliedCount === 1 ? $t('scanModal.appliedOne') : $t('scanModal.appliedMany', { count: lastAppliedCount }) }}
          </div>

          <!-- Pre-upload preparation hint — type-specific, surfaces in-game prep
               rules right at the action point so users don't have to expand the
               guide panel. -->
          <div class="prep-hint">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" class="prep-hint-icon">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span v-html="inventoryType === 'equipment' ? $t('scanModal.prepHintEquipment') : $t('scanModal.prepHintItems')"></span>
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

            <div v-if="isLoading" class="status-message loading-message">
              <span class="loader"></span>
              <p class="loading-title">{{ $t('parsingScreenshot') }}</p>
              <div class="progress-track" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>
              <p class="progress-meta">
                {{ elapsedFormatted }} elapsed<template v-if="isSlowPath"> · ~{{ remainingFormatted }} remaining</template>
              </p>
              <p class="progress-tip">
                {{ isSlowPath ? $t('scanModal.tipSlow') : $t('scanModal.tipFast') }}
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
              <p class="dropzone-paste-hint">or <kbd>Ctrl+V</kbd> / <kbd>⌘V</kbd> to paste</p>
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
              <div v-if="groupedResults.length > 1" class="group-label">#{{ groupIdx + 1 }}</div>
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

  <!-- Lightbox (teleported to body to avoid z-index / overflow clipping) -->
  <Teleport to="body">
    <div v-if="lightboxOpen" class="lightbox-backdrop" @click.self="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox" aria-label="Close">×</button>
      <button v-if="lightboxImages.length > 1" class="lightbox-arrow lightbox-prev" @click="lightboxPrev" aria-label="Previous">←</button>
      <img class="lightbox-img" :src="lightboxImages[lightboxIndex]" alt="" />
      <button v-if="lightboxImages.length > 1" class="lightbox-arrow lightbox-next" @click="lightboxNext" aria-label="Next">→</button>
      <div class="lightbox-counter">{{ lightboxIndex + 1 }} / {{ lightboxImages.length }}</div>
    </div>
  </Teleport>
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
.modal-container.step-type   { width: min(500px, 90vw); }
.modal-container.step-upload { width: min(500px, 90vw); }
.modal-container.step-review { width: min(600px, 90vw); }

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

/* Shared icon button — matches BondUpdateModal .icon-btn */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 700;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
  flex-shrink: 0;
}
.icon-btn:hover {
  border-color: var(--accent-color);
  color: var(--text-primary);
}
.help-btn.active {
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  color: var(--accent-color);
}
.close-btn { border-color: transparent; }

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
.swatch--med { background: color-mix(in srgb, var(--color-warning) 55%, transparent); }
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

.dropzone-paste-hint {
  margin: 6px 0 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
}
.dropzone-paste-hint kbd {
  display: inline-block;
  padding: 1px 5px;
  border: 1px solid var(--border-color);
  border-radius: 3px;
  font-family: inherit;
  font-size: 0.75rem;
  background: var(--background-primary);
}


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

/* Loading state — explicit progress bar so users don't think a 4-min wait is a hang */
.loading-message {
  width: 100%;
  max-width: 320px;
  gap: 6px;
}
.loading-title {
  margin: 0;
  font-size: 0.95rem;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: var(--background-primary);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 4px;
}
.progress-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 3px;
  transition: width 0.8s linear;
}

.progress-meta {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.progress-tip {
  margin: 2px 0 0;
  font-size: 0.75rem;
  color: var(--text-secondary);
  line-height: 1.4;
  text-align: center;
  max-width: 280px;
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
  background: color-mix(in srgb, var(--color-warning) 14%, var(--background-secondary));
  border: 1px solid color-mix(in srgb, var(--color-warning) 40%, transparent);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
  color: #d97706;
  margin-bottom: 10px;
}

/* Persistent pre-upload hint — type-specific in-game prep rules.
   Quieter than .warning-banner / .apply-success so repeat users can skim past it,
   but always visible on the upload step. */
.prep-hint {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--background-secondary);
  border: 1px solid var(--border-color);
  border-left: 3px solid var(--accent-color);
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 10px;
}
.prep-hint :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}
.prep-hint-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--accent-color);
}

/* Transient banner shown above the dropzone after Apply.
   Fades out after 4s (driven by lastAppliedCount being reset to 0). */
.apply-success {
  display: flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, #10b981 14%, var(--background-secondary));
  border: 1px solid color-mix(in srgb, #10b981 40%, transparent);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.82rem;
  color: #059669;
  margin-bottom: 10px;
  animation: apply-success-in 0.18s ease-out;
}
@keyframes apply-success-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
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
.result-card-wrapper.conf-med { background: color-mix(in srgb, var(--color-warning) 18%, transparent); border-radius: 4px; }
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

/* ── Screenshot example grid ──────────────────────────────────────────── */
.eg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.eg-th {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 4px 5px;
  text-align: center;
}
.eg-th--good { color: #4ade80; }
.eg-th--bad  { color: #f87171; }

.eg-cell {
  padding: 3px 4px;
}
.eg-cell--bad {
  background: color-mix(in srgb, #ef4444 6%, transparent);
  border-radius: 4px;
}

.eg-thumb-pair {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.eg-thumb {
  width: 88px;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 3px;
  border: 1px solid var(--border-color);
  cursor: zoom-in;
  transition: border-color 0.15s, opacity 0.15s;
  background: var(--background-primary);
}
.eg-thumb:hover {
  border-color: var(--accent-color);
  opacity: 0.9;
}

.eg-bad-caption {
  margin: 4px 0 0;
  font-size: 0.68rem;
  color: #f87171;
  line-height: 1.4;
  text-align: center;
}

/* ── Lightbox ─────────────────────────────────────────────────────────── */
.lightbox-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(3px);
}

.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  user-select: none;
}

.lightbox-close {
  position: absolute;
  top: 14px;
  right: 18px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.65);
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  transition: color 0.15s;
}
.lightbox-close:hover { color: #fff; }

.lightbox-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 2.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 8px 12px;
  transition: color 0.15s;
  user-select: none;
}
.lightbox-arrow:hover { color: #fff; }
.lightbox-prev { left: 8px; }
.lightbox-next { right: 8px; }

.lightbox-counter {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.65);
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 10px;
  border-radius: 20px;
}
</style>
