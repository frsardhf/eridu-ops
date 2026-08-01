<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { usePreferredReducedMotion } from '@vueuse/core';
import { useChibi3dScene } from '@/composables/useChibi3dScene';
import { useDocumentListener } from '@/composables/dom/useDocumentListener';
import { useWindowResize } from '@/composables/dom/useWindowResize';
import { useChibiVoice } from '@/composables/useChibiVoice';

// Roaming-pet shell: click-to-walk, drag-to-pick-up, and gacha-on-release behaviour,
// driving a fixed-camera three.js canvas via useChibi3dScene (clip playback + model yaw
// for facing) plus useChibiVoice for the pickup/battle voice lines.
const props = withDefaults(
  defineProps<{
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
    /** Inspection orbit mode: pointer gestures control the camera and suspend pet gestures. */
    orbit?: boolean;
    /** Inspect mode: the canvas fills the positioned stage (wide, not square) so wide clips
     *  aren't cropped; the wrapper pins to the stage origin and gestures suspend. */
    inspect?: boolean;
    /** Highlights the rendered silhouette as a valid item drop target. */
    itemDropTarget?: boolean;
    /** Whether pointer movement can pick up and reposition the pet. */
    draggable?: boolean;
    /** Whether voice lines preload and play. */
    voice?: boolean;
    /** Whether the pet periodically chooses its own walking destination. */
    wander?: boolean;
    /** Accessible label for link-like activation on tap or keyboard input. */
    actionLabel?: string;
    /** Whether pet mode starts centered in its positioned stage. */
    centerOnMount?: boolean;
    /** Starting position in stage-local px (top-left of the sprite). */
    startX?: number;
    startY?: number;
  }>(),
  {
    size: 180,
    speed: 150,
    armedSpeedMult: 1.7,
    idleClip: 'Cafe_Idle',
    zoom: 1,
    orbit: false,
    inspect: false,
    itemDropTarget: false,
    draggable: true,
    voice: true,
    wander: false,
    actionLabel: '',
    centerOnMount: true,
    startX: 40,
    startY: 40,
  },
);

// Write the zoom back out when the orbit wheel dollies the camera, so a bound size slider
// (v-model:zoom) tracks the wheel instead of going stale.
const emit = defineEmits<{
  'update:zoom': [number];
  activate: [];
}>();

// Clip vocabulary (resolved against the loaded GLB; absent clips just no-op).
// Weapon state is the governing constraint: Cafe_* is unarmed, Formation_*/Move_* are
// armed. Idle and walk are always drawn from the SAME family so the gun never pops
// mid-loop: the only flips happen at a walk-start (striker gacha) or at pickup.
const CAFE_IDLE = 'Cafe_Idle'; // unarmed idle: the universal resting/spawn state
const CAFE_WALK = 'Cafe_Walk'; // unarmed walk: every unit has it
const CAFE_REACTION = 'Cafe_Reaction'; // one-shot played on a tap (poke), then back to idle
const MOVE_ING = 'Move_Ing'; // armed walk: strikers only; its presence == "is a striker"
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
const {
  status: voiceStatus,
  playPickup,
  playRecovery,
  playArmedMove,
  playIdleMonolog,
  loadBattleLines,
} = useChibiVoice(props.charId, props.voice);

const canvasEl = ref<HTMLCanvasElement | null>(null);
const {
  ready,
  error,
  clipNames,
  play,
  hasClip,
  setFacing,
  faceCamera,
  isPointerOnModel,
  getModelBoundsPx,
  setOrbitEnabled,
  setZoom,
  resize,
} = useChibi3dScene(canvasEl, {
  charId: props.charId,
  size: props.size,
  onZoomChange: (z) => emit('update:zoom', z),
});

const rootEl = ref<HTMLElement | null>(null);
const x = ref(props.startX);
const y = ref(props.startY);
const targetX = ref<number | null>(null);
const targetY = ref<number | null>(null);

// Rendered canvas dimensions. Square (= props.size) as a pet; Inspect fills the stage (wide).
const canvasW = ref(props.size);
const canvasH = ref(props.size);

type WalkSource = 'manual' | 'wander';

interface PetPositionBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const WANDER_DELAY_MIN_MS = 2_500;
const WANDER_DELAY_JITTER_MS = 4_500;
const WANDER_EDGE_PADDING = 12;
const preferredMotion = usePreferredReducedMotion();
let walkSource: WalkSource | null = null;
let wanderTimer: ReturnType<typeof setTimeout> | undefined;

function normalizeAxisBounds(min: number, max: number): [number, number] {
  if (min <= max) return [min, max];
  const midpoint = (min + max) / 2;
  return [midpoint, midpoint];
}

/** Bounds the canvas position by the visible student rather than its transparent padding. */
function getPetPositionBounds(stage: HTMLElement, padding = 0): PetPositionBounds {
  const modelBounds = getModelBoundsPx();
  const visibleBounds = modelBounds ?? {
    minX: 0,
    maxX: props.size,
    minY: 0,
    maxY: props.size,
  };
  const [minX, maxX] = normalizeAxisBounds(
    padding - visibleBounds.minX,
    stage.clientWidth - padding - visibleBounds.maxX,
  );
  const [minY, maxY] = normalizeAxisBounds(
    padding - visibleBounds.minY,
    stage.clientHeight - padding - visibleBounds.maxY,
  );
  return { minX, maxX, minY, maxY };
}

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
    if (props.voice) playArmedMove();
  } else {
    play(CAFE_WALK);
  }
}

/** Settle into the idle that matches the walk just finished (armed -> Formation, else Cafe). */
function settleIdle(): void {
  walking = false;
  jumping = false;
  walkSource = null;
  faceCamera();
  play(armedWalk ? pickArmedIdle() : CAFE_IDLE);
  scheduleWander();
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
const petCursor = ref(props.actionLabel ? 'default' : 'crosshair');

function cursorAtPoint(point: { x: number; y: number } | null): string {
  if (!point || !isPointerOnModel(point.x, point.y)) {
    return props.actionLabel ? 'default' : 'crosshair';
  }
  if (props.actionLabel || !props.draggable) return 'pointer';
  return 'grab';
}

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
    petCursor.value = cursorAtPoint(p);
  });
}

function setWalkTarget(nx: number, ny: number, source: WalkSource): void {
  clearTimeout(wanderTimer);
  targetX.value = nx;
  targetY.value = ny;
  walkSource = source;
}

/** Stops autonomous movement without cancelling a destination chosen by the user. */
function cancelWanderMovement(): void {
  clearTimeout(wanderTimer);
  if (walkSource !== 'wander') return;
  targetX.value = null;
  targetY.value = null;
  walkSource = null;
  walking = false;
  jumping = false;
  if (!ready.value || props.inspect) return;
  faceCamera();
  play(armedWalk ? pickArmedIdle() : props.idleClip);
}

/** Send the pet walking to a stage-local point (centres the sprite on it). */
function walkTo(px: number, py: number): void {
  setWalkTarget(px - props.size / 2, py - props.size / 2, 'manual');
}

/** Debug helper: stop moving and hold a specific clip facing the camera. */
function playClip(clip: string): void {
  clearTimeout(wanderTimer);
  targetX.value = null;
  targetY.value = null;
  walkSource = null;
  walking = false;
  jumping = false;
  faceCamera();
  play(clip);
  scheduleWander();
}

function modelPointAtClientPoint(
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const el = canvasEl.value;
  if (!el || !ready.value || error.value) return null;
  const rect = el.getBoundingClientRect();
  const point = { x: clientX - rect.left, y: clientY - rect.top };
  if (!isPointerOnModel(point.x, point.y)) return null;
  return point;
}

/** Whether a viewport point is over the rendered student silhouette. */
function canReceiveItemAt(clientX: number, clientY: number): boolean {
  return modelPointAtClientPoint(clientX, clientY) !== null;
}

/** Give an item at a viewport point, stopping movement and playing the recovery response. */
function giveItemAt(clientX: number, clientY: number): boolean {
  const point = modelPointAtClientPoint(clientX, clientY);
  if (!point) return false;

  scheduleIdleVoice();
  clearTimeout(wanderTimer);
  targetX.value = null;
  targetY.value = null;
  walkSource = null;
  walking = false;
  jumping = false;
  faceCamera();
  playRecovery();
  scheduleWander();
  return true;
}

defineExpose({ walkTo, playClip, canReceiveItemAt, giveItemAt, voiceStatus, clipNames });

// Tap vs drag: a press on her is `pending` until the pointer either travels past
// DRAG_THRESHOLD (-> commit to a pickup/drag) or releases in place (-> a tap plays the
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
  if (!ready.value || props.orbit) return; // orbit mode reserves pointer drags for the camera
  // Only react when the pointer is actually over Rio; misses bubble to the stage
  // (walk-there). The canvas is a big square, so a plain hit would grab the corners.
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  if (!isPointerOnModel(e.clientX - rect.left, e.clientY - rect.top)) return;
  e.stopPropagation();
  scheduleIdleVoice(); // touching her pushes the next monolog out
  clearTimeout(wanderTimer);
  // Arm a press: don't commit to pickup yet; a tap (no travel) becomes a reaction.
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
  walkSource = null;
  walking = false;
}

/** The press crossed the drag threshold -> pick her up (voice + held pickup pose). */
function commitDrag(): void {
  pending = false;
  held = true;
  petCursor.value = 'grabbing';
  // Bound the drag by her silhouette: canvas may overflow the stage so her body edges
  // reach every edge. minY = -bounds.minY lets her head touch the stage top.
  if (stageEl) {
    const bounds = getPetPositionBounds(stageEl);
    dragMinX = bounds.minX;
    dragMaxX = bounds.maxX;
    dragMinY = bounds.minY;
    dragMaxY = bounds.maxY;
  }
  faceCamera();
  if (props.voice) playPickup();
  play(FORM_PICKUP, { loop: true });
}

function onDrag(e: PointerEvent): void {
  if (e.pointerId !== activePointerId) return;
  if (!props.draggable) {
    if (
      pending &&
      Math.hypot(e.clientX - startClientX, e.clientY - startClientY) >= DRAG_THRESHOLD
    ) {
      pending = false;
    }
    return;
  }
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
  petCursor.value = cursorAtPoint(p);
  if (wasHeld) {
    // Dropped after a drag -> set her down into a gacha'd armed Formation idle.
    faceCamera();
    play(pickArmedIdle());
  } else if (wasTap) {
    if (props.actionLabel) emit('activate');
    else playTapReaction();
  }
  scheduleWander();
}

function onCancel(e: PointerEvent): void {
  if (e.pointerId !== activePointerId) return;
  const wasHeld = held;
  pending = false;
  held = false;
  activePointerId = -1;
  petCursor.value = props.actionLabel ? 'default' : 'crosshair';
  if (wasHeld) {
    faceCamera();
    play(pickArmedIdle());
  }
  scheduleWander();
}

useDocumentListener('pointermove', onDrag);
useDocumentListener('pointerup', onRelease);
useDocumentListener('pointercancel', onCancel);
useDocumentListener('visibilitychange', () => {
  if (document.hidden) cancelWanderMovement();
  else scheduleWander(1_200);
});

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

function canWanderNow(): boolean {
  return (
    props.wander &&
    preferredMotion.value !== 'reduce' &&
    !document.hidden &&
    ready.value &&
    !error.value &&
    !held &&
    !pending &&
    !props.orbit &&
    !props.inspect &&
    targetX.value === null &&
    (hasClip(CAFE_WALK) || hasClip(MOVE_ING))
  );
}

function scheduleWander(delay?: number): void {
  clearTimeout(wanderTimer);
  if (!canWanderNow()) return;
  wanderTimer = setTimeout(
    () => {
      if (!canWanderNow()) return;
      const stage = rootEl.value?.offsetParent as HTMLElement | null;
      if (!stage) return;
      const bounds = getPetPositionBounds(stage, WANDER_EDGE_PADDING);
      setWalkTarget(
        bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
        bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
        'wander',
      );
    },
    delay ?? WANDER_DELAY_MIN_MS + Math.random() * WANDER_DELAY_JITTER_MS,
  );
}

// onMounted's play() is a no-op until the GLB loads, so kick off idle the moment
// the scene reports ready (unless the user already grabbed or sent her walking).
watch(ready, (isReady) => {
  if (!isReady) return;
  // Only strikers armed-walk (and only they have battle voice), so preload that pool now
  // that the clips are known: specials skip it and never request the 404'ing files.
  if (props.voice && hasClip(MOVE_ING)) loadBattleLines();
  if (!held && targetX.value === null) {
    faceCamera();
    play(props.idleClip);
  }
  scheduleWander(1_200);
});

watch(
  () => props.wander,
  (enabled) => {
    if (enabled) scheduleWander(1_200);
    else cancelWanderMovement();
  },
);

watch(preferredMotion, (motion) => {
  if (motion === 'reduce') cancelWanderMovement();
  else scheduleWander(1_200);
});

// Live zoom (apparent size). Applies when not orbiting.
watch(
  () => props.zoom,
  (z) => {
    setZoom(z);
    if (walkSource === 'wander') cancelWanderMovement();
    requestAnimationFrame(() => scheduleWander(1_200));
  },
);

// Canvas layout. Inspect fills the positioned stage (wide aspect) pinned to its origin, so
// wide clips render uncropped; otherwise it's the square `size` centred in the stage. Any
// in-flight walk is cancelled; Inspect suspends pet gestures anyway.
function applyLayout(): void {
  clearTimeout(wanderTimer);
  targetX.value = null;
  targetY.value = null;
  walkSource = null;
  walking = false;
  jumping = false;
  const parent = rootEl.value?.offsetParent as HTMLElement | null;
  if (props.inspect) {
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    canvasW.value = w;
    canvasH.value = h;
    x.value = 0;
    y.value = 0;
    resize(w, h);
  } else {
    canvasW.value = props.size;
    canvasH.value = props.size;
    resize(props.size, props.size);
    if (parent && props.centerOnMount) {
      x.value = Math.round((parent.clientWidth - props.size) / 2);
      y.value = Math.round((parent.clientHeight - props.size) / 2);
    }
  }
  scheduleWander(1_200);
}
watch(() => props.inspect, applyLayout);
watch(
  () => props.size,
  () => {
    if (!props.inspect) applyLayout();
  },
);
// Keep the Inspect canvas matched to the viewport as it resizes (no-op in pet mode).
useWindowResize(() => {
  if (props.inspect) {
    applyLayout();
    return;
  }
  cancelWanderMovement();
  const stage = rootEl.value?.offsetParent as HTMLElement | null;
  if (stage) {
    const bounds = getPetPositionBounds(stage, WANDER_EDGE_PADDING);
    x.value = Math.min(Math.max(x.value, bounds.minX), bounds.maxX);
    y.value = Math.min(Math.max(y.value, bounds.minY), bounds.maxY);
  }
  scheduleWander(1_200);
});

// Orbit mode: enable inspection controls and switch the cursor; off restores the pet.
// Controls listen on the full-viewport stage (rootEl's positioned offsetParent) so
// drag/wheel works anywhere on the page, not just over the small canvas. Registered AFTER
// the zoom/size watchers so that when several props flip together (Inspect toggling orbit +
// zoom + size in one tick) the pulled-back framing is applied before OrbitControls latch onto
// the camera; otherwise orbit would start from the tight pet distance.
watch(
  () => props.orbit,
  (on) => {
    clearTimeout(wanderTimer);
    targetX.value = null; // cancel any in-flight walk when entering orbit
    targetY.value = null;
    walkSource = null;
    walking = false;
    jumping = false;
    const stage = (rootEl.value?.offsetParent as HTMLElement | null) ?? undefined;
    setOrbitEnabled(on, stage);
    petCursor.value = on ? 'grab' : 'crosshair';
    if (!on) scheduleWander(1_200);
  },
);

// Idle chatter: gacha a cafe monolog on a randomized 20–40s cadence (avg ~30s), but only
// while genuinely idle and the tab is visible. Any interaction resets the clock (via the
// scheduleIdleVoice() calls in onGrab / startWalk), so she never chatters right after one.
const IDLE_VOICE_MIN_MS = 20_000;
const IDLE_VOICE_JITTER_MS = 20_000;
let idleVoiceTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleIdleVoice(): void {
  clearTimeout(idleVoiceTimer);
  if (!props.voice) return;
  idleVoiceTimer = setTimeout(
    onIdleVoiceTick,
    IDLE_VOICE_MIN_MS + Math.random() * IDLE_VOICE_JITTER_MS,
  );
}

function onIdleVoiceTick(): void {
  const idle = !walking && !held && !pending && targetX.value === null;
  if (props.voice && idle && !document.hidden) playIdleMonolog();
  if (props.voice) scheduleIdleVoice();
}

onMounted(() => {
  // Apply the current inspect/zoom/orbit state directly: the watchers are change-only, so a
  // mount that already starts in Inspect (e.g. switching character while Inspect is on, which
  // remounts via :key) would otherwise never fill the canvas or enable orbit. Order mirrors the
  // watchers: layout/aspect, then zoom pull-back, then orbit latches onto the framed camera.
  // In pet mode, applyLayout centres normal viewer pets while landing-link pets preserve their
  // explicit startX/startY position.
  applyLayout();
  setZoom(props.zoom);
  if (props.orbit) {
    const stage = (rootEl.value?.offsetParent as HTMLElement | null) ?? undefined;
    setOrbitEnabled(true, stage);
    petCursor.value = 'grab';
  }
  play(props.idleClip);
  scheduleIdleVoice();
  rafId = requestAnimationFrame(step);
});
onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  clearTimeout(idleVoiceTimer);
  clearTimeout(wanderTimer);
});
</script>

<template>
  <div
    ref="rootEl"
    class="chibi-pet"
    :class="{
      'chibi-pet--item-target': itemDropTarget,
      'chibi-pet--action': actionLabel,
    }"
    :data-action-label="actionLabel || undefined"
    :style="{ transform: `translate(${x}px, ${y}px)` }"
  >
    <canvas
      ref="canvasEl"
      class="chibi-pet__canvas"
      :class="{ 'chibi-pet__canvas--hidden': !ready || error }"
      :style="{ width: `${canvasW}px`, height: `${canvasH}px`, cursor: petCursor }"
      :role="actionLabel ? 'link' : undefined"
      :tabindex="actionLabel ? 0 : undefined"
      :aria-label="actionLabel || undefined"
      @pointerdown="onGrab"
      @pointermove="onHover"
      @keydown.enter.prevent="emit('activate')"
      @keydown.space.prevent="emit('activate')"
    ></canvas>
    <!-- Shown until the GLB is loaded (first fetch can be a few MB) or if it fails. -->
    <div
      v-if="!ready || error"
      class="chibi-pet__status"
      :style="{ width: `${canvasW}px`, height: `${canvasH}px` }"
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
  z-index: 1;
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

.chibi-pet--item-target .chibi-pet__canvas {
  filter: drop-shadow(0 0 8px var(--accent-color));
}

.chibi-pet--action::after {
  content: attr(data-action-label);
  position: absolute;
  left: 50%;
  bottom: 8px;
  z-index: 2;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--card-background);
  color: var(--text-primary);
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, 4px);
  transition:
    opacity var(--motion-duration-fast),
    transform var(--motion-duration-fast);
  pointer-events: none;
}

.chibi-pet--action:hover::after,
.chibi-pet--action:focus-within::after {
  opacity: 1;
  transform: translate(-50%, 0);
}

.chibi-pet--action .chibi-pet__canvas:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -12px;
  border-radius: 24px;
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
