<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { applyBulkStudentFormPatch, AvailabilityFilter, classifyStudentAvailability, getNonDefaultPersistedFormStudentIds } from '@/consumables/services/bulkStudentFormService';
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
  skillEx: string;
  skillPublic: string;
  skillPassive: string;
  skillExtraPassive: string;
  equipmentTier: string;
  gradeLevel: string;
  potentialLevel: string;
};

const isSubmitting = ref(false);
const selectedStudentIds = ref<number[]>([]);
const selectedStarFilters = ref<number[]>([]);
const selectedAvailabilityFilters = ref<AvailabilityFilter[]>([]);
const selectAllInput = ref<HTMLInputElement | null>(null);
const nonDefaultPersistedIds = ref<Set<number>>(new Set());

const fieldValues = ref<BulkFieldValues>({
  bond: '',
  characterLevel: '',
  skillEx: '',
  skillPublic: '',
  skillPassive: '',
  skillExtraPassive: '',
  equipmentTier: '',
  gradeLevel: '',
  potentialLevel: ''
});

const selectedIdSet = computed(() => new Set(selectedStudentIds.value));

const filteredStudents = computed<StudentProps[]>(() => {
  return props.students.filter(student => {
    const availability = classifyStudentAvailability(student);
    const matchStar = selectedStarFilters.value.length === 0 || selectedStarFilters.value.includes(student.StarGrade);
    const matchAvailability =
      selectedAvailabilityFilters.value.length === 0 ||
      selectedAvailabilityFilters.value.includes(availability);
    return matchStar && matchAvailability;
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

const hasAnyInputValue = computed(() => {
  return Object.values(fieldValues.value).some(value => value.trim().length > 0);
});

const isSubmitDisabled = computed(() => {
  return selectedCount.value === 0 || !hasAnyInputValue.value || isSubmitting.value;
});

watch([isAllFilteredSelected, isPartiallyFilteredSelected], () => {
  if (!selectAllInput.value) return;
  selectAllInput.value.indeterminate = isPartiallyFilteredSelected.value;
});

onMounted(async () => {
  nonDefaultPersistedIds.value = await getNonDefaultPersistedFormStudentIds(props.students);
});

function closeIfBackdrop(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close');
  }
}

function parseOptionalInt(value: string, min: number, max: number): number | null {
  const raw = value.trim();
  if (!raw) return null;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;

  const floored = Math.floor(parsed);
  return Math.max(min, Math.min(max, floored));
}

function getAvailabilityLabel(filter: AvailabilityFilter): string {
  switch (filter) {
    case 'fest':
      return 'Fest';
    case 'unique':
      return 'Unique';
    case 'event':
      return 'Event';
    case 'regular':
    default:
      return 'Regular';
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

function toggleStarFilter(star: number) {
  if (selectedStarFilters.value.includes(star)) {
    selectedStarFilters.value = selectedStarFilters.value.filter(value => value !== star);
    return;
  }
  selectedStarFilters.value = [...selectedStarFilters.value, star];
}

function toggleAvailabilityFilter(filter: AvailabilityFilter) {
  if (selectedAvailabilityFilters.value.includes(filter)) {
    selectedAvailabilityFilters.value = selectedAvailabilityFilters.value.filter(value => value !== filter);
    return;
  }
  selectedAvailabilityFilters.value = [...selectedAvailabilityFilters.value, filter];
}

async function submitBulkModify() {
  if (isSubmitDisabled.value) return;

  if (selectedStudentIds.value.length > BULK_CONFIRM_THRESHOLD) {
    const confirmed = window.confirm(
      `You are about to update ${selectedStudentIds.value.length} students. Continue?`
    );
    if (!confirmed) return;
  }

  const patch = {
    bondLevel: parseOptionalInt(fieldValues.value.bond, 1, 100),
    characterLevel: parseOptionalInt(fieldValues.value.characterLevel, 1, 100),
    skillEx: parseOptionalInt(fieldValues.value.skillEx, 1, 5),
    skillPublic: parseOptionalInt(fieldValues.value.skillPublic, 1, 10),
    skillPassive: parseOptionalInt(fieldValues.value.skillPassive, 1, 10),
    skillExtraPassive: parseOptionalInt(fieldValues.value.skillExtraPassive, 1, 10),
    equipmentTier: parseOptionalInt(fieldValues.value.equipmentTier, 1, 10),
    gradeLevel: parseOptionalInt(fieldValues.value.gradeLevel, 1, 10),
    potentialLevel: parseOptionalInt(fieldValues.value.potentialLevel, 0, 100)
  };

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
        <h2 class="bulk-modal-title">Bulk Modify Students</h2>
        <button class="bulk-close-btn" type="button" @click="emit('close')" :aria-label="$t('close')">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12 5.7 16.89a1 1 0 0 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.88a1 1 0 0 0 0-1.41Z"/>
          </svg>
        </button>
      </div>

      <div class="bulk-modal-content">
        <section class="bulk-section">
          <div class="selection-header">
            <h3 class="section-title">Student Selection</h3>
            <span class="selection-count">Selected: {{ selectedCount }} / {{ totalStudentsCount }}</span>
          </div>

          <div class="filter-row">
            <span class="filter-label">Base Grade</span>
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

          <div class="filter-row">
            <span class="filter-label">Availability</span>
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

          <label class="select-all-row">
            <input
              ref="selectAllInput"
              type="checkbox"
              :checked="isAllFilteredSelected"
              @change="toggleAllFilteredSelection(($event.target as HTMLInputElement).checked)"
            />
            <span>Select all filtered students</span>
            <span class="visible-count">Visible: {{ filteredStudents.length }}</span>
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
          <h3 class="section-title">Form Inputs (Current = Target on submit)</h3>
          <p class="section-note">
            Leave empty to keep existing value. For students without form data, defaults are used.
          </p>

          <div class="form-grid">
            <label class="field">
              <span>Bond</span>
              <input v-model="fieldValues.bond" type="number" min="1" max="100" placeholder="1-100" />
            </label>
            <label class="field">
              <span>Character Level</span>
              <input v-model="fieldValues.characterLevel" type="number" min="1" max="100" placeholder="1-100" />
            </label>
            <label class="field">
              <span>EX Skill</span>
              <input v-model="fieldValues.skillEx" type="number" min="1" max="5" placeholder="1-5" />
            </label>
            <label class="field">
              <span>Basic Skill</span>
              <input v-model="fieldValues.skillPublic" type="number" min="1" max="10" placeholder="1-10" />
            </label>
            <label class="field">
              <span>Enhanced Skill</span>
              <input v-model="fieldValues.skillPassive" type="number" min="1" max="10" placeholder="1-10" />
            </label>
            <label class="field">
              <span>Sub Skill</span>
              <input v-model="fieldValues.skillExtraPassive" type="number" min="1" max="10" placeholder="1-10" />
            </label>
            <label class="field">
              <span>Equipment Tier</span>
              <input v-model="fieldValues.equipmentTier" type="number" min="1" max="10" placeholder="1-10" />
            </label>
            <label class="field">
              <span>Grade Level</span>
              <input v-model="fieldValues.gradeLevel" type="number" min="1" max="10" placeholder="1-10" />
            </label>
            <label class="field">
              <span>Potential Level</span>
              <input v-model="fieldValues.potentialLevel" type="number" min="0" max="100" placeholder="0-100" />
            </label>
          </div>
        </section>
      </div>

      <div class="bulk-modal-footer">
        <p v-if="overwriteCount > 0" class="overwrite-warning">
          Warning: {{ overwriteCount }} selected students already have non-default saved form data. Filled fields will replace those values.
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
            {{ isSubmitting ? 'Applying...' : 'Apply Bulk Update' }}
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
  border-radius: 12px;
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

.filter-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
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
  -webkit-line-clamp: 2;
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

.section-note {
  margin: 4px 0 10px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field span {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.field input {
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
}

.field input:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 1px;
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
}
</style>
