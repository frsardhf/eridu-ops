<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useChibi3dScene } from '@/composables/useChibi3dScene';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { useChibiVoice } from '@/composables/useChibiVoice';

// Roaming-pet shell: click-to-walk, drag-to-pick-up, and gacha-on-release behaviour,
// driving a fixed-camera three.js canvas via useChibi3dScene (clip playback + model yaw
// for facing) plus useChibiVoice for the pickup/battle voice lines.
const props = withDefaults(defineProps<{
  charId: string;
  /** Rendered canvas size in px (square). */
  size?: number;
  /** Unarmed (Cafe_Walk) ground speed in px/sec. */
  speed?: number;
  /** Armed-walk (Move_Ing) speed multiplier over `speed`. Strikers jog faster than they
   *  stroll; tune so her feet plant (no sliding) against Move_Ing's run cadence. */
  armedSpeedMult?: number;
  /** Clip looped while standing still. */
  idleClip?: string;
  /** Apparent size: camera dolly factor (1 = base framing; >1 fills more of the canvas). */
  zoom?: number;
  /** Inspection orbit mode: drag to spin the camera; pet gestures (walk/pickup) suspend. */
  orbit?: boolean;
  /** Starting position in stage-local px (top-left of the sprite). */
  startX?: number;
  startY?: number;
}>(), {
  size: 180,
  speed: 150,
  armedSpeedMult: 1.7,
  idleClip: 'Cafe_Idle',
  zoom: 1,
  orbit: false,
  startX: 40,
  startY: 40,
});

// Clip vocabulary (resolved against the loaded GLB; absent clips just no-op).
// Weapon state is the governing constraint: Cafe_* is unarmed, Formation_*/Move_* are
// armed. Idle and walk are always drawn from the SAME family so the gun never pops
// mid-loop — the only flips happen at a walk-start (striker gacha) or at pickup.
const CAFE_IDLE = 'Cafe_Idle'; // unarmed idle — the universal resting/spawn state
const CAFE_WALK = 'Cafe_Walk'; // unarmed walk — every unit has it
const CAFE_REACTION = 'Cafe_Reaction'; // one-shot played on a tap (poke), then back to idle
const MOVE_ING = 'Move_Ing'; // armed walk — strikers only; its presence == "is a striker"
const MOVE_JUMP = 'Move_Jump'; // armed mid-walk hop (strikers)
const MOVE_JUMP_RANDOM = 'Move_Jump_random'; // ch0331 variant
const FORM_IDLE = 'Formation_Idle'; // armed idle
const FORM_IDLE_RANDOM = 'Formation_Idle_Random'; // armed idle variant (gacha partner)
const FORM_PICKUP = 'Formation_Pickup'; // armed "being held" pose, looped while dragged

const ARMED_WALK_CHANCE = 0.5; // striker: odds a walk uses Move_Ing (armed) vs Cafe_Walk
const FORM_IDLE_RANDOM_CHANCE = 0.5; // odds of the random armed idle (stop + pickup)
const JUMP_CHANCE = 0.3; // odds an armed walk includes one mid-walk jump
const JUMP_RANDOM_CHANCE = 1 / 3; // when jumping: Move_Jump : Move_Jump_random = 2 : 1

// SchaleDB R2 voice: pickup line on grab, gacha'd battle line on an armed-walk start.
// Preloaded; only available lines play (some characters lack the battle lines).
const { status: voiceStatus, playPickup, playArmedMove, playIdleMonolog, loadBattleLines } =
  useChibiVoice(props.charId);

const canvasEl = ref<HTMLCanvasElement | null>(null);
const {
  ready,
  error,
  play,
  hasClip,
  setFacing,
  faceCamera,
  isPointerOnModel,
  getModelBoundsPx,
  setOrbitEnabled,
  setZoom,
} = useChibi3dScene(canvasEl, {
  charId: props.charId,
  size: props.size,
});

const rootEl = ref<HTMLElement | null>(null);
const x = ref(props.startX);
const y = ref(props.startY);
const targetX = ref<number | null>(null);
const targetY = ref<number | null>(null);

// Walk state. `armedWalk` records whether the current walk used Move_Ing (armed), so the
// arrival idle can match its weapon state. Jump bookkeeping schedules at most one mid-walk
// Move_Jump per armed walk.
let walking = false;
let armedWalk = false;
let jumping = false;
let walkElapsed = 0;
let jumpAt = -1; // seconds into the walk to fire the jump, or -1 = none this walk

/** 50:50 armed idle (Formation_Idle vs _Random), falling back if the variant is absent. */
function pickArmedIdle(): string {
  return hasClip(FORM_IDLE_RANDOM) && Math.random() < FORM_IDLE_RANDOM_CHANCE
    ? FORM_IDLE_RANDOM
    : FORM_IDLE;
}

/** Begin a walk: strikers gacha Cafe_Walk vs Move_Ing; specials always Cafe_Walk. */
function startWalk(): void {
  scheduleIdleVoice(); // walking off pushes the next monolog out
  walking = true;
  jumping = false;
  walkElapsed = 0;
  jumpAt = -1;
  armedWalk = hasClip(MOVE_ING) && Math.random() < ARMED_WALK_CHANCE;
  if (armedWalk) {
    // Low-rate single mid-walk hop, fired once she's a beat into the path.
    if (hasClip(MOVE_JUMP) && Math.random() < JUMP_CHANCE) jumpAt = 0.4 + Math.random() * 0.6;
    play(MOVE_ING);
    playArmedMove(); // gacha a battle voice line for the sortie
  } else {
    play(CAFE_WALK);
  }
}

/** Settle into the idle that matches the walk just finished (armed → Formation, else Cafe). */
function settleIdle(): void {
  walking = false;
  jumping = false;
  faceCamera();
  play(armedWalk ? pickArmedIdle() : CAFE_IDLE);
}

/** One mid-walk Move_Jump (armed only): play once, keep translating, resume Move_Ing after. */
function doJump(): void {
  jumping = true;
  jumpAt = -1;
  const clip =
    hasClip(MOVE_JUMP_RANDOM) && Math.random() < JUMP_RANDOM_CHANCE ? MOVE_JUMP_RANDOM : MOVE_JUMP;
  play(clip, {
    loop: false,
    onEnd: () => {
      jumping = false;
      if (walking) play(MOVE_ING); // resume the armed walk if still moving
    },
  });
}

// Cursor reflects what a click does: `grab` only over Rio's silhouette, `crosshair`
// (walk) over the empty parts of the square canvas, `grabbing` while held. Driven by
// the same alpha hit-test as the grab, so the affordance never lies.
const petCursor = ref('crosshair');

/** Pointer position in canvas-local px, or null if the canvas isn't mounted. */
function canvasLocal(e: PointerEvent): { x: number; y: number } | null {
  const el = canvasEl.value;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

let hoverPending = false;
function onHover(e: PointerEvent): void {
  if (props.orbit || held || hoverPending) return; // orbit owns the cursor while inspecting
  const p = canvasLocal(e);
  if (!p) return;
  // Throttle the readPixels hit-test to once per frame (a GPU sync; cheap but not free).
  hoverPending = true;
  requestAnimationFrame(() => {
    hoverPending = false;
    petCursor.value = isPointerOnModel(p.x, p.y) ? 'grab' : 'crosshair';
  });
}

/** Send the pet walking to a stage-local point (centres the sprite on it). */
function walkTo(px: number, py: number): void {
  targetX.value = px - props.size / 2;
  targetY.value = py - props.size / 2;
}

/** Debug helper: stop moving and hold a specific clip facing the camera. */
function playClip(clip: string): void {
  targetX.value = null;
  targetY.value = null;
  walking = false;
  jumping = false;
  faceCamera();
  play(clip);
}

defineExpose({ walkTo, playClip, voiceStatus });

// Tap vs drag: a press on her is `pending` until the pointer either travels past
// DRAG_THRESHOLD (→ commit to a pickup/drag) or releases in place (→ a tap plays the
// cafe reaction). So no motion = interact, motion = pick up.
const DRAG_THRESHOLD = 6; // px of travel before a press becomes a drag
let pending = false;
let held = false;
let activePointerId = -1;
let startClientX = 0;
let startClientY = 0;
let stageEl: HTMLElement | null = null;
let grabClientX = 0;
let grabClientY = 0;
let grabX = 0;
let grabY = 0;
// Drag bounds for the canvas top-left, derived from Rio's silhouette so her body (not
// the empty canvas box) is what's bounded by the stage. Lets the head reach the top
// edge while the canvas padding overflows off-screen. Computed per grab.
let dragMinX = 0;
let dragMaxX = 0;
let dragMinY = 0;
let dragMaxY = 0;

function onGrab(e: PointerEvent): void {
  if (!ready.value || props.orbit) return; // in orbit mode the drag spins the camera
  // Only react when the pointer is actually over Rio; misses bubble to the stage
  // (walk-there). The canvas is a big square, so a plain hit would grab the corners.
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  if (!isPointerOnModel(e.clientX - rect.left, e.clientY - rect.top)) return;
  e.stopPropagation();
  scheduleIdleVoice(); // touching her pushes the next monolog out
  // Arm a press — don't commit to pickup yet; a tap (no travel) becomes a reaction.
  pending = true;
  activePointerId = e.pointerId;
  startClientX = e.clientX;
  startClientY = e.clientY;
  grabClientX = e.clientX;
  grabClientY = e.clientY;
  grabX = x.value;
  grabY = y.value;
  stageEl = (rootEl.value?.offsetParent as HTMLElement | null) ?? null;
  targetX.value = null; // touching her stops any in-progress walk
  targetY.value = null;
  walking = false;
}

/** The press crossed the drag threshold → pick her up (voice + held pickup pose). */
function commitDrag(): void {
  pending = false;
  held = true;
  petCursor.value = 'grabbing';
  // Bound the drag by her silhouette: canvas may overflow the stage so her body edges
  // reach every edge. minY = -bounds.minY lets her head touch the stage top.
  const b = getModelBoundsPx();
  if (b && stageEl) {
    dragMinX = -b.minX;
    dragMaxX = stageEl.clientWidth - b.maxX;
    dragMinY = -b.minY;
    dragMaxY = stageEl.clientHeight - b.maxY;
  }
  faceCamera();
  playPickup(); // pickup voice fires only on a real pickup, not a tap
  play(FORM_PICKUP, { loop: true });
}

function onDrag(e: PointerEvent): void {
  if (e.pointerId !== activePointerId) return;
  if (pending) {
    if (Math.hypot(e.clientX - startClientX, e.clientY - startClientY) < DRAG_THRESHOLD) return;
    commitDrag();
    // Re-anchor so she doesn't jump by the threshold distance when the drag starts.
    grabClientX = e.clientX;
    grabClientY = e.clientY;
    grabX = x.value;
    grabY = y.value;
  }
  if (!held) return;
  let nx = grabX + (e.clientX - grabClientX);
  let ny = grabY + (e.clientY - grabClientY);
  if (stageEl) {
    nx = Math.min(Math.max(nx, dragMinX), dragMaxX);
    ny = Math.min(Math.max(ny, dragMinY), dragMaxY);
  }
  x.value = nx;
  y.value = ny;
}

/** Tap (poke) her: one-shot cafe reaction, then back to idle. Animation only, no voice. */
function playTapReaction(): void {
  faceCamera();
  if (!hasClip(CAFE_REACTION)) {
    play(props.idleClip);
    return;
  }
  play(CAFE_REACTION, { loop: false, onEnd: () => play(props.idleClip) });
}

function onRelease(e: PointerEvent): void {
  if (e.pointerId !== activePointerId) return;
  const wasHeld = held;
  const wasTap = pending;
  pending = false;
  held = false;
  activePointerId = -1;
  const p = canvasLocal(e);
  petCursor.value = p && isPointerOnModel(p.x, p.y) ? 'grab' : 'crosshair';
  if (wasHeld) {
    // Dropped after a drag → set her down into a gacha'd armed Formation idle.
    faceCamera();
    play(pickArmedIdle());
  } else if (wasTap) {
    playTapReaction();
  }
}

function onCancel(e: PointerEvent): void {
  if (e.pointerId !== activePointerId) return;
  const wasHeld = held;
  pending = false;
  held = false;
  activePointerId = -1;
  petCursor.value = 'crosshair';
  if (wasHeld) {
    faceCamera();
    play(pickArmedIdle());
  }
}

useDocumentListener('pointermove', onDrag);
useDocumentListener('pointerup', onRelease);
useDocumentListener('pointercancel', onCancel);

let rafId = 0;
let lastTs = 0;
function step(ts: number): void {
  if (lastTs === 0) lastTs = ts;
  const dt = (ts - lastTs) / 1000;
  lastTs = ts;

  if (targetX.value !== null && targetY.value !== null) {
    const dx = targetX.value - x.value;
    const dy = targetY.value - y.value;
    const dist = Math.hypot(dx, dy);
    if (dist <= 2) {
      x.value = targetX.value;
      y.value = targetY.value;
      targetX.value = null;
      targetY.value = null;
      settleIdle();
    } else {
      // Armed walks (Move_Ing) cover ground faster than the Cafe stroll. Read live so
      // the test-page slider tunes it without a remount.
      const spd = armedWalk ? props.speed * props.armedSpeedMult : props.speed;
      const move = Math.min(dist, spd * dt);
      x.value += (dx / dist) * move;
      y.value += (dy / dist) * move;
      setFacing(dx, dy);
      if (!walking) {
        startWalk();
      } else if (armedWalk && !jumping && jumpAt >= 0) {
        walkElapsed += dt;
        if (walkElapsed >= jumpAt) doJump();
      }
    }
  }
  rafId = requestAnimationFrame(step);
}

// onMounted's play() is a no-op until the GLB loads, so kick off idle the moment
// the scene reports ready (unless the user already grabbed or sent her walking).
watch(ready, (isReady) => {
  if (!isReady) return;
  // Only strikers armed-walk (and only they have battle voice), so preload that pool now
  // that the clips are known — specials skip it and never request the 404'ing files.
  if (hasClip(MOVE_ING)) loadBattleLines();
  if (!held && targetX.value === null) {
    faceCamera();
    play(props.idleClip);
  }
});

// Orbit mode: enable inspection controls and switch the cursor; off restores the pet.
// Controls listen on the full-viewport stage (rootEl's positioned offsetParent) so
// drag/wheel works anywhere on the page, not just over the small canvas.
watch(
  () => props.orbit,
  (on) => {
    targetX.value = null; // cancel any in-flight walk when entering orbit
    targetY.value = null;
    walking = false;
    const stage = (rootEl.value?.offsetParent as HTMLElement | null) ?? undefined;
    setOrbitEnabled(on, stage);
    petCursor.value = on ? 'grab' : 'crosshair';
  },
);

// Live zoom (apparent size). Applies when not orbiting.
watch(() => props.zoom, (z) => setZoom(z));

// Idle chatter: gacha a cafe monolog on a randomized 20–40s cadence (avg ~30s), but only
// while genuinely idle and the tab is visible. Any interaction resets the clock (via the
// scheduleIdleVoice() calls in onGrab / startWalk), so she never chatters right after one.
const IDLE_VOICE_MIN_MS = 20_000;
const IDLE_VOICE_JITTER_MS = 20_000;
let idleVoiceTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleIdleVoice(): void {
  clearTimeout(idleVoiceTimer);
  idleVoiceTimer = setTimeout(
    onIdleVoiceTick,
    IDLE_VOICE_MIN_MS + Math.random() * IDLE_VOICE_JITTER_MS,
  );
}

function onIdleVoiceTick(): void {
  const idle = !walking && !held && !pending && targetX.value === null;
  if (idle && !document.hidden) playIdleMonolog();
  scheduleIdleVoice();
}

onMounted(() => {
  setZoom(props.zoom); // apply the initial size (the watch only fires on later changes)
  play(props.idleClip);
  scheduleIdleVoice();
  rafId = requestAnimationFrame(step);
});
onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  clearTimeout(idleVoiceTimer);
});
</script>

<template>
  <div ref="rootEl" class="chibi-pet" :style="{ transform: `translate(${x}px, ${y}px)` }">
    <canvas
      ref="canvasEl"
      class="chibi-pet__canvas"
      :class="{ 'chibi-pet__canvas--hidden': !ready || error }"
      :style="{ width: `${size}px`, height: `${size}px`, cursor: petCursor }"
      @pointerdown="onGrab"
      @pointermove="onHover"
    ></canvas>
    <!-- Shown until the GLB is loaded (first fetch can be a few MB) or if it fails. -->
    <div
      v-if="!ready || error"
      class="chibi-pet__status"
      :style="{ width: `${size}px`, height: `${size}px` }"
    >
      <span v-if="error" class="chibi-pet__status-icon">!</span>
      <span v-else class="chibi-pet__spinner"></span>
    </div>
  </div>
</template>

<style scoped>
.chibi-pet {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  /* Clicks fall through to the stage so anywhere-to-walk targeting works. */
  pointer-events: none;
}

.chibi-pet__canvas {
  position: relative;
  display: block;
  /* Only the canvas is interactive (grab to pick up); the wrapper stays click-through.
     The cursor is set inline (grab / crosshair / grabbing) from the alpha hit-test. */
  pointer-events: auto;
  touch-action: none;
}

.chibi-pet__canvas--hidden {
  visibility: hidden;
}

/* Loading / error overlay sits where the canvas will render. */
.chibi-pet__status {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.chibi-pet__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: chibi-spin 0.8s linear infinite;
}

.chibi-pet__status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 700;
  color: var(--background-primary);
  background: var(--accent-color);
}

@keyframes chibi-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
