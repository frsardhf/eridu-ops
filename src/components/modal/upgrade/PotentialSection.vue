<script setup lang="ts">
import { computed } from 'vue';
import { PotentialType } from '@/types/upgrade';
import { $t } from '@/locales';
import { clampLevelPair, MAX_POTENTIAL_LEVEL } from '@/consumables/utils/upgradeUtils';
import NumberStepper from '@/components/modal/shared/NumberStepper.vue';

const props = defineProps<{
  potentialLevels: Record<PotentialType, { current: number; target: number }>;
  allPotentialsMaxed: boolean;
  targetPotentialsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-potential', type: PotentialType, current: number, target: number): void;
  (e: 'toggle-max-potentials', checked: boolean): void;
  (e: 'toggle-max-target-potentials', checked: boolean): void;
}>();

// Static icon mapping for potential types
const POTENTIAL_ICONS: Record<PotentialType, string> = {
  attack: 'item_icon_workbook_potentialattack',
  maxhp: 'item_icon_workbook_potentialmaxhp',
  healpower: 'item_icon_workbook_potentialhealpower'
};

const potentialStates = computed(() =>
  (['attack', 'maxhp', 'healpower'] as PotentialType[]).map(type => ({
    type,
    current: props.potentialLevels[type]?.current ?? 0,
    target:  props.potentialLevels[type]?.target  ?? 0,
    icon:    POTENTIAL_ICONS[type],
    name:    getPotentialName(type),
  }))
);

function getPotentialName(potType: PotentialType): string {
  const names: Record<PotentialType, string> = {
    attack: $t('attack'),
    maxhp: $t('maxHp'),
    healpower: $t('healPower')
  };
  return names[potType];
}

// Handle potential type changes (using props directly, no internal state)
const updatePotentialCurrent = (type: PotentialType, value: number) => {
  const target = props.potentialLevels[type]?.target;
  const result = clampLevelPair(value, target ?? 0, 0, MAX_POTENTIAL_LEVEL, false);
  if (result) emit('update-potential', type, result.current, result.target);
};

const updatePotentialTarget = (type: PotentialType, value: number) => {
  const current = props.potentialLevels[type]?.current;
  const result = clampLevelPair(value, current ?? 0, 0, MAX_POTENTIAL_LEVEL, true);
  if (result) emit('update-potential', type, result.current, result.target);
};
</script>

<template>
  <div class="modal-section-card">
    <h3 class="sr-only">{{ $t('talent') }}</h3>

    <div class="modal-options-rail">
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-all-potentials"
          name="max-all-potentials"
          :checked="props.allPotentialsMaxed"
          @change="(e) => emit('toggle-max-potentials', (e.target as HTMLInputElement).checked)"
        />
        <label for="max-all-potentials">{{ $t('maxAll') }}</label>
      </div>
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-target-potentials"
          name="max-target-potentials"
          :checked="props.targetPotentialsMaxed"
          @change="(e) => emit('toggle-max-target-potentials', (e.target as HTMLInputElement).checked)"
        />
        <label for="max-target-potentials">{{ $t('maxTarget') }}</label>
      </div>
    </div>

    <div class="potential-grid">
      <div
        v-for="state in potentialStates"
        :key="state.type"
        class="modal-grid-item"
      >
        <!-- Current Level Control -->
        <div class="level-control">
          <NumberStepper
            :value="state.current" :min="0" :max="MAX_POTENTIAL_LEVEL"
            :name="`potential-current-${state.type}`"
            :aria-label="`${$t('current')} ${state.name}`"
            @change="updatePotentialCurrent(state.type, $event)"
          />
        </div>

        <!-- Potential Icon -->
        <div class="potential-icon-container">
          <div class="modal-item-icon">
            <img
              :src="`https://schaledb.com/images/item/icon/${state.icon}.webp`"
              :alt="state.name"
              class="potential-image"
            />
          </div>
        </div>

        <!-- Target Level Control -->
        <div class="level-control">
          <NumberStepper
            :value="state.target" :min="0" :max="MAX_POTENTIAL_LEVEL"
            variant="target"
            :name="`potential-target-${state.type}`"
            :aria-label="`${$t('target')} ${state.name}`"
            @change="updatePotentialTarget(state.type, $event)"
          />
        </div>

        <!-- Potential Name -->
        <div class="potential-name">{{ state.name }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.potential-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.potential-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.potential-image {
  object-fit: contain;
}

.potential-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
}

@media (max-width: 500px) {
  .potential-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 350px) {
  .potential-grid {
    grid-template-columns: 1fr;
  }
}
</style>
