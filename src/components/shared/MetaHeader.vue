<script setup lang="ts">
import { computed, toRef } from 'vue';
import { $t } from '@/locales';
import { useStudentInfo } from '@/composables/useStudentInfo';
import { useStudentLevels } from '@/composables/useStudentLevels';
import { useBondEditor } from '@/composables/useInputEditor';
import { getSchoolColor } from '@/lib/utils/colorUtils';
import { getBondIconUrl, getTypeIconUrl, getRoleIconUrl, getSchoolIconUrl } from '@/lib/utils/iconUtils';
import { MIN_BOND_LEVEL, MAX_BOND_LEVEL } from '@/lib/constants/gameConstants';
import { StudentProps } from '@/types/student';

const props = defineProps<{
  student: StudentProps;
  /** Required in level-pill mode (the default). Ignored when bondProgress is true. */
  characterLevels?: { current: number; target: number };
  currentBond: number;
  newBondLevel?: number;
  hasStyleSwitch?: boolean;
  activeStyleId?: number;
  primaryStudentId?: number;
  /**
   * BondsPage mode: the level pill shows BOND progression (currentBond →
   * newBondLevel) instead of character level. When set, `characterLevels`
   * is ignored and `remainingXp` / `totalExp` are rendered as stat chips.
   */
  bondProgress?: boolean;
  remainingXp?: number;
  totalExp?: number;
  /** Suppresses the wrapping card chrome (BondsPage embeds inline). */
  flat?: boolean;
  /**
   * Modal mode: clicking the bond icon emits `navigate-bond` instead of
   * starting an inline edit. Caller handles the route push to /bonds.
   * Mutually exclusive with `bondProgress`.
   */
  enableBondNavigate?: boolean;
}>();

const emit = defineEmits<{
  (e: 'toggle-style'): void;
  (e: 'update-bond', value: number): void;
  (e: 'navigate-bond'): void;
}>();

const effectiveNewBondLevel = computed(() => props.newBondLevel ?? props.currentBond);

const studentRef = toRef(() => props.student);

const { squadTypeName, bulletTypeName, armorTypeName, schoolName, clubName, tacticRoleName,
  squadTypeColor, bulletTypeColor, armorTypeColor, bulletTypeColorLight, armorTypeColorLight
} = useStudentInfo(studentRef);

const { showLevelArrow } = useStudentLevels(
  () => props.characterLevels ?? { current: 0, target: 0 }
);

const showBondArrow = computed(() => props.currentBond !== effectiveNewBondLevel.value);

// Inline bond editor — only used when bondProgress is true (BondsPage).
// Inert in the modal's level / navigate modes.
const {
  bondState, bondEditorRef, isEditing, editValue,
  startEdit, commitEdit, handleEditorKeydown,
} = useBondEditor(() => props.currentBond, (value) => emit('update-bond', value));

const levelPillClass = computed(() => ({
  maxed50: props.currentBond >= 50 && props.currentBond < 100,
  maxed100: props.currentBond >= 100
}));

const styleModeLabel = computed(() => {
  if (typeof props.activeStyleId !== 'number') {
    return 'I';
  }

  if (typeof props.primaryStudentId === 'number') {
    return props.activeStyleId === props.primaryStudentId ? 'I' : 'II';
  }

  return props.activeStyleId === 2 ? 'II' : 'I';
});

const isBondMaxed = computed(() => props.currentBond >= 100);
const isBondInteractive = computed(() => !!props.bondProgress || (!!props.enableBondNavigate && !isBondMaxed.value));

const bondInlineTooltip = computed(() => {
  if (props.bondProgress) return $t('editBondLevel');
  if (isBondMaxed.value) return $t('bondMaxed');
  if (props.enableBondNavigate) return $t('openInBondsPage');
  return undefined;
});

function onBondInlineClick() {
  if (props.bondProgress) startEdit();
  else if (props.enableBondNavigate && !isBondMaxed.value) emit('navigate-bond');
}
</script>

<template>
  <section
    :class="['student-meta-header', { 'student-meta-header--flat': flat }]"
    aria-label="Student Summary"
  >
    <div class="identity-row">
      <h2 class="student-name">{{ student.Name }}</h2>
      <div class="identity-actions">
        <button
          v-if="hasStyleSwitch"
          class="style-toggle-btn"
          :class="{ active: activeStyleId !== primaryStudentId }"
          @click="emit('toggle-style')"
          type="button"
          :title="`${$t('switchStyle')} (${styleModeLabel})`"
          :aria-label="`${$t('switchStyle')} ${styleModeLabel}`"
        >
          <span class="style-mode-label">{{ styleModeLabel }}</span>
        </button>

        <div v-if="bulletTypeName" class="type-pill-divided">
          <span class="pill-label" :style="{ backgroundColor: bulletTypeColorLight }">
            <img :src="getTypeIconUrl('Attack')" alt="ATK" class="type-icon icon-white" />
          </span>
          <span class="pill-value" :style="{ backgroundColor: bulletTypeColor }">
            {{ bulletTypeName }}
          </span>
        </div>

        <div v-if="armorTypeName" class="type-pill-divided">
          <span class="pill-label" :style="{ backgroundColor: armorTypeColorLight }">
            <img :src="getTypeIconUrl('Defense')" alt="DEF" class="type-icon icon-white" />
          </span>
          <span class="pill-value" :style="{ backgroundColor: armorTypeColor }">
            {{ armorTypeName }}
          </span>
        </div>

        <span
          v-if="squadTypeName"
          class="role-chip font-nexon"
          :style="{ backgroundColor: squadTypeColor }"
        >
          {{ squadTypeName }}
        </span>
      </div>
    </div>

    <div class="meta-row">
      <div class="meta-chips">
        <div class="level-pill" :class="levelPillClass">
          <div
            class="bond-inline"
            :class="{
              updating: showBondArrow,
              'bond-inline--editable': props.bondProgress,
              'bond-inline--navigate': props.enableBondNavigate && !isBondMaxed,
              'bond-inline--maxed': isBondMaxed,
            }"
            :role="isBondInteractive ? 'button' : undefined"
            :tabindex="isBondInteractive ? 0 : undefined"
            :title="bondInlineTooltip"
            :aria-label="bondInlineTooltip"
            @click="onBondInlineClick"
            @keydown.enter.prevent="onBondInlineClick"
            @keydown.space.prevent="onBondInlineClick"
          >
            <img
              :src="getBondIconUrl()"
              alt="Bond"
              class="bond-icon-inline"
            />
            <span class="bond-number-inline">{{ currentBond }}</span>
          </div>
          <div class="level-content">
            <template v-if="bondProgress">
              <span class="level-label">BOND</span>
              <button
                v-if="!isEditing"
                type="button"
                class="level-number level-number-button"
                :title="$t('editBondLevel')"
                :aria-label="$t('editBondLevel')"
                @click="startEdit"
              >{{ bondState }}</button>
              <input
                v-else
                ref="bondEditorRef"
                v-model="editValue"
                type="number"
                class="level-number level-number-input"
                :min="MIN_BOND_LEVEL"
                :max="MAX_BOND_LEVEL"
                @blur="commitEdit"
                @keydown="handleEditorKeydown"
              />
              <template v-if="showBondArrow">
                <span class="level-arrow">→</span>
                <span class="level-number target">{{ effectiveNewBondLevel }}</span>
              </template>
            </template>
            <template v-else-if="characterLevels">
              <span class="level-label">LEVEL</span>
              <span class="level-number">{{ characterLevels.current }}</span>
              <template v-if="showLevelArrow">
                <span class="level-arrow">→</span>
                <span class="level-number target">{{ characterLevels.target }}</span>
              </template>
            </template>
          </div>
        </div>

        <template v-if="bondProgress">
          <!-- Remaining-XP chip is intentionally not gated on showBondArrow so
               users see "X EXP to next level" the moment they set a bond, even
               before allocating gifts — otherwise an unprojected BOND pill is
               visually indistinguishable from the modal's LEVEL pill. -->
          <span v-if="(remainingXp ?? 0) > 0" class="bond-stat-chip">
            {{ remainingXp }} {{ $t('expToNextLevel') }}
          </span>
          <span v-if="(totalExp ?? 0) > 0" class="bond-stat-chip strong">
            {{ $t('totalExp') }}: {{ (totalExp ?? 0).toLocaleString() }}
          </span>
        </template>
      </div>
    </div>

    <div v-if="schoolName || clubName || tacticRoleName" class="affiliation-row">
      <span v-if="tacticRoleName" class="affiliation-pill affiliation-pill--role">
        <img
          :src="getRoleIconUrl(student.TacticRole)"
          :alt="tacticRoleName"
          class="affiliation-icon icon-white"
        />
        <span class="affiliation-text">{{ tacticRoleName }}</span>
      </span>
      <span class="affiliation-pill" :style="{ backgroundColor: getSchoolColor(student.School) }">
        <img
          v-if="schoolName"
          :src="getSchoolIconUrl(student.School)"
          :alt="schoolName"
          class="affiliation-icon icon-white"
        />
        <span class="affiliation-text">
          {{ schoolName }}<template v-if="schoolName && clubName"> / {{ clubName }}</template><template v-else-if="clubName">{{ clubName }}</template>
        </span>
      </span>
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

/* Flat variant — strip the card chrome when the header is embedded inside
   another card (e.g., BondsStudentEditor places it inline beside the icon). */
.student-meta-header--flat {
  background: transparent;
  border: none;
  padding: 0;
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

.identity-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.style-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1.5px solid var(--border-color);
  border-radius: 8px;
  background: var(--background-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.style-toggle-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.style-toggle-btn.active {
  border-color: var(--accent-color);
  background: var(--accent-color);
  color: white;
}

.style-mode-label {
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
}

.role-chip {
  border-radius: 999px;
  padding: 1.835px 10px;
  font-size: 1rem;
  color: white;
  white-space: nowrap;
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
  height: 30px;
  background: var(--background-primary);
  border: 1px solid var(--color-bond);
  border-radius: 999px;
  overflow: visible;
}

.level-pill.maxed50 {
  background: linear-gradient(135deg, rgba(248, 203, 39, 0.24), rgba(248, 255, 51, 0.22));
  border-color: color-mix(in srgb, var(--color-grade-gold) 65%, transparent);
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

/* Editable variant (BondsPage). Hover tint + cursor pointer signal that the
   heart icon is a secondary edit target alongside the dotted-underlined
   number. Tabindex makes it keyboard-focusable via the role="button"
   markup. */
.bond-inline--editable {
  cursor: pointer;
  border-radius: 999px;
  transition: background-color 0.15s, transform 0.15s;
}

/* Bond maxed badge — no pointer when standalone (modal); editable keeps
   cursor: pointer since it's still an edit target on /bonds. */
.bond-inline--maxed {
  border-radius: 999px;
}

.bond-inline--maxed:not(.bond-inline--editable) {
  cursor: default;
}

/* Navigate variant (modal bond chip, non-maxed). */
.bond-inline--navigate {
  cursor: pointer;
  border-radius: 999px;
  transition: transform 0.15s;
}

/* Scale + keyboard focus shared by both interactive variants. */
.bond-inline--navigate:hover,
.bond-inline--editable:hover {
  transform: scale(1.05);
}

.bond-inline--navigate:focus-visible,
.bond-inline--editable:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* ── Sparkle diamonds ──────────────────────────────────────────────────────
   2×2 rotated square = ♦. Six pseudo-elements share the same base setup;
   only color (pink vs accent) and run count (infinite vs once) differ. */

.bond-inline--maxed::before,
.bond-inline--maxed::after,
.bond-inline--navigate::before,
.bond-inline--navigate::after,
.bond-inline--editable:not(.bond-inline--maxed)::before,
.bond-inline--editable:not(.bond-inline--maxed)::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  height: 2px;
  margin: -1px 0 0 -1px;
  transform: rotate(45deg) scale(0.4);
  opacity: 0;
  pointer-events: none;
}

/* Bond-100: pink/fuchsia */
.bond-inline--maxed::before {
  background: rgba(255, 105, 180, 0.95);
  box-shadow:
    -9px  -11px 0 0.5px rgba(255, 105, 180, 0.95),
     7px  -13px 0 0.5px rgba(235,  51, 255, 0.85),
    14px    2px 0 0.5px rgba(255, 160, 210, 0.9),
   -12px    8px 0 0.5px rgba(255, 105, 180, 0.85),
     1px  -17px 0 0.5px rgba(255, 210, 230, 0.9),
    16px   -7px 0 0.5px rgba(235,  51, 255, 0.75);
}

.bond-inline--maxed::after {
  background: rgba(235, 51, 255, 0.85);
  box-shadow:
    -5px  -15px 0 0.5px rgba(255, 180, 220, 0.9),
    13px   -9px 0 0.5px rgba(255, 105, 180, 0.8),
    10px   12px 0 0.5px rgba(235,  51, 255, 0.75),
   -15px    2px 0 0.5px rgba(255, 210, 230, 0.85),
     6px   16px 0 0.5px rgba(255, 130, 190, 0.8),
   -10px  -18px 0 0.5px rgba(235,  51, 255, 0.7);
}

/* Non-maxed (navigate + editable): accent color — identical, so grouped. */
.bond-inline--navigate::before,
.bond-inline--editable:not(.bond-inline--maxed)::before {
  background: var(--accent-color);
  box-shadow:
    -9px  -11px 0 1px color-mix(in srgb, var(--accent-color) 95%, transparent),
     7px  -13px 0 1px color-mix(in srgb, var(--accent-color) 85%, transparent),
    14px    2px 0 1px color-mix(in srgb, var(--accent-color) 90%, transparent),
   -12px    8px 0 1px color-mix(in srgb, var(--accent-color) 85%, transparent),
     1px  -17px 0 1px color-mix(in srgb, var(--accent-color) 90%, transparent),
    16px   -7px 0 1px color-mix(in srgb, var(--accent-color) 75%, transparent);
}

.bond-inline--navigate::after,
.bond-inline--editable:not(.bond-inline--maxed)::after {
  background: color-mix(in srgb, var(--accent-color) 85%, transparent);
  box-shadow:
    -5px  -15px 0 1px color-mix(in srgb, var(--accent-color) 90%, transparent),
    13px   -9px 0 1px color-mix(in srgb, var(--accent-color) 80%, transparent),
    10px   12px 0 1px color-mix(in srgb, var(--accent-color) 75%, transparent),
   -15px    2px 0 1px color-mix(in srgb, var(--accent-color) 85%, transparent),
     6px   16px 0 1px color-mix(in srgb, var(--accent-color) 80%, transparent),
   -10px  -18px 0 1px color-mix(in srgb, var(--accent-color) 70%, transparent);
}

/* Hover: bond-100 loops forever; non-maxed plays once. */
.bond-inline--maxed:hover::before { animation: bond-drift 2.4s ease-in-out infinite; }
.bond-inline--maxed:hover::after  { animation: bond-drift 2.4s ease-in-out infinite; animation-delay: -1.2s; }

.bond-inline--navigate:hover::before,
.bond-inline--editable:not(.bond-inline--maxed):hover::before {
  animation: bond-drift 2.4s ease-in-out forwards;
}

.bond-inline--navigate:hover::after,
.bond-inline--editable:not(.bond-inline--maxed):hover::after {
  animation: bond-drift 2.4s ease-in-out forwards;
  animation-delay: -1.2s;
}

@keyframes bond-drift {
  0%   { opacity: 0;   transform: rotate(45deg) scale(0.55); }
  15%  { opacity: 1;   transform: rotate(45deg) scale(0.65); }
  85%  { opacity: 0.9; transform: rotate(45deg) scale(0.9); }
  100% { opacity: 0;   transform: rotate(45deg) scale(1.0); }
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
  font-size: 0.92rem;
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

.level-number-button {
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
  font: inherit;
}

.level-number-button:hover {
  color: var(--accent-color);
}

.level-number-button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
  border-radius: 2px;
}

.level-number-input {
  width: 36px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-secondary);
  padding: 0 2px;
  text-align: center;
  appearance: textfield;
  -moz-appearance: textfield;
}

.level-number-input::-webkit-outer-spin-button,
.level-number-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
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

.bond-stat-chip {
  font-size: 0.82rem;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  padding: 4px 10px;
  background: var(--background-primary);
  color: var(--text-secondary);
}

.bond-stat-chip.strong {
  font-weight: 700;
  color: var(--text-primary);
}

.pill-label {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 7px;
}

.type-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  display: block;
}

.pill-value {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  color: white;
}

.affiliation-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.affiliation-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 14px 4px 8px;
  border-radius: 999px;
  border: none;
  white-space: nowrap;
}

.affiliation-pill--role {
  background: var(--text-tertiary);
  color: white;
}

.affiliation-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.affiliation-text {
  font-size: 0.88rem;
  font-weight: 600;
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
}
</style>
