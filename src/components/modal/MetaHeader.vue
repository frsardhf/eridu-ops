<script setup lang="ts">
import { computed, toRef } from 'vue';
import { $t } from '@/locales';
import { useStudentColors } from '@/composables/useStudentColors';
import { useStudentLevels } from '@/composables/useStudentLevels';
import { useStudentLocalization } from '@/composables/useStudentLocalization';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  characterLevels: { current: number; target: number };
  currentBond: number;
  newBondLevel: number;
}>();

const studentRef = toRef(() => props.student);

const { squadTypeName, bulletTypeName, armorTypeName } = useStudentLocalization(studentRef);
const { squadTypeColor, bulletTypeColor, armorTypeColor, bulletTypeColorLight, armorTypeColorLight } = useStudentColors(studentRef);
const { showLevelArrow } = useStudentLevels(() => props.characterLevels);
const showBondArrow = computed(() => props.currentBond !== props.newBondLevel);
const levelPillClass = computed(() => ({
  maxed50: props.currentBond >= 50 && props.currentBond < 100,
  maxed100: props.currentBond >= 100
}));
</script>

<template>
  <section class="student-meta-header" aria-label="Student Summary">
    <div class="identity-row">
      <h2 class="student-name">{{ student.Name }}</h2>
      <span
        v-if="squadTypeName"
        class="role-chip"
        :style="{ backgroundColor: squadTypeColor }"
      >
        {{ squadTypeName }}
      </span>
    </div>

    <div class="meta-row">
      <div class="meta-chips">
        <div class="level-pill" :class="levelPillClass">
          <div class="bond-inline" :class="{ updating: showBondArrow }">
            <img
              src="https://schaledb.com/images/ui/School_Icon_Schedule_Favor.png"
              alt="Bond"
              class="bond-icon-inline"
            />
            <span class="bond-number-inline">{{ currentBond }}</span>
          </div>
          <div class="level-content">
            <span class="level-label">LEVEL</span>
            <span class="level-number">{{ characterLevels.current }}</span>
            <template v-if="showLevelArrow">
              <span class="level-arrow">→</span>
              <span class="level-number target">{{ characterLevels.target }}</span>
            </template>
          </div>
        </div>

        <div v-if="bulletTypeName || armorTypeName" class="combat-type-row">
          <div v-if="bulletTypeName" class="type-pill-divided">
            <span class="pill-label" :style="{ backgroundColor: bulletTypeColorLight }">
              {{ $t('atk') }}
            </span>
            <span class="pill-value" :style="{ backgroundColor: bulletTypeColor }">
              {{ bulletTypeName }}
            </span>
          </div>

          <div v-if="armorTypeName" class="type-pill-divided">
            <span class="pill-label" :style="{ backgroundColor: armorTypeColorLight }">
              {{ $t('def') }}
            </span>
            <span class="pill-value" :style="{ backgroundColor: armorTypeColor }">
              {{ armorTypeName }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.student-meta-header {
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.identity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.student-name {
  margin: 0;
  font-size: 1.75rem;
  line-height: 1;
  font-weight: 700;
  color: var(--text-primary);
}

.role-chip {
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
  font-style: italic;
  font-weight: 700;
  color: white;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.meta-row {
  display: block;
}

.meta-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}

.level-pill {
  display: flex;
  align-items: center;
  min-width: 170px;
  background: var(--background-primary);
  border: 1px solid #4e7eff;
  border-radius: 999px;
} 

.level-pill.maxed {
  background: var(--background-primary);
  border: 1px solid #4e7eff;
}

.level-pill.maxed50 {
  background: linear-gradient(135deg, rgba(248, 203, 39, 0.24), rgba(248, 255, 51, 0.22));
  border-color: rgba(255, 201, 51, 0.65);
}

.level-pill.maxed100 {
  background: linear-gradient(135deg, rgba(255, 105, 180, 0.18), rgba(235, 51, 255, 0.18));
  border-color: rgba(255, 105, 180, 0.55);
}

.bond-inline {
  position: relative;
  width: 34px;
  height: 34px;
  margin-left: 2px;
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
  font-weight: 700;
  font-size: 0.74rem;
  color: white;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.82);
}

.level-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.level-label {
  font-style: italic;
  font-weight: 700;
  font-size: 0.72rem;
  color: var(--text-secondary);
  letter-spacing: 0.45px;
}

.level-number {
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--text-primary);
}

.level-arrow {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.level-number.target {
  color: var(--accent-color);
}

.type-pill-divided {
  display: flex;
  align-items: stretch;
  border-radius: 999px;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.combat-type-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.pill-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 9px;
  color: white;
  min-width: 36px;
}

.pill-value {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  color: white;
}

@media (max-width: 1024px) {
  .student-name {
    font-size: 1.45rem;
  }
}

@media (max-width: 768px) {
  .meta-row {
    display: block;
  }

  .combat-type-row {
    width: fit-content;
    max-width: 100%;
  }
}
</style>
