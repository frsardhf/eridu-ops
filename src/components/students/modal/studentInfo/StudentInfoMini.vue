<script setup lang="ts">
import { computed } from 'vue';
import { localizationData } from '../../../../consumables/stores/localizationStore';
import { getBulletTypeColor, getArmorTypeColor, getSquadTypeColor, colorWithOpacity } from '../../../../consumables/utils/colorUtils';
import { $t } from '../../../../locales';

const props = defineProps<{
  student: Record<string, any> | null;
  characterLevels: { current: number; target: number };
  currentBond: number;
  newBondLevel: number;
}>();

// Level computations
const isMaxLevel = computed(() => props.characterLevels.current === 90 && props.characterLevels.target === 90);
const showLevelArrow = computed(() => props.characterLevels.current !== props.characterLevels.target);

// Localized names from SchaleDB
const squadTypeName = computed(() => {
  if (!props.student?.SquadType || !localizationData.value?.SquadType) return '';
  return localizationData.value.SquadType[props.student.SquadType] || props.student.SquadType;
});

const bulletTypeName = computed(() => {
  if (!props.student?.BulletType || !localizationData.value?.BulletType) return '';
  return localizationData.value.BulletType[props.student.BulletType] || props.student.BulletType;
});

const armorTypeName = computed(() => {
  if (!props.student?.ArmorType || !localizationData.value?.ArmorType) return '';
  return localizationData.value.ArmorType[props.student.ArmorType] || props.student.ArmorType;
});

const schoolName = computed(() => {
  if (!props.student?.School || !localizationData.value?.School) return '';
  return localizationData.value.School[props.student.School] || props.student.School;
});

const clubName = computed(() => {
  if (!props.student?.Club || !localizationData.value?.Club) return '';
  return localizationData.value.Club[props.student.Club] || props.student.Club;
});

// Colors
const squadTypeColor = computed(() => getSquadTypeColor(props.student?.SquadType));
const bulletTypeColor = computed(() => getBulletTypeColor(props.student?.BulletType));
const armorTypeColor = computed(() => getArmorTypeColor(props.student?.ArmorType));

// 80% opacity variants for pill labels
const bulletTypeColorLight = computed(() => colorWithOpacity(bulletTypeColor.value, 0.8));
const armorTypeColorLight = computed(() => colorWithOpacity(armorTypeColor.value, 0.8));
</script>

<template>
  <div class="info-mini">
    <!-- Row 1: Combined Level + Bond Pill -->
    <div class="info-row level-row">
      <div class="level-pill" :class="{ 'maxed': isMaxLevel }">
        <!-- Bond inside level pill (left side) -->
        <div class="bond-inline">
          <img
            src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
            alt="Bond"
            class="bond-icon-inline"
          />
          <span class="bond-number-inline">{{ currentBond }}</span>
        </div>

        <!-- Level display wrapper for centering -->
        <div class="level-content">
          <span class="level-label">LEVEL</span>
          <span class="level-number">{{ characterLevels.current }}</span>
          <template v-if="showLevelArrow">
            <span class="arrow">→</span>
            <span class="level-number target">{{ characterLevels.target }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Row 2: Type Badges (3 vertical rows) -->
    <div class="type-badges-section" v-if="student">
      <!-- SquadType badge -->
      <div class="type-row" v-if="squadTypeName">
        <div
          class="type-badge squad-badge"
          :style="{ backgroundColor: squadTypeColor }"
        >
          {{ squadTypeName }}
        </div>
      </div>

      <!-- ATK badge with divider -->
      <div class="type-row" v-if="bulletTypeName">
        <div class="type-pill-divided">
          <span class="pill-label" :style="{ backgroundColor: bulletTypeColorLight }">{{ $t('atk') }}</span>
          <span class="pill-value" :style="{ backgroundColor: bulletTypeColor }">{{ bulletTypeName }}</span>
        </div>
      </div>

      <!-- DEF badge with divider -->
      <div class="type-row" v-if="armorTypeName">
        <div class="type-pill-divided">
          <span class="pill-label" :style="{ backgroundColor: armorTypeColorLight }">{{ $t('def') }}</span>
          <span class="pill-value" :style="{ backgroundColor: armorTypeColor }">{{ armorTypeName }}</span>
        </div>
      </div>
    </div>

    <!-- Row 3: School & Club (2 vertical rows) -->
    <div class="school-club-section" v-if="student && (schoolName || clubName)">
      <div class="detail-pill" v-if="schoolName">
        <span class="detail-label">{{ $t('school') }}</span>
        <span class="detail-value">{{ schoolName }}</span>
      </div>
      <div class="detail-pill" v-if="clubName">
        <span class="detail-label">{{ $t('club') }}</span>
        <span class="detail-value">{{ clubName }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-mini {
  align-self: center;
  background: var(--card-background);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.arrow {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
  margin: 0 2px;
}

/* ===== Level Pill with Bond ===== */
.level-row {
  justify-content: center;
}

.level-pill {
  display: flex;
  align-items: center;
  background: var(--header-gradient-start);
  border: 2px solid #4e7eff;
  border-radius: 20px;
  padding: 4px 8px 4px 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  width: 170px;
}

.level-pill.maxed {
  background: linear-gradient(135deg, rgba(255, 201, 51, 0.3), rgba(51, 200, 255, 0.3));
  border-color: rgba(255, 201, 51, 0.6);
}

/* Bond inline inside level pill - fixed on left (~20% width) */
.bond-inline {
  position: relative;
  width: 38px;
  height: 38px;
  flex-shrink: 0;
}

.bond-icon-inline {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bond-number-inline {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  font-weight: bold;
  font-size: 0.75em;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.level-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.level-label {
  font-style: italic;
  font-weight: 600;
  font-size: 0.75em;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.level-number {
  font-weight: bold;
  font-size: 1em;
  color: var(--text-primary);
}

.level-number.target {
  color: var(--accent-color, #4a8af4);
}

/* ===== Type Badges Section (3 vertical rows) ===== */
.type-badges-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.type-row {
  display: flex;
  justify-content: center;
}

.type-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 0.8em;
  font-weight: 600;
  white-space: nowrap;
  width: 170px;
  text-align: center;
}

.squad-badge {
  font-style: italic;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

/* ATK/DEF Divided Pill */
.type-pill-divided {
  display: flex;
  align-items: stretch;
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.8em;
  font-weight: 600;
  width: 170px;
}

.pill-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  color: white;
  font-weight: 600;
  min-width: 40px;
}

.pill-value {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  color: white;
  font-weight: 700;
  flex: 1;
  text-align: center;
  flex-wrap: wrap;
}

/* ===== School & Club Section (2 vertical rows) ===== */
.school-club-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.detail-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 4px 12px;
  width: 170px;
  text-align: center;
  flex-wrap: wrap;
}

.detail-label {
  font-size: 0.75em;
  color: var(--text-secondary);
  font-weight: 500;
}

.detail-value {
  font-size: 0.85em;
  color: var(--text-primary);
  font-weight: 600;
}

/* ===== School Year Row ===== */
.school-year-row {
  justify-content: center;
}

.school-year {
  font-size: 0.8em;
  font-style: italic;
  color: var(--text-secondary);
}

@media (max-width: 480px) {
  .info-mini {
    padding: 12px;
    gap: 10px;
  }
}
</style>
