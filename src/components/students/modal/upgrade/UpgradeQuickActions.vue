<script setup lang="ts">
import { $t } from '@/locales';

const props = defineProps<{
  allSkillsMaxed: boolean;
  targetSkillsMaxed: boolean;
  allPotentialsMaxed: boolean;
  targetPotentialsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-max-skills', checked: boolean): void;
  (e: 'toggle-max-target-skills', checked: boolean): void;
  (e: 'toggle-max-potentials', checked: boolean): void;
  (e: 'toggle-max-target-potentials', checked: boolean): void;
}>();
</script>

<template>
  <div class="modal-section-card upgrade-quick-actions">
    <div class="upgrade-quick-action-group">
      <span class="upgrade-quick-action-label">{{ $t('skills') }}</span>
      <div class="upgrade-quick-action-controls">
        <div class="modal-toggle-item">
          <input
            id="max-all-skills"
            type="checkbox"
            name="max-all-skills"
            :checked="props.allSkillsMaxed"
            @change="(e) => emit('toggle-max-skills', (e.target as HTMLInputElement).checked)"
          />
          <label for="max-all-skills">{{ $t('maxAll') }}</label>
        </div>

        <div class="modal-toggle-item">
          <input
            id="max-target-skills"
            type="checkbox"
            name="max-target-skills"
            :checked="props.targetSkillsMaxed"
            :disabled="props.allSkillsMaxed"
            @change="
              (e) => emit('toggle-max-target-skills', (e.target as HTMLInputElement).checked)
            "
          />
          <label for="max-target-skills">{{ $t('maxTarget') }}</label>
        </div>
      </div>
    </div>

    <div class="upgrade-quick-action-group">
      <span class="upgrade-quick-action-label">{{ $t('talent') }}</span>
      <div class="upgrade-quick-action-controls">
        <div class="modal-toggle-item">
          <input
            id="max-all-potentials"
            type="checkbox"
            name="max-all-potentials"
            :checked="props.allPotentialsMaxed"
            @change="(e) => emit('toggle-max-potentials', (e.target as HTMLInputElement).checked)"
          />
          <label for="max-all-potentials">{{ $t('maxAll') }}</label>
        </div>

        <div class="modal-toggle-item">
          <input
            id="max-target-potentials"
            type="checkbox"
            name="max-target-potentials"
            :checked="props.targetPotentialsMaxed"
            :disabled="props.allPotentialsMaxed"
            @change="
              (e) => emit('toggle-max-target-potentials', (e.target as HTMLInputElement).checked)
            "
          />
          <label for="max-target-potentials">{{ $t('maxTarget') }}</label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upgrade-quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.upgrade-quick-action-group {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.upgrade-quick-action-label {
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upgrade-quick-action-controls {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}

@media (max-width: 600px) {
  .upgrade-quick-actions {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .upgrade-quick-action-group {
    grid-template-columns: minmax(72px, 1fr) auto;
  }

  .upgrade-quick-action-controls {
    justify-content: flex-end;
  }
}
</style>
