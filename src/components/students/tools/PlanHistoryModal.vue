<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import {
  getPlanHistoryChangeDetails,
  PLAN_HISTORY_LIMIT,
  usePlanHistory,
  type PlanHistoryChange,
  type PlanHistoryDetailGroup,
  type PlanHistoryRecord,
} from '@/lib/hooks/usePlanHistory';
import { getStudentIconUrl } from '@/lib/utils/iconUtils';
import { $t } from '@/locales';
import type { StudentProps } from '@/types/student';

const props = defineProps<{ students: StudentProps[] }>();
const emit = defineEmits<{ close: []; restored: [studentId: number] }>();

const backdropRef = ref<HTMLElement | null>(null);
const pendingRestore = ref<{
  event: PlanHistoryRecord;
  change: PlanHistoryChange;
} | null>(null);
const showClearConfirmation = ref(false);

const {
  events,
  isLoading,
  restoringStudentId,
  isClearingHistory,
  error,
  loadHistory,
  restoreChange,
  clearHistory,
} = usePlanHistory();

const studentsById = computed(
  () => new Map<number, StudentProps>(props.students.map((student) => [student.Id, student])),
);

function studentName(studentId: number): string {
  return studentsById.value.get(studentId)?.Name ?? $t('planHistory.unknownStudent');
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function historyDetailGroups(change: PlanHistoryChange): PlanHistoryDetailGroup[] {
  return getPlanHistoryChangeDetails(change, studentsById.value.get(change.studentId));
}

function requestRestore(event: PlanHistoryRecord, change: PlanHistoryChange): void {
  if (event.id === undefined) return;
  showClearConfirmation.value = false;
  pendingRestore.value = { event, change };
}

async function confirmRestore(): Promise<void> {
  const pending = pendingRestore.value;
  if (pending?.event.id === undefined) return;

  const restored = await restoreChange(pending.event.id, pending.change.studentId);
  if (!restored) return;

  emit('restored', pending.change.studentId);
  pendingRestore.value = null;
}

function requestClearHistory(): void {
  pendingRestore.value = null;
  showClearConfirmation.value = true;
}

async function confirmClearHistory(): Promise<void> {
  if (!(await clearHistory())) return;
  showClearConfirmation.value = false;
}

function close(): void {
  if (restoringStudentId.value !== null || isClearingHistory.value) return;
  emit('close');
}

function onOutsideClick(event: MouseEvent): void {
  if (event.target === backdropRef.value) close();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (pendingRestore.value) {
    pendingRestore.value = null;
    return;
  }
  if (showClearConfirmation.value) {
    showClearConfirmation.value = false;
    return;
  }
  close();
}

useClickOutside(onOutsideClick);
useDocumentListener('keydown', onKeydown);
onMounted(loadHistory);
</script>

<template>
  <div ref="backdropRef" class="history-backdrop">
    <section
      class="history-modal"
      role="dialog"
      aria-modal="true"
      :aria-label="$t('planHistory.title')"
    >
      <header class="history-header">
        <h2>{{ $t('planHistory.title') }}</h2>
        <button class="history-close" type="button" :aria-label="$t('close')" @click="close">
          ×
        </button>
      </header>

      <div v-if="pendingRestore" class="history-confirm">
        <div class="history-confirm-summary">
          <img
            :src="getStudentIconUrl(pendingRestore.change.studentId)"
            :alt="studentName(pendingRestore.change.studentId)"
            class="history-confirm-icon"
          />
          <div class="history-confirm-copy">
            <h3>
              {{
                $t('planHistory.confirmTitle', {
                  name: studentName(pendingRestore.change.studentId),
                })
              }}
            </h3>
            <p>{{ $t('planHistory.confirmBody') }}</p>
          </div>
        </div>

        <div class="history-confirm-fields">
          <strong>{{ $t('planHistory.changedAreas') }}:</strong>
          <div class="history-detail-list">
            <div
              v-for="group in historyDetailGroups(pendingRestore.change)"
              :key="group.field"
              class="history-detail-row"
            >
              <span class="history-detail-field">{{
                $t(`planHistory.fields.${group.field}`)
              }}</span>
              <span class="history-detail-values">{{ group.changes.join(' · ') }}</span>
            </div>
          </div>
        </div>

        <p class="history-warning">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 16h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
          </svg>
          {{ $t('planHistory.inventoryWarning') }}
        </p>

        <div v-if="error" class="history-error">{{ $t('planHistory.error') }}</div>
      </div>

      <div v-else-if="showClearConfirmation" class="history-confirm">
        <div class="history-confirm-copy">
          <h3>{{ $t('planHistory.clearConfirmTitle') }}</h3>
          <p>{{ $t('planHistory.clearConfirmBody') }}</p>
        </div>

        <p class="history-warning history-danger-warning">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2 1 21h22L12 2Zm1 16h-2v-2h2v2Zm0-4h-2v-4h2v4Z" />
          </svg>
          {{ $t('planHistory.clearWarning') }}
        </p>

        <div v-if="error" class="history-error">{{ $t('planHistory.error') }}</div>
      </div>

      <footer v-if="pendingRestore || showClearConfirmation" class="history-footer">
        <div class="history-footer-actions">
          <template v-if="pendingRestore">
            <button
              type="button"
              class="history-btn history-btn-secondary"
              :disabled="restoringStudentId !== null"
              @click="pendingRestore = null"
            >
              {{ $t('cancel') }}
            </button>
            <button
              type="button"
              class="history-btn history-btn-primary"
              :disabled="restoringStudentId !== null"
              @click="confirmRestore"
            >
              {{
                restoringStudentId !== null
                  ? $t('planHistory.restoring')
                  : $t('planHistory.restorePrevious')
              }}
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              class="history-btn history-btn-secondary"
              :disabled="isClearingHistory"
              @click="showClearConfirmation = false"
            >
              {{ $t('cancel') }}
            </button>
            <button
              type="button"
              class="history-btn history-btn-danger"
              :disabled="isClearingHistory"
              @click="confirmClearHistory"
            >
              {{ isClearingHistory ? $t('planHistory.clearing') : $t('planHistory.clearHistory') }}
            </button>
          </template>
        </div>
      </footer>

      <div v-else class="history-body">
        <div class="history-intro">
          <p class="history-subtitle">
            {{ $t('planHistory.subtitle', { count: PLAN_HISTORY_LIMIT }) }}
          </p>
          <button
            v-if="!isLoading && events.length > 0"
            type="button"
            class="history-clear"
            @click="requestClearHistory"
          >
            {{ $t('planHistory.clearHistory') }}
          </button>
        </div>

        <div v-if="error" class="history-error">
          <span>{{ $t('planHistory.error') }}</span>
          <button type="button" @click="loadHistory">{{ $t('planHistory.retry') }}</button>
        </div>

        <div v-if="isLoading" class="history-empty">{{ $t('loading') }}</div>
        <div v-else-if="events.length === 0" class="history-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5M12 7v5l3 2"
            />
          </svg>
          <strong>{{ $t('planHistory.emptyTitle') }}</strong>
          <span>{{ $t('planHistory.emptyBody') }}</span>
        </div>

        <div v-else class="history-events">
          <article v-for="event in events" :key="event.id" class="history-event">
            <div class="history-event-meta">
              <strong>{{ $t(`planHistory.sources.${event.source}`) }}</strong>
              <span v-if="event.changes.length > 1">
                {{ $t('planHistory.studentCount', { count: event.changes.length }) }}
              </span>
              <time :datetime="new Date(event.createdAt).toISOString()">
                {{ formatDate(event.createdAt) }}
              </time>
            </div>

            <div class="history-students">
              <div v-for="change in event.changes" :key="change.studentId" class="history-student">
                <img
                  :src="getStudentIconUrl(change.studentId)"
                  :alt="studentName(change.studentId)"
                  class="history-student-icon"
                  loading="lazy"
                />
                <div class="history-student-main">
                  <strong>{{ studentName(change.studentId) }}</strong>
                  <div class="history-detail-list">
                    <div
                      v-for="group in historyDetailGroups(change)"
                      :key="group.field"
                      class="history-detail-row"
                    >
                      <span class="history-detail-field">
                        {{ $t(`planHistory.fields.${group.field}`) }}
                      </span>
                      <span class="history-detail-values">{{ group.changes.join(' · ') }}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="history-restore"
                  @click="requestRestore(event, change)"
                >
                  {{ $t('planHistory.restore') }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.history-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(2px);
}

.history-modal {
  width: min(92vw, 620px);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
  background: var(--background-primary);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  animation: history-modal-appear 0.22s ease;
}

@keyframes history-modal-appear {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.history-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.history-header h2,
.history-confirm h3 {
  margin: 0;
  color: var(--text-primary);
}

.history-header h2 {
  font-size: 1rem;
  font-weight: 700;
}

.history-confirm-copy p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
}

.history-close {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
}

.history-close:hover,
.history-close:focus-visible {
  border-color: var(--accent-color);
  color: var(--text-primary);
}

.history-body {
  min-height: 240px;
  overflow-y: auto;
  padding: 12px 14px;
}

.history-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.history-subtitle {
  flex: 1;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.45;
}

.history-clear {
  flex: 0 0 auto;
  padding: 5px 9px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--color-negative);
  font-size: 0.78rem;
  cursor: pointer;
}

.history-clear:hover,
.history-clear:focus-visible {
  border-color: var(--color-negative);
}

.history-event {
  padding: 11px 0;
  border-top: 1px solid var(--border-color);
}

.history-event-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--text-tertiary);
  font-size: 0.78rem;
}

.history-event-meta strong {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.history-event-meta span::before {
  content: '/';
  margin-right: 6px;
  color: var(--border-color);
}

.history-event-meta time {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.history-students {
  display: grid;
  gap: 3px;
}

.history-student {
  min-width: 0;
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border-radius: 6px;
  background: var(--background-secondary);
}

.history-student-icon,
.history-confirm-icon {
  object-fit: cover;
  border-radius: 4px;
}

.history-student-icon {
  width: 36px;
  height: 36px;
}

.history-student-main {
  min-width: 0;
}

.history-student-main strong {
  display: block;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.83rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-detail-list {
  display: grid;
  gap: 2px;
  margin-top: 2px;
}

.history-detail-row {
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.35;
}

.history-detail-field {
  color: var(--text-secondary);
  font-weight: 600;
}

.history-detail-field::after {
  content: ':';
  margin-right: 5px;
}

.history-detail-values {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.history-restore,
.history-btn,
.history-error button {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font: inherit;
  cursor: pointer;
}

.history-restore {
  padding: 5px 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.history-restore:hover,
.history-restore:focus-visible,
.history-btn-secondary:hover,
.history-btn-secondary:focus-visible {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.history-empty {
  min-height: 210px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  color: var(--text-secondary);
  text-align: center;
}

.history-empty svg {
  width: 42px;
  height: 42px;
  margin-bottom: 4px;
  color: var(--accent-color);
}

.history-empty strong {
  color: var(--text-primary);
}

.history-confirm {
  overflow-y: auto;
  padding: 14px;
}

.history-confirm-summary {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-confirm-icon {
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
}

.history-confirm-copy {
  min-width: 0;
}

.history-confirm h3 {
  font-size: 1rem;
}

.history-confirm-fields {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  line-height: 1.45;
}

.history-confirm-fields strong {
  color: var(--text-primary);
}

.history-confirm-fields .history-detail-list {
  margin-top: 5px;
  padding: 7px 8px;
  border-radius: 5px;
  background: var(--background-secondary);
}

.history-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 10px 0 0;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--color-warning) 35%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--color-warning) 12%, var(--background-secondary));
  color: var(--color-warning);
  font-size: 0.8rem;
  line-height: 1.4;
}

.history-warning svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
  margin-top: 1px;
}

.history-danger-warning {
  border-color: color-mix(in srgb, var(--color-negative) 35%, transparent);
  background: color-mix(in srgb, var(--color-negative) 10%, var(--background-secondary));
  color: var(--color-negative);
}

.history-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid var(--color-negative);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.45;
}

.history-error button {
  padding: 5px 9px;
  background: transparent;
  color: var(--text-primary);
}

.history-footer {
  flex: 0 0 auto;
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
}

.history-footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.history-btn {
  padding: 5px 14px;
  font-size: 0.82rem;
}

.history-btn-secondary {
  background: transparent;
  color: var(--text-secondary);
}

.history-btn-primary {
  border-color: transparent;
  background: var(--accent-color);
  color: white;
  font-weight: 600;
}

.history-btn-danger {
  border-color: transparent;
  background: var(--color-negative);
  color: white;
  font-weight: 600;
}

.history-btn-primary:hover:not(:disabled),
.history-btn-primary:focus-visible:not(:disabled),
.history-btn-danger:hover:not(:disabled),
.history-btn-danger:focus-visible:not(:disabled) {
  opacity: 0.85;
}

.history-btn:disabled {
  opacity: 0.55;
  cursor: wait;
}

@media (max-width: 480px) {
  .history-modal {
    width: 100%;
    max-height: 90vh;
    position: fixed;
    bottom: 0;
    border-radius: 14px 14px 0 0;
  }

  .history-backdrop {
    align-items: flex-end;
  }

  .history-body {
    padding: 10px 12px;
  }

  .history-intro {
    align-items: flex-start;
  }

  .history-student {
    padding: 5px;
  }

  .history-confirm {
    padding: 12px;
  }

  .history-footer {
    padding: 10px 12px;
  }
}
</style>
