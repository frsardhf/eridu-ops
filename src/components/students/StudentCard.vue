<script setup lang="ts">
import { StudentProps } from '@/types/student'
import { ref, onUnmounted, computed } from 'vue'
import { useStudentCard } from '@/lib/hooks/useStudentCard'
import { useWindowResize } from '@/composables/dom/useWindowResize'
import { getStudentCollectionUrl, getBondIconUrl } from '@/lib/utils/iconUtils'
import { getMaxTierForTypeSync } from '@/lib/utils/gearMaterialUtils'
import { useCardOverlayPrefs } from '@/lib/hooks/useCardOverlayPrefs'
import { SkillType, SkillTypeName, PotentialType } from '@/types/upgrade'
import { EquipmentType } from '@/types/gear'
import { ModalOriginRect } from '@/types/modal';
import StarIcon from '@/components/shared/StarIcon.vue'
import {
  WEAPON_STAR_THRESHOLD, MAX_LEVEL, MAX_GRADE, MAX_EX_SKILL_LEVEL, MAX_SKILL_LEVEL, MAX_POTENTIAL_LEVEL,
} from '@/lib/constants/gameConstants'

const props = defineProps<{
  student: StudentProps;
  /** Ignore the /students eye-menu hide prefs and always show every overlay
   *  (used by DeckBuilder so its cards aren't affected by the grid's setting). */
  forceShowOverlays?: boolean;
}>();
const emit = defineEmits<{
  (e: 'click', payload: { student: StudentProps; originRect: ModalOriginRect | null }): void;
  (e: 'pin-toggled', studentId: string | number, isPinned: boolean): void;
}>();

// ── State ────────────────────────────────────────────────────────────────────
const isMobile = ref(false);
const { studentData, isPinned, togglePin, currentLanguage } = useStudentCard(
  computed(() => props.student.Id)
);

// Which overlays the user pinned to always-display (eye menu); the rest stay
// hover-only. Drives the .ov-* classes on the card root.
const { isShown: isOverlayShown } = useCardOverlayPrefs();
const overlayClasses = computed(() => ({
  'ov-level': props.forceShowOverlays || isOverlayShown('level'),
  'ov-grade': props.forceShowOverlays || isOverlayShown('grade'),
  'ov-equipment': props.forceShowOverlays || isOverlayShown('equipment'),
  'ov-skills': props.forceShowOverlays || isOverlayShown('skills'),
  'ov-potential': props.forceShowOverlays || isOverlayShown('potential'),
}));
const skillTypes: SkillType[] = ['Ex', 'Public', 'Passive', 'ExtraPassive'];
const skillTypeNames: SkillTypeName[] = ['Ex', 'Basic', 'Enhanced', 'Sub'];
const potentialTypes: PotentialType[] = ['maxhp', 'attack', 'healpower'];

function checkScreenWidth() {
  isMobile.value = window.innerWidth <= 768;
}

useWindowResize(checkScreenWidth);

// ── Lifecycle ────────────────────────────────────────────────────────────────
onUnmounted(() => {
  if (pinPopTimer) {
    clearTimeout(pinPopTimer);
  }
});

// ── Display helpers ───────────────────────────────────────────────────────────
function getFontSizeClass(name: string): string {
  // Mobile sizing is the same regardless of language
  if (isMobile.value) {
    return name.length < 10 ? 'text-lg' : 'text-sm';
  }
  
  // Language-specific font sizing
  if (currentLanguage.value === 'jp') {
    // Japanese uses different thresholds
    if (name.length < 7) {
      return 'text-xl';
    } else if (name.length < 8) {
      return 'text-lg';
    } else {
      return 'text-normal';
    }
  } else {
    // English uses the original thresholds
    switch (true) {
      case name.length < 10:
        return 'text-xl';
      case name.length < 13:
        return 'text-lg';
      case name.length < 17:
        return 'text-normal';
      default:
        return 'text-sm';
    }
  }
}

function shouldShowTarget(
  current: number | undefined, target: number | undefined
): boolean {
  if (!current || !target) return false;
  return current !== target;
}

function formatSkillValue(
  value: number | undefined, isEx: boolean
): string {
  if (!value) return '1';
  if (isEx && value === MAX_EX_SKILL_LEVEL) return 'M';
  if (!isEx && value === MAX_SKILL_LEVEL) return 'M';
  return value.toString();
}

function formatPotentialValue(value: number | undefined): string {
  if (value === MAX_POTENTIAL_LEVEL) return 'M';
  return value?.toString() ?? '0';
}

// ── Computed ─────────────────────────────────────────────────────────────────
const hasAnyPotentialData = computed(() => {
  const p = studentData.value?.potentialLevels;
  if (!p) return false;
  return potentialTypes.some(t => (p[t]?.current ?? 0) > 0 || (p[t]?.target ?? 0) > 0);
});

const hasAnyPotentialDifference = computed(() => {
  const p = studentData.value?.potentialLevels;
  if (!p) return false;
  return potentialTypes.some(t => (p[t]?.current ?? 0) !== (p[t]?.target ?? 0));
});

const pinPop = ref(false);
let pinPopTimer: ReturnType<typeof setTimeout> | null = null;

const hasAnySkillDifference = computed(() => {
  if (!studentData.value?.skillLevels) return false;
  
  const skills = studentData.value.skillLevels;
  
  return (
    isDifferent(skills.Ex) ||
    isDifferent(skills.Public) ||
    isDifferent(skills.Passive) ||
    isDifferent(skills.ExtraPassive)
  );
});

function isDifferent(
  skill: { current?: number, target?: number } | undefined
): boolean {
  if (!skill?.current || !skill?.target) return false;
  return skill.current !== skill.target;
}

const studentEquipment = computed(() => {
  return props.student.Equipment || [];
});

function formatEquipmentTier(value: number | undefined): string {
  if (!value) return '1';
  return value.toString();
}

const hasAnyEquipmentDifference = computed(() => {
  if (!studentData.value?.equipmentLevels) return false;
  
  const equipmentLevels = studentData.value.equipmentLevels;
  
  for (const type of studentEquipment.value) {
    const equipment = equipmentLevels[type as EquipmentType];
    if (equipment?.current !== equipment?.target && 
        equipment?.current !== undefined && 
        equipment?.target !== undefined) {
      return true;
    }
  }
  
  return false;
});

const displayEquipment = computed(() => {
  return studentEquipment.value;
});

const hasEquipmentData = computed(() => {
  return studentData.value?.equipmentLevels && 
    Object.keys(studentData.value.equipmentLevels).length > 0;
});

// Ownership: undefined / true = owned (backward-compat), false = not recruited
const isOwned = computed(() => studentData.value?.isOwned !== false);

const bondLevel = computed(() => {
  return studentData.value?.bondDetailData?.currentBond || 0;
});

const characterCurrentLevel = computed(() => {
  return studentData.value?.characterLevels?.current || 0;
});

const characterTargetLevel = computed(() => {
  return studentData.value?.characterLevels?.target || 0;
});

const gradeLevel = computed(() => {
  return studentData.value?.gradeLevels?.current || 0;
});

// Investment toward absolute max across level + grade + equipment + skills +
// potential, weighted equally per category (~20% each, 0–100). Equipment uses the
// student's actual slots (studentEquipment) — NOT every key in equipmentLevels,
// which holds tier-1 defaults for unused types that would drag a maxed unit < 100%.
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const avgRatio = (xs: number[]): number | null =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

const investmentPercent = computed(() => {
  const d = studentData.value;
  if (!d || d.isOwned === false) return 0;

  const skill = d.skillLevels ? avgRatio(skillTypes.map(t => {
    const cur = d.skillLevels![t]?.current ?? 1;
    const max = t === 'Ex' ? MAX_EX_SKILL_LEVEL : MAX_SKILL_LEVEL;
    return clamp01((cur - 1) / (max - 1));
  })) : null;

  const potential = d.potentialLevels ? avgRatio(potentialTypes.map(t =>
    clamp01((d.potentialLevels![t]?.current ?? 0) / MAX_POTENTIAL_LEVEL)
  )) : null;

  const slots = studentEquipment.value;
  const equipment = (d.equipmentLevels && slots.length) ? avgRatio(slots.map(type => {
    const max = getMaxTierForTypeSync(type);
    const cur = d.equipmentLevels![type as EquipmentType]?.current ?? 1;
    return max > 1 ? clamp01((cur - 1) / (max - 1)) : 0;
  })) : null;

  const level = d.characterLevels
    ? clamp01(((d.characterLevels.current ?? 1) - 1) / (MAX_LEVEL - 1))
    : null;

  // Grade is measured from the unit's base StarGrade (free) up to max, so base
  // rarity isn't counted as investment.
  const grade = d.gradeLevels ? (() => {
    const base = props.student.StarGrade ?? 1;
    const den = MAX_GRADE - base;
    return den > 0 ? clamp01(((d.gradeLevels.current ?? base) - base) / den) : 1;
  })() : null;

  const cats = [level, grade, skill, potential, equipment].filter((x): x is number => x !== null);
  if (!cats.length) return 0;
  return Math.round((cats.reduce((a, b) => a + b, 0) / cats.length) * 100);
});

// ── Event handlers ────────────────────────────────────────────────────────────
function handlePinToggle(event: MouseEvent) {
  event.stopPropagation();
  const newPinStatus = togglePin(props.student.Id);
  if (pinPopTimer) {
    clearTimeout(pinPopTimer);
  }
  pinPop.value = false;
  requestAnimationFrame(() => {
    pinPop.value = true;
    pinPopTimer = setTimeout(() => {
      pinPop.value = false;
    }, 240);
  });
  emit('pin-toggled', props.student.Id, newPinStatus);
}

function handleCardClick(event: MouseEvent) {
  const sourceEl = event.currentTarget as HTMLElement | null;
  let originRect: ModalOriginRect | null = null;

  if (sourceEl) {
    const rect = sourceEl.getBoundingClientRect();
    originRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };
  }

  emit('click', { student: props.student, originRect });
}
</script>

<template>
  <div
    class="student-card"
    :class="overlayClasses"
    :key="`card-${student.Id}-${isPinned}`">
    <!-- Pin icon -->
    <div :class="['pin-icon', { 'pinned': isPinned }]" @click.stop="handlePinToggle"
      :key="`pin-${student.Id}-${isPinned}`">
      <img
        :src="isPinned ? '/assets/thumbtacks-active.png' : '/assets/thumbtacks.png'"
        :class="['pin-img', { 'pinned': isPinned, 'pin-pop': pinPop }]"
        alt="Pin icon"
      />
    </div>
    
    <a class="selection-grid-card" @click="handleCardClick">
      <div class="card-img">
        <img
          :src="getStudentCollectionUrl(student.Id)"
          :alt="student.Name"
          :class="{ 'img--unowned': !isOwned }"
        >
        <!-- Stats overlay -->
        <div class="stats-overlay">
          <!-- Bond Level -->
          <div class="bond-container" v-if="bondLevel > 0 && isOwned">
            <div class="bond-icon-container">
              <img 
                :src="getBondIconUrl()"
                alt="Bond Level"
                class="bond-icon"
              />
              <span class="bond-number">{{ bondLevel }}</span>
            </div>
          </div>

          <!-- Grade Level -->
          <div class="grade-container" v-if="gradeLevel > 0 && isOwned">
            <div class="grade-stars-row">
              <!-- Gold stars for grades 1–5, blue for 6–9 (subtract threshold) -->
              <StarIcon
                v-for="i in (gradeLevel <= WEAPON_STAR_THRESHOLD ? gradeLevel : gradeLevel - WEAPON_STAR_THRESHOLD)"
                :key="`star-${i}`"
                class="small-star"
                :class="gradeLevel <= WEAPON_STAR_THRESHOLD ? 'gold-star' : 'blue-star'"
              />
            </div>
          </div>
          
          <!-- Character Level -->
          <div class="level-container"
          v-if="characterCurrentLevel > 0 && isOwned">
            <span class="level-number">{{ characterCurrentLevel }}</span>
            <span class="level-max" 
              v-if="shouldShowTarget(characterCurrentLevel,
              characterTargetLevel
            )">/{{ characterTargetLevel }}</span>
          </div>
          
          <!-- Bottom overlays container -->
          <div class="bottom-overlays">
            <!-- Equipment Levels -->
            <div class="equipment-levels"
              v-if="hasEquipmentData && displayEquipment.length > 0 && isOwned">
              <div class="equipment-row">
                <span 
                  v-for="type in displayEquipment" 
                  :key="type" 
                  class="equipment-value"
                  :title="type + ' Equipment Level'"
                >
                  {{ formatEquipmentTier(studentData?.equipmentLevels?.[type]?.current) }}
                </span>
              </div>
              <div class="equipment-row" v-if="hasAnyEquipmentDifference">
                <span
                  v-for="type in displayEquipment"
                  :key="`target-${type}`"
                  class="equipment-value target-value"
                  :title="'Target ' + type + ' Equipment Level'"
                >
                  {{ formatEquipmentTier(studentData?.equipmentLevels?.[type]?.target) }}
                </span>
              </div>
            </div>
            
            <!-- Right column: potential + skill stacked -->
            <div class="right-overlays">
              <!-- Potential Levels -->
              <div class="potential-levels" v-if="hasAnyPotentialData && isOwned">
                <div class="potential-row">
                  <span
                    v-for="type in potentialTypes"
                    :key="type"
                    class="potential-value"
                    :title="type + ' Potential'"
                  >
                    {{ formatPotentialValue(studentData?.potentialLevels?.[type]?.current) }}
                  </span>
                </div>
                <div class="potential-row" v-if="hasAnyPotentialDifference">
                  <span
                    v-for="type in potentialTypes"
                    :key="`target-${type}`"
                    class="potential-value target-value"
                    :title="'Target ' + type + ' Potential'"
                  >
                    {{ formatPotentialValue(studentData?.potentialLevels?.[type]?.target) }}
                  </span>
                </div>
              </div>

              <!-- Skill Levels -->
              <div class="skill-levels" v-if="studentData?.skillLevels && isOwned">
                <div class="skill-row">
                  <span
                    v-for="(skillType, idx) in skillTypes"
                    :key="skillType"
                    class="skill-value"
                    :title="skillTypeNames[idx] + ' Skill Level'"
                  >
                    {{ formatSkillValue(
                      studentData.skillLevels[skillType]?.current,
                      skillType === 'Ex'
                    ) }}
                  </span>
                </div>
                <div class="skill-row" v-if="hasAnySkillDifference">
                  <span
                    v-for="(skillType, idx) in skillTypes"
                    :key="`target-${skillType}`"
                    class="skill-value"
                    :title="'Target ' + skillTypeNames[idx] + ' Skill Level'"
                  >
                    {{ formatSkillValue(
                      studentData.skillLevels[skillType]?.target,
                      skillType === 'Ex'
                    ) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Investment summary: equipment + skills + potential toward max -->
      <div
        v-if="isOwned"
        class="investment-bar"
        role="progressbar"
        :aria-valuenow="investmentPercent"
        aria-valuemin="0"
        aria-valuemax="100"
        :title="`${investmentPercent}% invested`"
      >
        <div class="investment-bar-fill" :style="{ width: investmentPercent + '%' }"></div>
      </div>
      <div class="card-label">
        <span :class="['label-text', getFontSizeClass(student.Name)]">
          {{ student.Name }}
        </span>
      </div>
    </a>
  </div>
</template>

<style scoped>
.student-card {
  width: 150px;
  position: relative;
}

.selection-grid-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-background);
  box-shadow: 0 2px 4px var(--box-shadow);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}

.selection-grid-card:focus {
  box-shadow: 0 0 0 3px #4fc3f7, 0 2px 8px var(--box-shadow);
  z-index: 2;
}

.selection-grid-card:hover {
  transform: scale(1.04);
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
}

.selection-grid-card:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
}

.card-img {
  width: 150px;
  height: 170px;
  overflow: hidden;
  position: relative;
}

.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stats-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-areas: 
    "grade bond"
    "empty level"
    "bottom bottom";
  grid-template-rows: auto 1fr;
  grid-template-columns: 1fr auto;
  padding: 4px;
  gap: 0;
}

.bottom-overlays {
  grid-area: bottom;
  align-self: end;
  display: flex;
  width: 100%;
}

/* Level + the skill/potential/equipment rows are all summarized by the progress
   bar above the name, so they only reveal on hover or focus. Bond, grade, and
   the pin stay visible at all times. */
.level-container,
.grade-container,
.equipment-levels,
.potential-levels,
.skill-levels {
  opacity: 0;
  transition: opacity 0.15s ease;
}

/* Detail on demand: every overlay reveals on hover/focus. The eye menu pins any
   of them to always-on via .ov-* classes on the card root. */
.selection-grid-card:hover .level-container,
.selection-grid-card:focus .level-container,
.selection-grid-card:hover .grade-container,
.selection-grid-card:focus .grade-container,
.selection-grid-card:hover .equipment-levels,
.selection-grid-card:focus .equipment-levels,
.selection-grid-card:hover .potential-levels,
.selection-grid-card:focus .potential-levels,
.selection-grid-card:hover .skill-levels,
.selection-grid-card:focus .skill-levels {
  opacity: 1;
}

.student-card.ov-level .level-container,
.student-card.ov-grade .grade-container,
.student-card.ov-equipment .equipment-levels,
.student-card.ov-potential .potential-levels,
.student-card.ov-skills .skill-levels {
  opacity: 1;
}

.bond-container {
  grid-area: bond;
  justify-self: end;
}

.bond-icon-container {
  position: relative;
  width: 36px;
  height: 36px;
}

.bond-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.bond-number {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%);
  font-weight: bold;
  font-size: 14px;
  color: white;
}

.grade-container {
  grid-area: grade;
  justify-self: flex-end;
  margin-top: 7px;
  margin-right: 2px;
}

.grade-stars-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.6);
  padding: 4px 4px;
  border-radius: 4px;
}

.small-star {
  width: 16px;
  height: 16px;
  filter: drop-shadow(0 0 1px rgba(0, 0, 0, 0.5));
}

.gold-star {
  color: var(--color-grade-gold);
}

.blue-star {
  color: var(--color-grade-blue);
}

.level-container {
  max-height: 22px;
  grid-area: level;
  justify-self: end;
  background: rgba(0, 0, 0, 0.6);
  padding: 0px 4px;
  margin-right: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 1px;
}

.level-number {
  color: white;
  font-size: 14px;
  font-weight: bold;
}

.level-max {
  color: #aaa;
  font-size: 12px;
}


.skill-levels,
.equipment-levels {
  align-self: end;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
}

.right-overlays {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 2px;
  margin-left: auto;
}

.potential-levels {
  align-self: end;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
}

.potential-row {
  display: flex;
  width: 100%;
  justify-content: flex-end;
}

.potential-value {
  color: white;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  min-width: 20px;
  width: 20px;
  text-align: center;
  display: inline-block;
  box-sizing: border-box;
  transition: background 0.15s;
}

.potential-value[title]:hover {
  background: rgba(80, 180, 255, 0.5);
}

.equipment-levels {
  margin-right: 2px;
}

.skill-row,
.equipment-row {
  display: flex;
  width: 100%;
}

.skill-row {
  justify-content: flex-end;
}

.equipment-row {
  justify-content: flex-start;
}

.skill-value, 
.equipment-value {
  color: white;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  min-width: 20px; 
  width: 20px; 
  text-align: center;
  display: inline-block; 
  box-sizing: border-box;
  transition: background 0.15s;
}

.skill-value[title]:hover, .equipment-value[title]:hover {
  background: rgba(80, 180, 255, 0.5);
}

/* Unowned (not recruited) state */
.img--unowned {
  filter: brightness(0.35) grayscale(0.25);
}


.investment-bar {
  height: 3px;
  width: 100%;
  background: var(--background-secondary);
  overflow: hidden;
}

.investment-bar-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 0 2px 2px 0;
  transition: width 0.3s ease;
}

.card-label {
  margin-top: 0;
  padding: 4px;
  text-align: center;
  background-color: var(--card-label-background);
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-text {
  line-height: 1;
  width: 100%;
  padding: 0 2px;
  color: var(--text-primary);
}

.label-text:hover {
  color: var(--accent-color);
}

/* Font size classes */
.text-xl {
  font-size: 1.25rem;
}

.text-lg {
  font-size: 1.125rem;
}

.text-normal {
  font-size: 1rem;
}

.text-sm {
  font-size: 0.875rem;
}

/* Pin icon styles */
.pin-icon {
  position: absolute;
  top: -10px;
  left: -10px;
  width: 30px;
  height: 30px;
  z-index: 10;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #a6a6a6;
  border-radius: 50%;
  padding: 5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: background-color 0.1s ease;
}

.pin-icon:hover {
  background-color: var(--color-pin-active);
  color: black;
}

.pin-icon.pinned {
  background-color: var(--color-pin-active);
}

.pin-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0.7;
  transition: opacity 0.1s ease;
}

.pin-img.pinned {
  opacity: 1;
}

.pin-img.pin-pop {
  animation: pin-pop 0.24s ease;
}

@keyframes pin-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pin-img.pin-pop {
    animation-duration: 1ms;
  }
}

@media screen and (max-width: 768px) {
  .student-card {
    width: 100px;
  }

  .card-img {
    width: 100px;
    height: 113px;
  }

  .bond-icon-container {
    width: 24px;
    height: 24px;
  }

  .bond-number {
    font-size: 10px;
  }

  .grade-container {
    margin-top: 4px;
    margin-right: 0px;
  }

  .grade-stars-row {
    padding: 3px 3px;
  }

  .small-star {
    width: 10px;
    height: 10px;
  }

  .level-container {
    max-height: 18px;
    padding: 1px 3px;
  }

  .level-number {
    font-size: 10px;
  }

  .level-max {
    font-size: 10px;
  }

  .skill-levels,
  .equipment-levels,
  .potential-levels {
    gap: 1px;
    padding: 1px;
  }

  .skill-value,
  .equipment-value,
  .potential-value {
    font-size: 10px;
    min-width: 12px;
    width: 10px;
  }
}

@media screen and (max-width: 384px) {
  .bond-number {
    left: 52%;
  }
}
</style>
