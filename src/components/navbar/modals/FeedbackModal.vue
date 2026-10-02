<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useClickOutside } from '@/composables/dom/useClickOutside';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import {
  FEEDBACK_CATEGORIES,
  MAX_FEEDBACK_MESSAGE_LENGTH,
  useFeedbackSubmission,
} from '@/lib/hooks/useFeedbackSubmission';
import { $t } from '@/locales';
import type { FeedbackCategory } from '@/types/feedback';

const emit = defineEmits<{ close: [] }>();
const category = ref<FeedbackCategory | ''>('');
const message = ref('');
const website = ref('');
const modalEl = ref<HTMLElement | null>(null);
let outsideClickReady = false;
const { failed, submit, submitted, submitting } = useFeedbackSubmission();

const categoryOptions = computed(() =>
  FEEDBACK_CATEGORIES.map((value) => ({
    value,
    label: $t(`feedbackModal.categories.${value}`),
  })),
);
const canSubmit = computed(
  () =>
    Boolean(category.value) &&
    message.value.trim().length > 0 &&
    message.value.length <= MAX_FEEDBACK_MESSAGE_LENGTH &&
    !submitting.value,
);

async function doSubmit(): Promise<void> {
  if (!canSubmit.value || !category.value) return;
  await submit(category.value, message.value, website.value);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') emit('close');
}

function onClickOutside(event: MouseEvent): void {
  if (!outsideClickReady) return;
  const target = event.target as Node;
  const targetElement = target instanceof Element ? target : null;
  if (!modalEl.value?.contains(target) && !targetElement?.closest('.select-popover')) {
    emit('close');
  }
}

onMounted(() => {
  queueMicrotask(() => {
    outsideClickReady = true;
  });
});
useClickOutside(onClickOutside);
useDocumentListener('keydown', onKeydown);
</script>

<template>
  <div class="feedback-backdrop">
    <section
      ref="modalEl"
      class="feedback-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      <header class="feedback-header">
        <h2 id="feedback-modal-title">{{ $t('feedback') }}</h2>
        <button
          type="button"
          class="feedback-close"
          :aria-label="$t('close')"
          @click="emit('close')"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div class="feedback-body">
        <div v-if="submitted" class="feedback-success" aria-live="polite">
          <div class="feedback-success-icon" aria-hidden="true">✓</div>
          <h3>{{ $t('feedbackModal.successTitle') }}</h3>
          <p>{{ $t('feedbackModal.successBody') }}</p>
        </div>

        <form v-else id="feedback-form" class="feedback-form" @submit.prevent="doSubmit">
          <p class="feedback-intro">{{ $t('feedbackModal.body') }}</p>

          <div class="feedback-field">
            <span>{{ $t('feedbackModal.category') }}</span>
            <SelectMenu
              v-model="category"
              block
              :options="categoryOptions"
              :placeholder="$t('feedbackModal.selectCategory')"
              :aria-label="$t('feedbackModal.category')"
            />
          </div>

          <label class="feedback-field">
            <span>{{ $t('feedbackModal.message') }}</span>
            <textarea
              v-model="message"
              rows="7"
              :maxlength="MAX_FEEDBACK_MESSAGE_LENGTH"
              :placeholder="$t('feedbackModal.messagePlaceholder')"
              aria-describedby="feedback-privacy"
              required
            ></textarea>
            <span class="feedback-count" aria-hidden="true">
              {{ message.length }}/{{ MAX_FEEDBACK_MESSAGE_LENGTH }}
            </span>
          </label>

          <label class="feedback-honeypot" aria-hidden="true">
            Website
            <input v-model="website" type="text" tabindex="-1" autocomplete="off" />
          </label>

          <p id="feedback-privacy" class="feedback-privacy">
            {{ $t('feedbackModal.privacy') }}
          </p>
          <p v-if="failed" class="feedback-error" role="alert">
            {{ $t('feedbackModal.error') }}
          </p>
        </form>
      </div>

      <footer class="feedback-footer">
        <button v-if="submitted" type="button" class="feedback-button" @click="emit('close')">
          {{ $t('close') }}
        </button>
        <template v-else>
          <button type="button" class="feedback-button ghost" @click="emit('close')">
            {{ $t('feedbackModal.cancel') }}
          </button>
          <button type="submit" form="feedback-form" class="feedback-button" :disabled="!canSubmit">
            {{ submitting ? $t('feedbackModal.sending') : $t('feedbackModal.send') }}
          </button>
        </template>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.feedback-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.feedback-modal {
  display: flex;
  flex-direction: column;
  width: min(480px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--background-primary);
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

.feedback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 12px 12px 18px;
  border-bottom: 1px solid var(--border-color);
}

.feedback-header h2 {
  margin: 0;
  font-size: 1.05rem;
}

.feedback-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.feedback-close:hover {
  background: var(--background-secondary);
  color: var(--text-primary);
}

.feedback-body {
  min-height: 0;
  overflow-y: auto;
  padding: 18px;
}

.feedback-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feedback-intro,
.feedback-privacy,
.feedback-error {
  margin: 0;
  line-height: 1.45;
}

.feedback-intro {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.feedback-field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.feedback-field > span:first-child {
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 700;
}

.feedback-field textarea {
  width: 100%;
  min-height: 132px;
  box-sizing: border-box;
  resize: vertical;
  padding: 9px 10px 24px;
  border: 1px solid var(--input-border);
  border-radius: 10px;
  background: var(--input-background);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.45;
}

.feedback-field textarea:focus {
  border-color: var(--accent-color);
  outline: none;
}

.feedback-field textarea::placeholder {
  color: var(--input-placeholder);
}

.feedback-count {
  position: absolute;
  right: 9px;
  bottom: 7px;
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.feedback-honeypot {
  position: absolute;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.feedback-privacy {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.feedback-error {
  color: var(--color-negative);
  font-size: 0.8rem;
  font-weight: 700;
}

.feedback-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 4px;
  text-align: center;
}

.feedback-success-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-positive) 16%, transparent);
  color: var(--color-positive);
  font-size: 1.45rem;
  font-weight: 900;
}

.feedback-success h3 {
  margin: 4px 0 0;
  font-size: 1.05rem;
}

.feedback-success p {
  max-width: 38ch;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.45;
}

.feedback-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 11px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--card-background);
}

.feedback-button {
  padding: 6px 15px;
  border: 1px solid var(--accent-color);
  border-radius: 999px;
  background: var(--accent-color);
  color: var(--text-on-accent);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
}

.feedback-button:hover:not(:disabled) {
  border-color: var(--accent-color-hover);
  background: var(--accent-color-hover);
}

.feedback-button.ghost {
  border-color: var(--border-color);
  background: transparent;
  color: var(--text-secondary);
}

.feedback-button.ghost:hover {
  border-color: var(--border-color);
  background: var(--background-secondary);
  color: var(--text-primary);
}

.feedback-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (max-width: 576px) {
  .feedback-backdrop {
    align-items: flex-end;
    padding: 12px;
  }

  .feedback-modal {
    max-height: calc(100vh - 24px);
    border-radius: 16px;
  }

  .feedback-body {
    padding: 15px;
  }
}
</style>
