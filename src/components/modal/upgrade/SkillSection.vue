<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useStudentInfo } from '@/composables/useStudentInfo';
import { useStudentSkillDisplay } from '@/composables/useStudentSkillDisplay';
import { useTooltip } from '@/composables/useTooltip';
import { clampLevelPair } from '@/consumables/utils/upgradeUtils';
import { $t } from '@/locales';
import { StudentProps } from '@/types/student';
import { SkillType, SKILL_TYPES } from '@/types/upgrade';
import NumberStepper from '@/components/modal/shared/NumberStepper.vue';

const props = defineProps<{
  student: StudentProps,
  skillLevels: Record<string, { current: number; target: number; }>,
  allSkillsMaxed: boolean;
  targetSkillsMaxed: boolean;
}>();

const emit = defineEmits<{
  (e: 'update-skill', type: SkillType, current: number, target: number): void;
  (e: 'toggle-max-skills', checked: boolean): void;
  (e: 'toggle-max-target', checked: boolean): void;
}>();

const studentRef = toRef(() => props.student);

const { bulletTypeColor } = useStudentInfo(studentRef);

const {
  useExtraExSkill,
  hasExtraExSkill,
  isBasicEnhanced,
  isPassiveEnhanced,
  toggleExtraExSkill,
  getSkillIcon,
  getSkillName,
  getMaxLevel,
  getLevelDisplayState,
  getSkillDescription,
  getSkillCostDisplay,
  getSkillIconUrl
} = useStudentSkillDisplay(
  studentRef,
  toRef(() => props.skillLevels),
);

const { activeTooltip, tooltipStyle, tooltipRef, showTooltip, hideTooltip } =
  useTooltip<SkillType>();

const skillStates = computed(() =>
  SKILL_TYPES.map(type => ({
    type,
    current: props.skillLevels[type]?.current ?? 1,
    target:  props.skillLevels[type]?.target  ?? 1,
    max:     getMaxLevel(type),
  }))
);

// Handle skill level changes (using props directly, no internal state)
const updateSkillCurrent = (type: SkillType, value: number) => {
  const target = props.skillLevels[type]?.target;
  const result = clampLevelPair(value, target ?? 1, 1, getMaxLevel(type), false);
  if (result) emit('update-skill', type, result.current, result.target);
};

const updateSkillTarget = (type: SkillType, value: number) => {
  const current = props.skillLevels[type]?.current;
  const result = clampLevelPair(value, current ?? 1, 1, getMaxLevel(type), true);
  if (result) emit('update-skill', type, result.current, result.target);
};
</script>

<template>
  <div class="modal-section-card">
    <h3 class="sr-only">{{ $t('skills') }}</h3>

    <div class="modal-options-rail">
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-all-skills"
          name="max-all-skills"
          :checked="props.allSkillsMaxed"
          @change="(e) => emit('toggle-max-skills', (e.target as HTMLInputElement).checked)"
        />
        <label for="max-all-skills">{{ $t('maxAll') }}</label>
      </div>
      <div class="modal-toggle-item">
        <input
          type="checkbox"
          id="max-target-skills"
          name="max-target-skills"
          :checked="props.targetSkillsMaxed"
          @change="(e) => emit('toggle-max-target', (e.target as HTMLInputElement).checked)"
        />
        <label for="max-target-skills">{{ $t('maxTarget') }}</label>
      </div>
    </div>

    <div class="skill-grid">
      <div
        v-for="state in skillStates"
        :key="state.type"
        class="modal-grid-item"
      >
        <!-- Current Level Control -->
        <div class="level-control">
          <NumberStepper
            :value="state.current" :min="1" :max="state.max"
            :name="`skill-current-${state.type}`"
            :aria-label="`${$t('current')} ${getSkillName(state.type)}`"
            @change="updateSkillCurrent(state.type, $event)"
          />
        </div>

        <!-- Skill Icon -->
        <div class="skill-icon-container">
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
              :src="getSkillIconUrl(getSkillIcon(state.type))"
              :alt="getSkillName(state.type)"
              class="skill-fg"
              @mouseenter="showTooltip($event, state.type)"
              @mouseleave="hideTooltip"
            />
            <!-- Enhanced overlay for Passive skill -->
            <div
              v-if="state.type === 'Passive' && isPassiveEnhanced"
              class="enhanced-overlay"
              :style="{ backgroundColor: bulletTypeColor }"
            >
              +
            </div>
            <!-- Enhanced overlay for Public skill (GearPublic) -->
            <div
              v-if="state.type === 'Public' && isBasicEnhanced"
              class="enhanced-overlay"
              :style="{ backgroundColor: bulletTypeColor }"
            >
              +
            </div>
            <!-- EX skill toggle -->
            <button
              v-if="state.type === 'Ex' && hasExtraExSkill"
              @click="toggleExtraExSkill"
              class="ex-toggle-btn"
              :class="{ active: useExtraExSkill }"
              :title="useExtraExSkill ? $t('skillToggle.normal') : $t('skillToggle.enhanced')"
            >
              {{ useExtraExSkill ? 'II' : 'I' }}
            </button>
          </div>
        </div>

        <!-- Target Level Control -->
        <div class="level-control">
          <NumberStepper
            :value="state.target" :min="1" :max="state.max"
            variant="target"
            :name="`skill-target-${state.type}`"
            :aria-label="`${$t('target')} ${getSkillName(state.type)}`"
            @change="updateSkillTarget(state.type, $event)"
          />
        </div>

        <!-- Skill Name -->
        <div class="skill-name">{{ getSkillName(state.type) }}</div>
      </div>
    </div>

    <!-- Tooltip -->
    <div
      ref="tooltipRef"
      class="modal-tooltip"
      :style="tooltipStyle"
      v-show="activeTooltip !== null"
    >
      <div class="tooltip-content" v-if="activeTooltip">
        <div class="tooltip-name">{{ getSkillName(activeTooltip) }}</div>
        <div class="tooltip-cost" v-if="getSkillCostDisplay(activeTooltip)">
          {{ $t('cost') }}: <span v-html="getSkillCostDisplay(activeTooltip)"></span>
        </div>
        <div class="tooltip-desc" v-html="getSkillDescription(activeTooltip)"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem;
}

.skill-icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.ex-toggle-btn {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--background-primary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  z-index: 3;
}

.ex-toggle-btn:hover {
  background: var(--hover-bg);
  border-color: var(--accent-color);
}

.ex-toggle-btn.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: white;
}

.skill-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
