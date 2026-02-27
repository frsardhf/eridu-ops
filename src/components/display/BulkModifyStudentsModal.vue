<script setup lang="ts">
import { computed, onMounted, ref, type Ref, watch } from 'vue';
import {
  applyBulkStudentFormPatch,
  AvailabilityFilter,
  classifyStudentAvailability,
  getBulkFilterData,
  type BulkFormPatch
} from '@/consumables/services/bulkStudentFormService';
import type { FormRecord } from '@/consumables/db/database';
import { batchSetStudentData } from '@/consumables/stores/studentStore';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';

const BULK_CONFIRM_THRESHOLD = 100;

const props = defineProps<{
  students: StudentProps[];
}>();

const emit = defineEmits<{
  close: [];
}>();

type BulkFieldValues = {
  bond: string;
  characterLevel: string;
  characterLevelTarget: string;
  skillEx: string;
  skillExTarget: string;
  skillPublic: string;
  skillPublicTarget: string;
  skillPassive: string;
  skillPassiveTarget: string;
  skillExtraPassive: string;
  skillExtraPassiveTarget: string;
  equipmentTierSlot1: string;
  equipmentTargetSlot1: string;
  equipmentTierSlot2: string;
  equipmentTargetSlot2: string;
  equipmentTierSlot3: string;
  equipmentTargetSlot3: string;
  gradeLevel: string;
  potentialLevel: string;
};

const isSubmitting = ref(false);
const selectedStudentIds = ref<number[]>([]);
const selectedStarFilters = ref<number[]>([]);
const selectedAvailabilityFilters = ref<AvailabilityFilter[]>([]);
const selectAllInput = ref<HTMLInputElement | null>(null);
const nonDefaultPersistedIds = ref<Set<number>>(new Set());
const allFormData = ref<Record<number, FormRecord>>({});
const isFormDataLoaded = ref(false);
const enableTargets = ref(false);
const characterLevelFilter = ref('');
const debouncedCharLevelFilter = ref('');
const showUnfilledOnly = ref(false);

const fieldValues = ref<BulkFieldValues>({
  bond: '',
  characterLevel: '',
  characterLevelTarget: '',
  skillEx: '',
  skillExTarget: '',
  skillPublic: '',
  skillPublicTarget: '',
  skillPassive: '',
  skillPassiveTarget: '',
  skillExtraPassive: '',
  skillExtraPassiveTarget: '',
  equipmentTierSlot1: '',
  equipmentTargetSlot1: '',
  equipmentTierSlot2: '',
  equipmentTargetSlot2: '',
  equipmentTierSlot3: '',
  equipmentTargetSlot3: '',
  gradeLevel: '',
  potentialLevel: ''
});

const selectedIdSet = computed(() => new Set(selectedStudentIds.value));

const filteredStudents = computed<StudentProps[]>(() => {
  const charLevelRaw = String(debouncedCharLevelFilter.value ?? '');
  const parsedCharLevel = charLevelRaw ? Number(charLevelRaw) : null;
  const hasCharFilter = parsedCharLevel !== null && Number.isFinite(parsedCharLevel) && parsedCharLevel > 0;

  return props.students.filter(student => {
    const availability = classifyStudentAvailability(student);
    const matchStar = selectedStarFilters.value.length === 0 || selectedStarFilters.value.includes(student.StarGrade);
    const matchAvailability =
      selectedAvailabilityFilters.value.length === 0 ||
      selectedAvailabilityFilters.value.includes(availability);

    if (!matchStar || !matchAvailability) return false;

    if (isFormDataLoaded.value) {
      if (showUnfilledOnly.value) {
        if (allFormData.value[student.Id]) return false;
      }

      if (hasCharFilter) {
        const form = allFormData.value[student.Id];
        if (!form || !form.characterLevels) return false;
        if (form.characterLevels.current !== parsedCharLevel) return false;
      }
    }

    return true;
  });
});

const filteredStudentIds = computed(() => filteredStudents.value.map(student => student.Id));

const selectedCount = computed(() => selectedStudentIds.value.length);
const totalStudentsCount = computed(() => props.students.length);

const selectedVisibleCount = computed(() => {
  return filteredStudentIds.value.filter(studentId => selectedIdSet.value.has(studentId)).length;
});

const isAllFilteredSelected = computed(() => {
  return filteredStudentIds.value.length > 0 && selectedVisibleCount.value === filteredStudentIds.value.length;
});

const isPartiallyFilteredSelected = computed(() => {
  return selectedVisibleCount.value > 0 && !isAllFilteredSelected.value;
});

const overwriteCount = computed(() => {
  return selectedStudentIds.value.filter(studentId => nonDefaultPersistedIds.value.has(studentId)).length;
});

function buildPatchFromFields(): BulkFormPatch {
  const fv = fieldValues.value;
  const targets = enableTargets.value;

  return {
    bondLevel: parseOptionalInt(fv.bond, 1, 100),
    characterLevel: parseOptionalInt(fv.characterLevel, 1, 90),
    characterLevelTarget: targets ? parseOptionalInt(fv.characterLevelTarget, 1, 90) : null,
    skillEx: parseOptionalInt(fv.skillEx, 1, 5),
    skillExTarget: targets ? parseOptionalInt(fv.skillExTarget, 1, 5) : null,
    skillPublic: parseOptionalInt(fv.skillPublic, 1, 10),
    skillPublicTarget: targets ? parseOptionalInt(fv.skillPublicTarget, 1, 10) : null,
    skillPassive: parseOptionalInt(fv.skillPassive, 1, 10),
    skillPassiveTarget: targets ? parseOptionalInt(fv.skillPassiveTarget, 1, 10) : null,
    skillExtraPassive: parseOptionalInt(fv.skillExtraPassive, 1, 10),
    skillExtraPassiveTarget: targets ? parseOptionalInt(fv.skillExtraPassiveTarget, 1, 10) : null,
    equipmentTierSlot1: parseOptionalInt(fv.equipmentTierSlot1, 1, 10),
    equipmentTargetSlot1: targets ? parseOptionalInt(fv.equipmentTargetSlot1, 1, 10) : null,
    equipmentTierSlot2: parseOptionalInt(fv.equipmentTierSlot2, 1, 10),
    equipmentTargetSlot2: targets ? parseOptionalInt(fv.equipmentTargetSlot2, 1, 10) : null,
    equipmentTierSlot3: parseOptionalInt(fv.equipmentTierSlot3, 1, 10),
    equipmentTargetSlot3: targets ? parseOptionalInt(fv.equipmentTargetSlot3, 1, 10) : null,
    gradeLevel: parseOptionalInt(fv.gradeLevel, 1, 9),
    potentialLevel: parseOptionalInt(fv.potentialLevel, 0, 25)
  };
}

const hasAnyPatchValue = computed(() => {
  const patch = buildPatchFromFields();
  return Object.values(patch).some(value => value !== null);
});

const isSubmitDisabled = computed(() => {
  if (selectedCount.value === 0 || isSubmitting.value) return true;
  return !hasAnyPatchValue.value;
});

const gradeStarDisplay = computed(() => {
  const raw = fieldValues.value.gradeLevel;
  if (!raw) return null;
  const grade = Math.max(1, Math.min(9, Math.floor(Number(raw))));
  if (!Number.isFinite(grade)) return null;
  return { starCount: grade <= 5 ? grade : grade - 5, isGold: grade <= 5 };
});

let charLevelDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(characterLevelFilter, (val) => {
  if (charLevelDebounceTimer !== null) clearTimeout(charLevelDebounceTimer);
  charLevelDebounceTimer = setTimeout(() => {
    debouncedCharLevelFilter.value = String(val ?? '');
    charLevelDebounceTimer = null;
  }, 300);
});

watch([isAllFilteredSelected, isPartiallyFilteredSelected], () => {
  if (!selectAllInput.value) return;
  selectAllInput.value.indeterminate = isPartiallyFilteredSelected.value;
});


onMounted(async () => {
  const { nonDefaultIds, formData } = await getBulkFilterData(props.students);
  nonDefaultPersistedIds.value = nonDefaultIds;
  allFormData.value = formData;
  isFormDataLoaded.value = true;
});

function closeIfBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close');
  }
}

function parseOptionalInt(value: string, min: number, max: number): number | null {
  const raw = value;
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  const floored = Math.floor(parsed);
  return Math.max(min, Math.min(max, floored));
}

function getAvailabilityLabel(filter: AvailabilityFilter): string {
  switch (filter) {
    case 'fest':   return $t('bulkModify.availability.fest');
    case 'unique': return $t('bulkModify.availability.unique');
    case 'event':  return $t('bulkModify.availability.event');
    case 'regular':
    default:       return $t('bulkModify.availability.regular');
  }
}

function toggleStudentSelection(studentId: number) {
  const selected = selectedIdSet.value;
  if (selected.has(studentId)) {
    selectedStudentIds.value = selectedStudentIds.value.filter(id => id !== studentId);
    return;
  }
  selectedStudentIds.value = [...selectedStudentIds.value, studentId];
}

function toggleAllFilteredSelection(checked: boolean) {
  const filteredIds = filteredStudentIds.value;
  if (checked) {
    const next = new Set(selectedStudentIds.value);
    filteredIds.forEach(id => next.add(id));
    selectedStudentIds.value = Array.from(next);
    return;
  }

  const filteredSet = new Set(filteredIds);
  selectedStudentIds.value = selectedStudentIds.value.filter(id => !filteredSet.has(id));
}

function toggleArrayItem<T>(arr: Ref<T[]>, item: T) {
  if (arr.value.includes(item)) {
    arr.value = arr.value.filter(v => v !== item);
    return;
  }
  arr.value = [...arr.value, item];
}

function toggleStarFilter(star: number) {
  toggleArrayItem(selectedStarFilters, star);
}

function toggleAvailabilityFilter(filter: AvailabilityFilter) {
  toggleArrayItem(selectedAvailabilityFilters, filter);
}

async function submitBulkModify() {
  if (isSubmitDisabled.value) return;

  if (selectedStudentIds.value.length > BULK_CONFIRM_THRESHOLD) {
    const confirmed = window.confirm(
      `You are about to update ${selectedStudentIds.value.length} students. Continue?`
    );
    if (!confirmed) return;
  }

  const patch = buildPatchFromFields();

  isSubmitting.value = true;

  try {
    const updatedRecords = await applyBulkStudentFormPatch(
      props.students,
      selectedStudentIds.value,
      patch
    );

    if (Object.keys(updatedRecords).length > 0) {
      batchSetStudentData(updatedRecords);
    }

    emit('close');
  } catch (error) {
    console.error('Failed to apply bulk student form update:', error);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="bulk-modal-backdrop" @click="closeIfBackdrop">
    <div class="bulk-modal">
      <div class="bulk-modal-header">
        <h2 class="bulk-modal-title">{{ $t('bulkModify.title') }}</h2>
        <button class="bulk-close-btn" type="button" @click="emit('close')" :aria-label="$t('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12 5.7 16.89a1 1 0 0 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41Z"/>
          </svg>
        </button>
      </div>

      <div class="bulk-modal-content">
        <section class="bulk-section">
          <div class="selection-header">
            <h3 class="section-title">{{ $t('bulkModify.studentSelection') }}</h3>
            <span class="selection-count">{{ $t('bulkModify.selected') }}: {{ selectedCount }} / {{ totalStudentsCount }}</span>
          </div>

          <div class="filters-grid">
            <div class="filter-type">
              <span class="filter-label">{{ $t('bulkModify.filters.baseGrade') }}</span>
              <div class="filter-pills-wrap">
                <button
                  v-for="star in [1, 2, 3]"
                  :key="`star-${star}`"
                  type="button"
                  class="filter-pill"
                  :class="{ active: selectedStarFilters.includes(star) }"
                  @click="toggleStarFilter(star)"
                >
                  {{ '★'.repeat(star) }}
                </button>
              </div>
            </div>

            <div class="filter-type">
              <span class="filter-label">{{ $t('bulkModify.filters.availability') }}</span>
              <div class="filter-pills-wrap">
                <button
                  v-for="filter in ['fest', 'unique', 'regular', 'event']"
                  :key="`limited-${filter}`"
                  type="button"
                  class="filter-pill"
                  :class="{ active: selectedAvailabilityFilters.includes(filter as AvailabilityFilter) }"
                  @click="toggleAvailabilityFilter(filter as AvailabilityFilter)"
                >
                  {{ getAvailabilityLabel(filter as AvailabilityFilter) }}
                </button>
              </div>
            </div>

            <div class="filter-type">
              <span class="filter-label">{{ $t('bulkModify.filters.charLevel') }}</span>
              <div class="filter-pills-wrap">
                <input
                  v-model="characterLevelFilter"
                  type="number"
                  class="filter-number-input"
                  min="1"
                  max="90"
                  placeholder="1-90"
                />
              </div>
            </div>

            <div class="filter-type">
              <span class="filter-label">{{ $t('bulkModify.filters.formStatus') }}</span>
              <div class="filter-pills-wrap">
                <button
                  type="button"
                  class="filter-pill"
                  :class="{ active: showUnfilledOnly }"
                  @click="showUnfilledOnly = !showUnfilledOnly"
                >
                  {{ $t('bulkModify.filters.unfilledOnly') }}
                </button>
              </div>
            </div>
          </div>

          <label class="select-all-row">
            <input
              ref="selectAllInput"
              type="checkbox"
              :checked="isAllFilteredSelected"
              @change="toggleAllFilteredSelection(($event.target as HTMLInputElement).checked)"
            />
            <span>{{ $t('bulkModify.selectAllFiltered') }}</span>
            <span class="visible-count">{{ $t('bulkModify.visible') }}: {{ filteredStudents.length }}</span>
          </label>

          <div class="student-selection-grid">
            <button
              v-for="student in filteredStudents"
              :key="student.Id"
              type="button"
              class="student-tile"
              :class="{ selected: selectedIdSet.has(student.Id) }"
              :title="student.Name"
              @click="toggleStudentSelection(student.Id)"
            >
              <img
                class="student-icon"
                :src="`https://schaledb.com/images/student/icon/${student.Id}.webp`"
                :alt="student.Name"
                loading="lazy"
              />
              <span class="student-name">{{ student.Name }}</span>
              <span v-if="selectedIdSet.has(student.Id)" class="student-check">✓</span>
            </button>
          </div>
        </section>

        <section class="bulk-section">
          <div class="form-section-header">
            <h3 class="section-title">{{ $t('bulkModify.formInputs') }}</h3>
            <label class="target-toggle">
              <input type="checkbox" v-model="enableTargets" />
              <span>{{ $t('bulkModify.setSeparateTargets') }}</span>
            </label>
          </div>
          <p class="section-note">{{ $t('bulkModify.formNote') }}</p>

          <div class="form-grid">
            <!-- Bond -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.bond') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.bond" type="number" min="1" max="100" placeholder="1-100" />
              </div>
            </div>

            <!-- Character Level -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.characterLevel') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.characterLevel" type="number" min="1" max="90" placeholder="1-90" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.characterLevelTarget"
                  type="number"
                  min="1"
                  max="90"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- EX Skill -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.skillEx') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.skillEx" type="number" min="1" max="5" placeholder="1-5" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.skillExTarget"
                  type="number"
                  min="1"
                  max="5"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Basic Skill -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.skillPublic') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.skillPublic" type="number" min="1" max="10" placeholder="1-10" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.skillPublicTarget"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Enhanced Skill -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.skillPassive') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.skillPassive" type="number" min="1" max="10" placeholder="1-10" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.skillPassiveTarget"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Sub Skill -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.skillExtraPassive') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.skillExtraPassive" type="number" min="1" max="10" placeholder="1-10" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.skillExtraPassiveTarget"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Equipment Slot 1 -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.equipmentSlot1') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.equipmentTierSlot1" type="number" min="1" max="10" placeholder="1-10" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.equipmentTargetSlot1"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Equipment Slot 2 -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.equipmentSlot2') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.equipmentTierSlot2" type="number" min="1" max="10" placeholder="1-10" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.equipmentTargetSlot2"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Equipment Slot 3 -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.equipmentSlot3') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.equipmentTierSlot3" type="number" min="1" max="10" placeholder="1-10" />
                <span v-if="enableTargets" class="field-arrow">→</span>
                <input
                  v-if="enableTargets"
                  v-model="fieldValues.equipmentTargetSlot3"
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Target"
                  class="target-input"
                />
              </div>
            </div>

            <!-- Grade Level -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.gradeLevel') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.gradeLevel" type="number" min="1" max="9" placeholder="1-9" />
                <span v-if="gradeStarDisplay" class="grade-star-badge" :class="{ gold: gradeStarDisplay.isGold, blue: !gradeStarDisplay.isGold }">
                  <svg viewBox="0 0 576 512" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
                  </svg>
                  <span class="grade-star-count">{{ gradeStarDisplay.starCount }}</span>
                </span>
              </div>
            </div>

            <!-- Potential Level -->
            <div class="field-group">
              <span class="field-label">{{ $t('bulkModify.fields.potentialLevel') }}</span>
              <div class="field-inputs">
                <input v-model="fieldValues.potentialLevel" type="number" min="0" max="25" placeholder="0-25" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="bulk-modal-footer">
        <p v-if="overwriteCount > 0" class="overwrite-warning">
          {{ $t('bulkModify.overwriteWarningPrefix') }}{{ overwriteCount }}{{ $t('bulkModify.overwriteWarningSuffix') }}
        </p>

        <div class="footer-actions">
          <button class="footer-btn secondary" type="button" @click="emit('close')">
            {{ $t('cancel') }}
          </button>
          <button
            class="footer-btn primary"
            type="button"
            :disabled="isSubmitDisabled"
            @click="submitBulkModify"
          >
            {{ isSubmitting ? $t('bulkModify.applying') : $t('bulkModify.apply') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bulk-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.bulk-modal {
  width: min(1100px, 100%);
  max-height: 92vh;
  background: var(--background-primary);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  box-shadow: 0 16px 30px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.bulk-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.bulk-modal-title {
  margin: 0;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.bulk-close-btn {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

.bulk-close-btn:hover {
  color: var(--text-primary);
  background: var(--hover-bg);
}

.bulk-modal-content {
  padding: 14px 16px;
  overflow-y: auto;
  display: grid;
  gap: 14px;
}

.bulk-section {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px;
  background: var(--background-secondary);
}

.selection-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 0.98rem;
  color: var(--text-primary);
}

.selection-count {
  font-size: 0.86rem;
  color: var(--text-secondary);
}

.filters-grid {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-start;
}

.filter-type {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 160px;
}

.filter-pills-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  min-height: 30px;
}

.filter-label {
  color: var(--text-secondary);
  font-size: 0.83rem;
  min-width: 90px;
}

.filter-pill {
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--background-primary);
  color: var(--text-primary);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.8rem;
}

.filter-pill.active {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.filter-number-input {
  height: 30px;
  width: 120px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.82rem;
}

@media (max-width: 640px) {
  .filters-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-type {
    min-width: 0;
  }
}

.filter-number-input:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}


.select-all-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.86rem;
  color: var(--text-secondary);
}

.visible-count {
  margin-left: auto;
}

.student-selection-grid {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
  gap: 8px;
  max-height: 270px;
  overflow-y: auto;
  padding-right: 4px;
}

.student-tile {
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  border-radius: 8px;
  padding: 6px 4px;
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.student-tile.selected {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 1px var(--accent-color) inset;
}

.student-icon {
  width: 46px;
  height: 46px;
  border-radius: 8px;
  object-fit: cover;
}

.student-name {
  font-size: 0.72rem;
  line-height: 1.1;
  text-align: center;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.student-check {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: var(--accent-color);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.form-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.target-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}

.target-toggle input {
  accent-color: var(--accent-color);
}

.section-note {
  margin: 4px 0 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.field-inputs {
  display: flex;
  align-items: center;
  gap: 6px;
}

.field-inputs input {
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  min-width: 0;
  flex: 1;
}

.field-inputs input:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
}

.field-arrow {
  color: var(--text-secondary);
  font-size: 0.82rem;
  flex-shrink: 0;
}

.target-input {
  flex: 1;
}

.grade-star-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
}

.grade-star-badge.gold {
  color: rgb(255, 201, 51);
  background: rgba(255, 201, 51, 0.12);
}

.grade-star-badge.blue {
  color: hsl(192, 100%, 60%);
  background: hsla(192, 100%, 60%, 0.12);
}

.grade-star-count {
  font-size: 0.78rem;
}

.bulk-modal-footer {
  border-top: 1px solid var(--border-color);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.overwrite-warning {
  margin: 0;
  font-size: 0.84rem;
  color: #ff8e8e;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.footer-btn {
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 0 14px;
  cursor: pointer;
  font-weight: 600;
}

.footer-btn.secondary {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.footer-btn.primary {
  background: var(--accent-color);
  color: #fff;
  border-color: var(--accent-color);
}

.footer-btn.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .bulk-modal {
    max-height: 95vh;
    border-radius: 10px;
  }

  .bulk-modal-content {
    padding: 12px;
  }

  .filter-label {
    min-width: 70px;
  }

  .student-selection-grid {
    grid-template-columns: repeat(auto-fill, minmax(74px, 1fr));
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
