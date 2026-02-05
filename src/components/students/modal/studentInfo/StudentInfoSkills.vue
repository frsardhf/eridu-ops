<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { SkillType } from '../../../../types/upgrade';
import { $t } from '../../../../locales';
import { getStudentData } from '../../../../consumables/stores/studentStore';
import { currentLanguage } from '../../../../consumables/stores/localizationStore';
import {
  formatSkillDescription,
  formatSkillCost,
  calculateTooltipPosition,
  fetchLocalizationData
} from '../../../../consumables/utils/upgradeUtils';
import { getBulletTypeColor } from '../../../../consumables/utils/colorUtils';

const props = defineProps<{
  student: Record<string, any> | null;
  skillLevels: Record<string, { current: number; target: number }>;
}>();

const studentData = computed(() => {
  if (!props.student?.Id) return null;
  return getStudentData(props.student.Id);
});

const gradeLevel = computed(() => {
  return studentData.value?.gradeLevels?.current || 0;
});

const isPassiveEnhanced = computed(() => {
  return gradeLevel.value >= 7;
});

const skillOrder: SkillType[] = ['Ex', 'Public', 'Passive', 'ExtraPassive'];

const skillLabels: Record<SkillType, string> = {
  Ex: 'EX',
  Public: 'Basic',
  Passive: 'Passive',
  ExtraPassive: 'Sub'
};

// Localization cache for buff name resolution
const localizationCache = ref<Record<string, any> | null>(null);

onMounted(() => {
  fetchLocalizationData(currentLanguage.value).then(data => {
    localizationCache.value = data;
  });
});

watch(currentLanguage, (newLanguage) => {
  localizationCache.value = null;
  fetchLocalizationData(newLanguage).then(data => {
    localizationCache.value = data;
  });
});

// Tooltip state
const activeTooltip = ref<SkillType | null>(null);
const tooltipStyle = ref({ top: '0px', left: '0px' });

function showTooltip(event: MouseEvent, skillType: SkillType) {
  tooltipStyle.value = calculateTooltipPosition(event, 250, 120);
  activeTooltip.value = skillType;
}

function hideTooltip() {
  activeTooltip.value = null;
}

function getSkillIconUrl(iconName: string): string {
  return `https://schaledb.com/images/skill/${iconName}.webp`;
}

function getSkillIcon(skillType: SkillType): string {
  return props.student?.Skills?.[skillType]?.Icon || '';
}

function getSkillName(skillType: SkillType): string {
  return props.student?.Skills?.[skillType]?.Name || skillLabels[skillType];
}

function getMaxLevel(skillType: SkillType): number {
  return props.student?.Skills?.[skillType]?.Parameters?.[0]?.length || (skillType === 'Ex' ? 5 : 10);
}

function getLevelDisplay(skillType: SkillType): { current: number; target: number; isMax: boolean; isSame: boolean } {
  const current = props.skillLevels[skillType]?.current || 1;
  const target = props.skillLevels[skillType]?.target || 1;
  const maxLevel = getMaxLevel(skillType);
  return {
    current,
    target,
    isMax: current === maxLevel && target === maxLevel,
    isSame: current === target
  };
}

// Get the appropriate skill data (handles WeaponPassive for enhanced Passive)
function getSkillData(skillType: SkillType) {
  if (skillType === 'Passive' && isPassiveEnhanced.value && props.student?.Skills?.WeaponPassive) {
    return props.student.Skills.WeaponPassive;
  }
  return props.student?.Skills?.[skillType];
}

// Get skill description using shared util
function getSkillDescription(skillType: SkillType): string {
  const skill = getSkillData(skillType);
  const levels = getLevelDisplay(skillType);
  return formatSkillDescription(skill, levels.current, levels.target, localizationCache.value);
}

// Get skill cost (only for Ex skills)
function getSkillCostDisplay(skillType: SkillType): string {
  const skill = props.student?.Skills?.[skillType];
  if (!skill?.Cost) return '';
  const levels = getLevelDisplay(skillType);
  return formatSkillCost(skill.Cost, levels.current, levels.target);
}

// Get BulletType color using colorUtils
const bulletTypeColor = computed(() => getBulletTypeColor(props.student?.BulletType));
</script>

<template>
  <div class="info-skills">
    <div class="skills-grid">
      <div v-for="skillType in skillOrder" :key="skillType" class="skill-card">
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
.info-skills {
  background: var(--card-background);
  border-radius: 10px;
  padding: 1rem;
  border: 1px solid var(--border-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 5px;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
}

.skill-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 8px;
  background: var(--background-primary);
}

/* Skill Icon */
.skill-icon-wrapper {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
}

.skill-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.skill-fg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  z-index: 2;
  padding: 2px;
  cursor: pointer;
}

img, svg {
  vertical-align: middle;
}

.enhanced-overlay {
  position: absolute;
  top: 2px;
  right: -4px;
  width: 18px;
  height: 18px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 3;
  pointer-events: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1;
}

/* Tooltip */
.skill-tooltip {
  position: fixed;
  background: var(--card-background);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px;
  min-width: 200px;
  max-width: 300px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  pointer-events: none;
}

.tooltip-content {
  font-size: 0.9em;
  line-height: 1.4;
  color: var(--text-primary);
}

.tooltip-name {
  font-weight: bold;
  font-size: 1em;
  margin-bottom: 6px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-color);
}

.tooltip-cost {
  font-weight: bold;
  margin-bottom: 4px;
}

.tooltip-desc {
  white-space: pre-wrap;
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
  color: var(--accent-color, #4a8af4);
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
</style>
