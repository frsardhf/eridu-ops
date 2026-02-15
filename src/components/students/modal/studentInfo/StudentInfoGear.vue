<script setup lang="ts">
import { toRef } from 'vue';
import { EquipmentType } from '../../../../types/gear';
import { $t } from '../../../../locales';
import { useStudentGearDisplay } from '../../../../composables/student/useStudentGearDisplay';

const props = defineProps<{
  student: Record<string, any> | null;
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
  currentGrade,
  targetGrade,
  isMaxGrade,
  isWeaponLocked,
  blueStars,
  getWeaponIconUrl,
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
  <div class="info-gear-wrapper">
    <!-- Section 1: Weapon -->
    <div class="info-gear-weapon">
      <div class="card-header">
        <h3 class="section-title">{{ $t('exclusiveWeapon') }}</h3>
        <div class="grade-indicators" v-if="!isMaxGrade">
          <div class="grade-pill" :class="currentGrade <= 5 ? 'gold-grade' : 'blue-grade'">
            {{ currentGrade <= 5 ? currentGrade : (currentGrade - 5) }}★
          </div>
          <div class="grade-arrow-text">→</div>
          <div class="grade-pill" :class="targetGrade <= 5 ? 'gold-grade' : 'blue-grade'">
            {{ targetGrade <= 5 ? targetGrade : (targetGrade - 5) }}★
          </div>
        </div>
        <div class="grade-max-pill" v-else>{{ $t('maxGrade') }}</div>
      </div>

      <div class="weapon-showcase">
        <div class="weapon-preview" :class="{ 'locked': isWeaponLocked }">
          <img
            :src="getWeaponIconUrl()"
            :alt="$t('exclusiveWeapon')"
            class="weapon-icon"
            v-if="student?.WeaponImg"
          />
          <div class="weapon-icon placeholder" v-else>?</div>
          <div class="weapon-lock-overlay" v-if="isWeaponLocked">
            <svg class="lock-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
              <path fill="currentColor" d="M144 144v48H304V144c0-44.2-35.8-80-80-80s-80 35.8-80 80zM80 192V144C80 64.5 144.5 0 224 0s144 64.5 144 144v48h16c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V256c0-35.3 28.7-64 64-64H80z"/>
            </svg>
          </div>
        </div>
        <!-- Blue stars overlay (top-right, only when weapon is unlocked) -->
        <div class="stars-overlay" v-if="!isWeaponLocked">
          <span
            v-for="star in blueStars"
            :key="'star-' + star.position"
            class="star blue-star"
            :class="{ 'active': star.active }"
          >
            <svg class="svg-inline--fa fa-star" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512">
              <path fill="currentColor" d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
            </svg>
          </span>
        </div>
      </div>
    </div>

    <!-- Section 2: Equipment -->
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

        <!-- Exclusive Gear -->
        <div class="equipment-card" :class="{ 'placeholder-card': !hasExclusiveGear }">
          <div class="equipment-icon" :class="{ 'placeholder-icon': !hasExclusiveGear }">
            <div class="equipment-type-badge" :class="{ 'placeholder-badge': !hasExclusiveGear }">
              {{ $t('exclusiveGear') }}
            </div>

            <!-- Show gear image if student has gear -->
            <template v-if="hasExclusiveGear">
              <img
                :src="getExclusiveGearIconUrl()"
                :alt="student?.Gear?.Name || $t('exclusiveGear')"
                class="equipment-image exclusive-gear-image"
                loading="lazy"
              />
            </template>

            <!-- Placeholder if no gear data -->
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
  </div>
</template>

<style scoped>
.info-gear-wrapper {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

/* ===== Section 1: Weapon ===== */
.info-gear-weapon {
  background: var(--card-background);
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  padding: 12px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 1.1em;
  font-weight: bold;
  color: var(--text-primary);
  margin: 0;
}

.grade-indicators {
  display: flex;
  align-items: center;
  gap: 6px;
}

.grade-pill {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
}

.grade-pill.gold-grade {
  background: rgba(255, 201, 51, 0.2);
  color: rgb(255, 201, 51);
}

.grade-pill.blue-grade {
  background: rgba(51, 200, 255, 0.2);
  color: hsl(192, 100%, 60%);
}

.grade-arrow-text {
  color: var(--text-secondary);
  font-size: 0.9em;
}

.grade-max-pill {
  background: linear-gradient(135deg, rgba(255, 201, 51, 0.3), rgba(51, 200, 255, 0.3));
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: bold;
  letter-spacing: 1px;
}

.weapon-showcase {
  display: flex;
  justify-content: center;
  background: var(--background-primary);
  position: relative;
  max-height: 160px;
  overflow: hidden;
}

.weapon-preview {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.weapon-preview.locked .weapon-icon {
  filter: grayscale(100%) brightness(50%);
  opacity: 0.8;
}

.weapon-lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.2);
  pointer-events: none;
}

.lock-icon {
  width: 40px;
  height: 40px;
  color: rgba(255, 255, 255, 0.8);
  filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.5));
}

.weapon-icon {
  width: 100%;
  height: auto;
  max-height: 160px;
  object-fit: contain;
}

.weapon-icon.placeholder {
  background: rgba(0, 0, 0, 0.3);
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 1.5em;
  border-radius: 8px;
}

/* Stars overlay (top-right of weapon) */
.stars-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 3px;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 6px;
  border-radius: 8px;
}

.star {
  width: 18px;
  height: 18px;
  opacity: 0.3;
}

.star svg {
  width: 100%;
  height: 100%;
}

.star.active {
  opacity: 1;
}

.star.blue-star {
  color: hsl(192, 100%, 60%);
  filter: drop-shadow(0 0 2px rgba(51, 200, 255, 0.5));
}

/* ===== Section 2: Equipment ===== */
.info-gear-equipment {
  background: var(--card-background);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

/* Exclusive Gear Placeholder */
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
  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .grade-indicators {
    align-self: center;
  }

  .grade-max-pill {
    align-self: center;
  }

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
