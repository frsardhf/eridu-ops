<script setup lang="ts">
import { computed, ref } from 'vue';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { submitBond100Submission } from '@/lib/services/bond100Service';
import SelectMenu from '@/components/shared/SelectMenu.vue';
import { $t } from '@/locales';
import type { Bond100ServerOption, Bond100ServerRegion } from '@/types/bond100';

const props = defineProps<{
  serverOptions: Bond100ServerOption[];
}>();

const emit = defineEmits<{ close: [] }>();

// Account-level "add me": server + friend code only. The backend triggers an
// arona /refresh (rate-limited); whichever bond-100 students the player has in
// assist slots appear in the next sync.
const subServer = ref<Bond100ServerRegion | ''>('');
const subFriendCode = ref('');
const submitting = ref(false);
const formError = ref('');
const done = ref(false);

const serverChoices = computed(() =>
  props.serverOptions.map(o => ({ value: o.code, label: $t(o.labelKey) }))
);

async function doSubmit() {
  if (submitting.value || !subServer.value || !subFriendCode.value.trim()) return;
  submitting.value = true;
  formError.value = '';
  try {
    await submitBond100Submission({
      serverRegion: subServer.value,
      friendCode: subFriendCode.value.trim(),
    });
    done.value = true;
  } catch {
    formError.value = $t('bond100.form.error');
  } finally {
    submitting.value = false;
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close');
}
useDocumentListener('keydown', onKeydown);
</script>

<template>
  <div class="bsm-backdrop" @click.self="emit('close')">
    <section class="bsm-modal" role="dialog" aria-modal="true" :aria-label="$t('bond100.submit')">
      <header class="bsm-head">
        <h2>{{ $t('bond100.submit') }}</h2>
        <button type="button" class="bsm-close" :aria-label="$t('close')" @click="emit('close')">×</button>
      </header>

      <div class="bsm-body">
        <!-- Success -->
        <div v-if="done" class="bsm-done">
          <div class="bsm-done-check" aria-hidden="true">✓</div>
          <h3>{{ $t('bond100.form.submittedTitle') }}</h3>
          <p>{{ $t('bond100.form.submittedBody') }}</p>
        </div>

        <!-- Form -->
        <form v-else id="bsm-form" class="bsm-form" @submit.prevent="doSubmit">
          <div class="bsm-grid">
            <div class="bsm-field">
              <span>{{ $t('bond100.server') }}</span>
              <SelectMenu
                v-model="subServer"
                block
                :options="serverChoices"
                :placeholder="$t('bond100.form.selectPlaceholder')"
                :aria-label="$t('bond100.server')"
              />
            </div>
            <label class="bsm-field">
              <span>{{ $t('bond100.form.friendCode') }}</span>
              <input v-model="subFriendCode" type="text" maxlength="20" autocomplete="off" required />
            </label>
          </div>
          <p class="bsm-note">{{ $t('bond100.form.assistHint') }}</p>
          <p v-if="formError" class="bsm-error">{{ formError }}</p>
        </form>
      </div>

      <footer class="bsm-footer">
        <template v-if="done">
          <button type="button" class="bsm-btn" @click="emit('close')">{{ $t('bond100.form.back') }}</button>
        </template>
        <template v-else>
          <button type="button" class="bsm-btn ghost" @click="emit('close')">{{ $t('bond100.form.cancel') }}</button>
          <button type="submit" form="bsm-form" class="bsm-btn" :disabled="submitting || !subServer || !subFriendCode.trim()">
            {{ submitting ? $t('bond100.form.sending') : $t('bond100.form.send') }}
          </button>
        </template>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.bsm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.bsm-modal {
  display: flex;
  flex-direction: column;
  width: min(440px, 100%);
  max-height: calc(100vh - 48px);
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 18px;
  background: var(--background-primary);
  color: var(--text-primary);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

.bsm-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 10px 9px 16px;
  border-bottom: 1px solid var(--border-color);
}

.bsm-head h2 {
  margin: 0;
  font-size: 0.98rem;
}

.bsm-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
}

.bsm-close:hover {
  background: var(--card-background);
  color: var(--text-primary);
}

.bsm-body {
  padding: 14px 16px;
}

.bsm-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bsm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
}

.bsm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.bsm-field > span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.bsm-field input {
  width: 100%;
  box-sizing: border-box;
  padding: 5px 8px;
  border: 1px solid var(--input-border);
  border-radius: 8px;
  background: var(--input-background);
  color: var(--text-primary);
  font: inherit;
  font-size: 0.88rem;
}

.bsm-field input:focus {
  outline: none;
  border-color: var(--accent-color);
}

.bsm-note {
  margin: 0;
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--text-secondary);
}

.bsm-error {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-negative);
}

.bsm-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  padding: 10px 4px;
}

.bsm-done-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-positive) 16%, transparent);
  color: var(--color-positive);
  font-size: 1.4rem;
  font-weight: 900;
}

.bsm-done h3 {
  margin: 4px 0 0;
  font-size: 1.05rem;
}

.bsm-done p {
  margin: 0;
  max-width: 38ch;
  font-size: 0.86rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.bsm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 18px;
  border-top: 1px solid var(--border-color);
  background: var(--card-background);
}

.bsm-btn {
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid var(--accent-color);
  background: var(--accent-color);
  color: #fff;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
}

.bsm-btn.ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.bsm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
