<script setup lang="ts">
import { toRef } from 'vue';
import { useStudentColors } from '@/composables/student/useStudentColors';
import { useStudentSkillDisplay } from '@/composables/student/useStudentSkillDisplay';
import { useStudentSkillEnhancements } from '@/composables/student/useStudentSkillEnhancements';
import { useTooltip } from '@/composables/student/useTooltip';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';
import { SkillType } from '@/types/upgrade';

const props = defineProps<{
  student: StudentProps;
  skillLevels: Record<string, { current: number; target: number }>;
}>();

const studentRef = toRef(() => props.student);
const { isPassiveEnhanced, isBasicEnhanced } = useStudentSkillEnhancements(studentRef);
const { bulletTypeColor } = useStudentColors(studentRef);
const {
  useExtraExSkill,
  hasExtraExSkill,
  toggleExtraExSkill,
  getSkillIcon,
  getSkillName,
  getLevelDisplay,
  getSkillDescription,
  getSkillCostDisplay,
  getSkillIconUrl
} = useStudentSkillDisplay(
  studentRef,
  toRef(() => props.skillLevels),
  isPassiveEnhanced,
  isBasicEnhanced
);

const skillOrder: SkillType[] = ['Ex', 'Public', 'Passive', 'ExtraPassive'];

// Tooltip state
const { activeTooltip, tooltipStyle, showTooltip, hideTooltip } = useTooltip<SkillType>(250, 120);
</script>

<template>
  <div class="modal-section-card">
    <div class="skills-grid">
      <div v-for="skillType in skillOrder" :key="skillType" class="skill-card">
        <div class="skill-card-control">
          <button
            v-if="skillType === 'Ex' && hasExtraExSkill"
            class="ex-toggle-btn"
            :class="{ active: useExtraExSkill }"
            :style="{ borderColor: bulletTypeColor, color: useExtraExSkill ?
              'white' : bulletTypeColor, backgroundColor: useExtraExSkill ?
              bulletTypeColor : 'transparent' }"
            @click="toggleExtraExSkill"
            type="button"
          >
            EX+
          </button>
          <span v-else class="ex-toggle-slot" aria-hidden="true"></span>
        </div>

        <!-- Skill Icon -->
        <div class="skill-icon-wrapper">
          <svg
            xml:space="preserve"
            viewBox="0 0 37.6 37.6"
            version="1.1"
            height="64"
            width="64"
            xmlns="http://www.w3.org/2000/svg"
            class="skill-bg"
          >
            <path
              :style="{ fill: bulletTypeColor }"
              d="m18.8 0c-0.96 0-1.92 0.161-2.47 0.481l-13.1 7.98c-1.13 0.653-1.81 1.8-1.81 3.03v14.6c0 1.23 0.684 2.37 1.81 3.03l13.1 7.98c1.11 0.642 3.85 0.665 4.95 0l13.1-7.98c1.11-0.677 1.81-1.8 1.81-3.03v-14.6c0-1.23-0.699-2.35-1.81-3.03l-13.1-7.98c-0.554-0.321-1.51-0.481-2.47-0.481z"
            />
          </svg>
          <img
            v-if="getSkillIcon(skillType)"
            :src="getSkillIconUrl(getSkillIcon(skillType))"
            :alt="getSkillName(skillType)"
            class="skill-fg"
            @mouseenter="showTooltip($event, skillType)"
            @mouseleave="hideTooltip"
          />
          <!-- Enhanced overlay for Passive -->
          <div
            v-if="skillType === 'Passive' && isPassiveEnhanced"
            class="enhanced-overlay"
            :style="{ backgroundColor: bulletTypeColor }"
          >
            +
          </div>
          <!-- Enhanced overlay for Public (GearPublic) -->
          <div
            v-if="skillType === 'Public' && isBasicEnhanced"
            class="enhanced-overlay"
            :style="{ backgroundColor: bulletTypeColor }"
          >
            +
          </div>
          <!-- Tooltip -->
          <div
            class="skill-tooltip"
            :style="tooltipStyle"
            v-show="activeTooltip === skillType"
          >
            <div class="tooltip-content">
              <div class="tooltip-name">{{ getSkillName(skillType) }}</div>
              <div class="tooltip-cost" v-if="getSkillCostDisplay(skillType)">
                {{ $t('cost') }}: <span v-html="getSkillCostDisplay(skillType)"></span>
              </div>
              <div class="tooltip-desc" v-html="getSkillDescription(skillType)"></div>
            </div>
          </div>
        </div>

        <!-- Skill Level -->
        <div class="skill-level">
          <template v-if="getLevelDisplay(skillType).isMax">
            <span class="max-text">{{ $t('max') }}</span>
          </template>
          <template v-else-if="getLevelDisplay(skillType).isSame">
            <span class="level-text">Lv. {{ getLevelDisplay(skillType).current }}</span>
          </template>
          <template v-else>
            <span class="level-text">Lv. {{ getLevelDisplay(skillType).current }}</span>
            <span class="level-arrow">→</span>
            <span class="level-target">{{ getLevelDisplay(skillType).target }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skills-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.skill-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 8px;
  background: var(--background-primary);
}

.skill-card-control {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 40px;
  min-height: 18px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 4;
}

.ex-toggle-slot {
  width: 40px;
  height: 18px;
  visibility: hidden;
}

img, svg {
  vertical-align: middle;
}

/* Override enhanced-overlay size for info tab */
.enhanced-overlay {
  width: 18px;
  height: 18px;
  font-size: 16px;
}

/* Skill Level */
.skill-level {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
}

.level-text {
  color: var(--text-secondary);
  font-weight: 500;
}

.level-arrow {
  color: var(--text-secondary);
  font-size: 0.75rem;
}

.level-target {
  color: var(--accent-color);
  font-weight: 600;
}

.max-text {
  background: linear-gradient(135deg, rgb(255, 201, 51), hsl(192, 100%, 60%));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: bold;
  font-size: 0.85rem;
}

.ex-toggle-btn {
  font-size: 0.7rem;
  font-weight: bold;
  min-width: 40px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1.5px solid;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  line-height: 1.4;
  letter-spacing: 0.5px;
}

@media (max-width: 480px) {
  .skills-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
