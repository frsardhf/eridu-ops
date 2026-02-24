<script setup lang="ts">
import { toRef } from 'vue';
import { useStudentGearDisplay } from '@/composables/student/useStudentGearDisplay';
import { $t } from '@/locales';
import { EquipmentType } from '@/types/gear';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  gradeLevels: { current?: number; target?: number };
  equipmentLevels: Record<string, { current: number; target: number }>;
  exclusiveGearLevel: { current?: number; target?: number };
  hasExclusiveGear: boolean;
}>();

const equipmentTypes: Record<string, () => string> = {
  Hat: () => $t('equipmentTypes.Hat'),
  Gloves: () => $t('equipmentTypes.Gloves'),
  Shoes: () => $t('equipmentTypes.Shoes'),
  Bag: () => $t('equipmentTypes.Bag'),
  Badge: () => $t('equipmentTypes.Badge'),
  Hairpin: () => $t('equipmentTypes.Hairpin'),
  Charm: () => $t('equipmentTypes.Charm'),
  Watch: () => $t('equipmentTypes.Watch'),
  Necklace: () => $t('equipmentTypes.Necklace')
};

function getEquipmentTypeName(type: string): string {
  return equipmentTypes[type]?.() || type;
}

const {
  getEquipmentIconUrl,
  getEquipmentDisplay,
  getExclusiveGearIconUrl,
  getExclusiveGearDisplay
} = useStudentGearDisplay(
  toRef(() => props.student),
  toRef(() => props.gradeLevels),
  toRef(() => props.equipmentLevels),
  toRef(() => props.exclusiveGearLevel)
);
</script>

<template>
  <div class="info-gear-equipment">
    <div class="equipment-row">
      <div
        v-for="type in (student?.Equipment as EquipmentType[] || [])"
        :key="type"
        class="equipment-card"
      >
        <div class="equipment-icon">
          <div class="equipment-type-badge">{{ getEquipmentTypeName(type) }}</div>
          <img
            :src="getEquipmentIconUrl(type, getEquipmentDisplay(type).current)"
            :alt="`${getEquipmentTypeName(type)} ${$t('tier')}${getEquipmentDisplay(type).current}`"
            class="equipment-image"
            loading="lazy"
          />
          <div class="tier-indicator">
            {{ $t('tier') }}{{ getEquipmentDisplay(type).current }}
            <span class="tier-target" v-if="!getEquipmentDisplay(type).isSame">
              → {{ $t('tier') }}{{ getEquipmentDisplay(type).target }}
            </span>
          </div>
        </div>
      </div>

      <div class="equipment-card" :class="{ 'placeholder-card': !hasExclusiveGear }">
        <div class="equipment-icon" :class="{ 'placeholder-icon': !hasExclusiveGear }">
          <div class="equipment-type-badge" :class="{ 'placeholder-badge': !hasExclusiveGear }">
            {{ $t('exclusiveGear') }}
          </div>

          <template v-if="hasExclusiveGear">
            <img
              :src="getExclusiveGearIconUrl()"
              :alt="student?.Gear?.Name || $t('exclusiveGear')"
              class="equipment-image exclusive-gear-image"
              loading="lazy"
            />
          </template>

          <template v-else>
            <svg class="lock-icon-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
              <path fill="currentColor" d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
            </svg>
          </template>

          <div class="tier-indicator" :class="{ 'placeholder-tier': !hasExclusiveGear }">
            <template v-if="!hasExclusiveGear">
              {{ $t('comingSoon') }}
            </template>
            <template v-else-if="getExclusiveGearDisplay().isLocked">
              {{ $t('locked') }}
            </template>
            <template v-else>
              {{ $t('tier') }}{{ getExclusiveGearDisplay().current }}
              <span class="tier-target" v-if="!getExclusiveGearDisplay().isSame">
                → {{ $t('tier') }}{{ getExclusiveGearDisplay().target }}
              </span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-gear-equipment {
  background: var(--card-background);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  padding: 0.75rem;
}

.equipment-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.equipment-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 8px;
  background: var(--background-primary);
  position: relative;
}

.equipment-icon {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--card-background);
  border-radius: 12px;
  position: relative;
  margin: 0.5rem 0;
}

.equipment-type-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--accent-color, #4a8af4);
  color: white;
  padding: 0.2rem 0.5rem;
  width: max-content;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

.equipment-image {
  max-width: 85%;
  max-height: 85%;
  object-fit: cover;
}

.exclusive-gear-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.tier-indicator {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--background-primary);
  color: var(--text-primary);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.tier-target {
  color: var(--accent-color, #4a8af4);
  font-weight: 700;
}

.placeholder-card {
  border: 2px dashed var(--border-color);
  background: transparent;
  opacity: 0.6;
}

.placeholder-icon {
  background: transparent;
}

.placeholder-badge {
  background-color: var(--text-secondary);
}

.lock-icon-small {
  width: 28px;
  height: 28px;
  color: var(--text-secondary);
  opacity: 0.5;
}

.placeholder-tier {
  color: var(--text-secondary);
  font-style: italic;
  font-weight: 500;
}

@media (max-width: 768px) {
  .equipment-icon {
    width: 80px;
    height: 80px;
  }

  .equipment-type-badge,
  .tier-indicator {
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
  }
}

@media (max-width: 480px) {
  .equipment-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .equipment-icon {
    width: 70px;
    height: 70px;
  }

  .equipment-type-badge {
    font-size: 0.6rem;
    padding: 0.15rem 0.35rem;
  }
}
</style>
