<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudentData } from '@/lib/hooks/useStudentData';
import { useBondsTracked } from '@/lib/hooks/useBondsTracked';
import { useGiftCalculation } from '@/lib/hooks/useGiftCalculation';
import { studentMatchesQuery } from '@/lib/utils/sortUtils';
import { getStudentIconUrl } from '@/lib/utils/iconUtils';
import { studentDataStore } from '@/lib/stores/studentStore';
import { MAX_BOND_LEVEL } from '@/lib/constants/gameConstants';
import { $t } from '@/locales';
import type { StudentProps } from '@/types/student';

const emit = defineEmits<{ (e: 'close'): void }>();

const { sortedStudentsArray } = useStudentData();
const { trackedIds, toggleTracked } = useBondsTracked();
const { getStudentsWithGifts } = useGiftCalculation();

const query = ref('');

// Owned students only — picker is about planning bonds for students you have
const ownedStudents = computed<StudentProps[]>(() =>
  sortedStudentsArray.value.filter(s => studentDataStore.value[s.Id]?.isOwned !== false)
);

const matched = computed<StudentProps[]>(() =>
  ownedStudents.value.filter(s => studentMatchesQuery(s, query.value))
);

// Sections: Tracking → Suggested → Bond maxed → All owned
function isBondMaxed(studentId: number): boolean {
  const current = studentDataStore.value[studentId]?.bondDetailData?.currentBond ?? 1;
  return current >= MAX_BOND_LEVEL;
}

// Hoisted ID sets — rebuilt only when their sources change, not per section.
const trackedSet = computed(() => new Set(trackedIds.value));
const suggestedIdSet = computed(
  () => new Set(getStudentsWithGifts('needed').map(u => u.student.Id))
);

const trackedStudents = computed<StudentProps[]>(() =>
  matched.value.filter(s => trackedSet.value.has(s.Id))
);

const suggestedStudents = computed<StudentProps[]>(() =>
  matched.value.filter(s =>
    suggestedIdSet.value.has(s.Id) && !trackedSet.value.has(s.Id) && !isBondMaxed(s.Id)
  )
);

const bondMaxedStudents = computed<StudentProps[]>(() =>
  matched.value.filter(s => !trackedSet.value.has(s.Id) && isBondMaxed(s.Id))
);

const restStudents = computed<StudentProps[]>(() =>
  matched.value.filter(s =>
    !trackedSet.value.has(s.Id) && !suggestedIdSet.value.has(s.Id) && !isBondMaxed(s.Id)
  )
);
</script>

<template>
  <div class="picker-backdrop" @click.self="emit('close')">
    <div class="picker-modal" role="dialog" aria-modal="true">
      <header class="picker-header">
        <h2>{{ $t('addStudent') }}</h2>
        <button class="picker-close" type="button" :aria-label="$t('cancel') ?? 'Close'" @click="emit('close')">×</button>
      </header>

      <div class="picker-search">
        <input
          v-model="query"
          type="text"
          :placeholder="$t('searchStudents')"
          class="picker-search-input"
          autofocus
        />
      </div>

      <div class="picker-body">
        <section v-if="trackedStudents.length">
          <h3 class="picker-section-label">{{ $t('alreadyTracked') }} ({{ trackedStudents.length }})</h3>
          <ul class="picker-list">
            <li v-for="s in trackedStudents" :key="s.Id" class="picker-row tracked">
              <img :src="getStudentIconUrl(s.Id)" :alt="s.Name" class="picker-icon" loading="lazy" />
              <span class="picker-name">{{ s.Name }}</span>
              <button type="button" class="picker-action remove" @click="toggleTracked(s.Id)">
                {{ $t('untrack') }}
              </button>
            </li>
          </ul>
        </section>

        <section v-if="suggestedStudents.length">
          <h3 class="picker-section-label">{{ $t('suggestedStudents') }} ({{ suggestedStudents.length }})</h3>
          <ul class="picker-list">
            <li v-for="s in suggestedStudents" :key="s.Id" class="picker-row">
              <img :src="getStudentIconUrl(s.Id)" :alt="s.Name" class="picker-icon" loading="lazy" />
              <span class="picker-name">{{ s.Name }}</span>
              <button type="button" class="picker-action add" @click="toggleTracked(s.Id)">+</button>
            </li>
          </ul>
        </section>

        <section v-if="bondMaxedStudents.length">
          <h3 class="picker-section-label">{{ $t('bondMaxed') }} ({{ bondMaxedStudents.length }})</h3>
          <ul class="picker-list">
            <li v-for="s in bondMaxedStudents" :key="s.Id" class="picker-row bond-maxed">
              <img :src="getStudentIconUrl(s.Id)" :alt="s.Name" class="picker-icon" loading="lazy" />
              <span class="picker-name">{{ s.Name }}</span>
              <button type="button" class="picker-action add" disabled aria-disabled="true">+</button>
            </li>
          </ul>
        </section>

        <section v-if="restStudents.length">
          <h3 class="picker-section-label">{{ $t('allOwnedStudents') }} ({{ restStudents.length }})</h3>
          <ul class="picker-list">
            <li v-for="s in restStudents" :key="s.Id" class="picker-row">
              <img :src="getStudentIconUrl(s.Id)" :alt="s.Name" class="picker-icon" loading="lazy" />
              <span class="picker-name">{{ s.Name }}</span>
              <button type="button" class="picker-action add" @click="toggleTracked(s.Id)">+</button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1300;
}

.picker-modal {
  width: min(560px, 100% - 32px);
  max-height: min(720px, calc(100vh - 64px));
  display: flex;
  flex-direction: column;
  background: var(--card-background);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
}

.picker-header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.picker-close {
  background: transparent;
  border: none;
  font-size: 1.6rem;
  color: var(--text-secondary);
  cursor: pointer;
  line-height: 1;
}

.picker-search {
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
}

.picker-search-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  font-size: 0.92rem;
}

.picker-body {
  overflow: auto;
  padding: 8px 0;
}

.picker-section-label {
  margin: 8px 18px 4px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-secondary);
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 18px;
  transition: background-color 0.12s;
}

.picker-row:hover {
  background-color: color-mix(in srgb, var(--accent-color) 8%, transparent);
}

.picker-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--background-primary);
  flex-shrink: 0;
}

.picker-name {
  flex: 1;
  font-size: 0.92rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-action {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--background-primary);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.picker-action.add:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.picker-action.remove {
  color: var(--color-negative);
  border-color: color-mix(in srgb, var(--color-negative) 35%, var(--border-color));
}

.picker-row.tracked {
  background-color: color-mix(in srgb, var(--accent-color) 5%, transparent);
}

.picker-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.picker-action:disabled:hover {
  border-color: var(--border-color);
  color: var(--text-primary);
}
</style>
