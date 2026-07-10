import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ChibiManifest, ChibiMouthEvent } from '@/types/chibi';
import {
  getChibi3dManifestUrl,
  getChibi3dModelUrl,
  getChibi3dTextureUrl,
} from '@/lib/utils/iconUtils';
import {
  type MouthUniforms,
  type HaloFollower,
  FOV_DEG,
  CAM_TARGET_Y,
  CAM_ORBIT_DISTANCE,
  CHIBI_ZOOM_MIN,
  CHIBI_ZOOM_MAX,
  positionBaseCamera,
  bareClipName,
  makeGradient,
  loadTexture,
  driveMouth,
  applyManifestMaterials,
  addSceneLights,
  disposeSubtree,
  makeHaloFollower,
  updateHaloFollower,
} from '@/composables/chibi3dCore';

/**
 * Live-3D chibi renderer (roaming-pet scene): the Vue port of the deliverable POC's
 * `poc/index.html`. Owns a fixed-camera WebGL scene drawn into a transparent canvas: loads one
 * character GLB + manifest (materials / halo / mouth via chibi3dCore), plays clips through an
 * AnimationMixer, drives the mouth timeline, and runs the halo spring. The roaming-pet behaviour
 * (walk / drag / gacha) lives in the component; this composable is rendering + imperative controls
 * (`play` / `setFacing` / `faceCamera` / orbit / zoom / resize) plus `ready` / `error` state.
 */

interface PlayOptions {
  /** Loop the clip (default) or play once and clamp on the final frame. */
  loop?: boolean;
  /** Fired once when a non-looping clip finishes (e.g. Victory_Start -> Victory_End). */
  onEnd?: () => void;
}

interface Chibi3dSceneOptions {
  /** Character folder id, e.g. `ch0158`. */
  charId: string;
  /** Rendered canvas size in px (square). */
  size: number;
  /** Reports the effective zoom back out when the orbit wheel dollies the camera, so a
   *  bound size slider stays in sync. Fires only on real distance changes (not rotation). */
  onZoomChange?: (zoom: number) => void;
}

export function useChibi3dScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  opts: Chibi3dSceneOptions,
) {
  const ready = ref(false);
  const error = ref(false);
  const clipNames = ref<string[]>([]); // bare clip names in the loaded GLB (debug dropdown)

  // three objects, kept out of Vue reactivity (no `ref`: these never render as data).
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let root: THREE.Object3D | null = null;
  let mixer: THREE.AnimationMixer | null = null;
  let currentAction: THREE.AnimationAction | null = null;
  let haloFollower: HaloFollower | null = null;
  let mouthUniforms: MouthUniforms | null = null;
  let grad: THREE.DataTexture | null = null;
  let controls: OrbitControls | null = null; // inspection-only orbit; off = fixed pet camera
  let currentZoom = 1; // dolly factor: >1 = closer/bigger; the framing orbit restores to
  // Live canvas pixel dimensions. Square for the pet; the page's Inspect mode fills the
  // viewport (wide), so width/height diverge and the camera aspect tracks them.
  let curW = opts.size;
  let curH = opts.size;

  const clipsByName = new Map<string, THREE.AnimationClip>(); // bare name -> clip
  let mouthByClip: Record<string, ChibiMouthEvent[]> = {};
  let currentMouth: ChibiMouthEvent[] = [];
  let pendingOnEnd: (() => void) | null = null;

  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;

  function setupRenderer(canvas: HTMLCanvasElement): void {
    // preserveDrawingBuffer lets isPointerOnModel read back the rendered frame for a
    // pixel-accurate (alpha) grab hit-test; negligible cost for a single chibi.
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    // Supersample: render at SSx the canvas resolution and let the browser downscale,
    // so the model stays crisp in a small canvas (the POC looks sharper only because it
    // renders into the whole window: far more pixels on the same model). 2x is plenty
    // for one chibi; raise toward 3 for more, lower if it ever costs frames.
    const SUPERSAMPLE = 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * SUPERSAMPLE);
    renderer.setSize(curW, curH, false);
    renderer.setClearColor(0x000000, 0); // transparent: the pet floats over the page
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV_DEG, curW / curH, 0.01, 100);
    applyBaseCamera();
    addSceneLights(scene);
  }

  async function loadCharacter(): Promise<void> {
    const { charId } = opts;
    let manifest: ChibiManifest;
    try {
      const res = await fetch(getChibi3dManifestUrl(charId));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      manifest = (await res.json()) as ChibiManifest;
    } catch {
      error.value = true;
      return;
    }

    const gltf = await new Promise<{
      scene: THREE.Object3D;
      animations: THREE.AnimationClip[];
    } | null>((resolve) => {
      new GLTFLoader().load(
        getChibi3dModelUrl(charId, manifest.model),
        (g) => resolve(g),
        undefined,
        () => resolve(null),
      );
    });
    if (!gltf || disposed || !scene) {
      if (!gltf) error.value = true;
      return;
    }

    root = gltf.scene;
    root.rotation.y = Math.PI; // model's default forward points away -> face the camera
    scene.add(root);

    // External mouth textures (the only maps glTF can't carry; base maps are embedded).
    const em = manifest.materials.EyeMouth?.textures ?? {};
    const atlas = em.mouthAtlas
      ? await loadTexture(getChibi3dTextureUrl(charId, em.mouthAtlas))
      : null;
    const mask = em.mouthMask
      ? await loadTexture(getChibi3dTextureUrl(charId, em.mouthMask), false)
      : null;
    if (disposed) return;

    grad = makeGradient();
    mouthUniforms = applyManifestMaterials(root, manifest, atlas, mask, grad);
    haloFollower = makeHaloFollower(root, scene); // detach + drive with the FxFollower spring

    mixer = new THREE.AnimationMixer(root);
    mixer.addEventListener('finished', () => {
      const cb = pendingOnEnd;
      pendingOnEnd = null;
      cb?.();
    });
    clipsByName.clear();
    for (const clip of gltf.animations) clipsByName.set(bareClipName(clip.name), clip);
    clipNames.value = [...clipsByName.keys()].sort();
    mouthByClip = manifest.mouth ?? {};

    ready.value = true;
  }

  /** Whether the loaded GLB contains a clip (by logical/bare name). Drives pet behaviour
   *  off real clips, not the unreliable manifest `petClips` (e.g. striker = has Move_Ing). */
  function hasClip(name: string): boolean {
    return resolveClip(name) !== null;
  }

  function resolveClip(name: string): THREE.AnimationClip | null {
    const want = bareClipName(name).toLowerCase();
    if (clipsByName.has(bareClipName(name))) return clipsByName.get(bareClipName(name))!;
    for (const [k, v] of clipsByName) if (k.toLowerCase() === want) return v;
    return null;
  }

  /** Play a clip by its (logical / manifest) name. Looping clips don't restart if already active. */
  function play(name: string, options: PlayOptions = {}): void {
    if (!mixer) return;
    const clip = resolveClip(name);
    if (!clip) return;
    const loop = options.loop ?? true;
    if (loop && currentAction?.getClip() === clip && currentAction.isRunning()) return;

    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset();
    if (loop) {
      action.setLoop(THREE.LoopRepeat, Infinity);
    } else {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
    action.play();
    currentAction = action;
    pendingOnEnd = loop ? null : (options.onEnd ?? null);
    currentMouth = mouthByClip[bareClipName(name)] ?? [];
  }

  const _pixel = new Uint8Array(4);
  /**
   * True if a pointer at canvas-local px `(localX, localY)` (0..size) is over Rio's
   * opaque pixels: an alpha hit-test against the rendered frame, so the pet only
   * grabs on her actual silhouette, not the empty corners of the square canvas.
   * (Raycasting the animated SkinnedMesh is unreliable; reading the pixel isn't.)
   * Misses fall through to the stage (walk) in the component.
   */
  function isPointerOnModel(localX: number, localY: number): boolean {
    if (!renderer) return false;
    const gl = renderer.getContext();
    const ratio = renderer.getPixelRatio();
    const px = Math.floor(localX * ratio);
    const py = Math.floor((curH - localY) * ratio); // WebGL origin is bottom-left
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _pixel);
    return _pixel[3] > 16; // alpha: >0-ish means a model pixel was drawn here
  }

  const _box = new THREE.Box3();
  const _corner = new THREE.Vector3();
  /**
   * Rio's current bounding box projected into canvas-local px (0..size): the rect her
   * silhouette occupies inside the big square canvas. The component clamps drags by
   * this (not the canvas box) so her head/feet/sides can reach the stage edges while
   * the empty canvas padding overflows off-screen. Halo excluded (it lives in the
   * scene, not under root), so it's free to clip past the top edge like in-game.
   */
  function getModelBoundsPx(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!root || !camera) return null;
    _box.setFromObject(root);
    if (_box.isEmpty()) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 8; i++) {
      _corner.set(
        i & 1 ? _box.max.x : _box.min.x,
        i & 2 ? _box.max.y : _box.min.y,
        i & 4 ? _box.max.z : _box.min.z,
      );
      _corner.project(camera);
      const cx = (_corner.x * 0.5 + 0.5) * curW;
      const cy = (0.5 - _corner.y * 0.5) * curH;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
    }
    return { minX, minY, maxX, maxY };
  }

  // Screen movement vector -> model yaw. Screen +x = right, +y = down (toward
  // viewer); yaw = atan2(-dx,-dy) so "down" faces the camera (yaw pi), "up" faces
  // away (yaw 0), and left/right turn in profile. Calibrate against the model.
  function setFacing(dx: number, dy: number): void {
    if (!root || (dx === 0 && dy === 0)) return;
    root.rotation.y = Math.atan2(-dx, -dy);
  }

  /** Face the camera (the idle/reaction resting pose). */
  function faceCamera(): void {
    if (root) root.rotation.y = Math.PI;
  }

  function applyBaseCamera(): void {
    if (camera) positionBaseCamera(camera, currentZoom);
  }

  /**
   * Zoom = apparent size: >1 dollies the camera closer so she fills more of the canvas
   * (no canvas resize, no extra render cost). When not orbiting it re-frames the fixed pet
   * camera; while orbiting it dollies along the current view direction (keeping the orbit
   * angle) so a size slider works in both modes. The wheel also dollies during orbit.
   */
  function setZoom(zoom: number): void {
    currentZoom = Math.min(CHIBI_ZOOM_MAX, Math.max(CHIBI_ZOOM_MIN, zoom));
    if (controls?.enabled && camera) {
      const wantDist = CAM_ORBIT_DISTANCE / currentZoom;
      // Skip if already there: this is what breaks the wheel -> onZoomChange -> prop -> setZoom
      // feedback loop (the written-back value maps straight back to the current distance).
      if (Math.abs(camera.position.distanceTo(controls.target) - wantDist) < 1e-3) return;
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, wantDist);
      controls.update();
    } else {
      applyBaseCamera();
    }
  }

  // Orbit wheel/pan changed the camera distance: derive the zoom and report it out (rotation
  // leaves distance unchanged, so those changes are filtered by the epsilon check).
  function onControlsChange(): void {
    if (!camera || !controls) return;
    const z = CAM_ORBIT_DISTANCE / camera.position.distanceTo(controls.target);
    if (Math.abs(z - currentZoom) < 1e-4) return;
    currentZoom = z;
    opts.onZoomChange?.(z);
  }

  /**
   * Resize the canvas + render target to `w` x `h` px and match the camera aspect. The pet
   * passes a square (w == h); the page's Inspect mode passes the full viewport (wide), which
   * widens the horizontal field of view so furniture/event clips aren't cropped sideways.
   */
  function resize(w: number, h: number): void {
    curW = Math.max(1, Math.round(w));
    curH = Math.max(1, Math.round(h));
    renderer?.setSize(curW, curH, false);
    if (camera) {
      camera.aspect = curW / curH;
      camera.updateProjectionMatrix();
    }
  }

  /**
   * Inspection-only orbit (the POC's OrbitControls). On: drag to spin / wheel to zoom the
   * camera; the component suspends pet gestures so they don't collide. `domElement` is the input
   * surface: pass the full-viewport stage so orbit works anywhere. Off: restore the pet camera.
   */
  function setOrbitEnabled(on: boolean, domElement?: HTMLElement): void {
    if (!renderer || !camera) return;
    if (on) {
      if (!controls) {
        controls = new OrbitControls(camera, domElement ?? renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, CAM_TARGET_Y, 0);
        // Clamp the wheel dolly to the same range as the size slider (distance = orbit dist / zoom).
        controls.minDistance = CAM_ORBIT_DISTANCE / CHIBI_ZOOM_MAX;
        controls.maxDistance = CAM_ORBIT_DISTANCE / CHIBI_ZOOM_MIN;
        controls.addEventListener('change', onControlsChange);
      }
      controls.enabled = true;
    } else if (controls) {
      controls.enabled = false;
      applyBaseCamera();
    }
  }

  function tick(): void {
    if (disposed) return;
    rafId = requestAnimationFrame(tick);
    if (controls?.enabled) controls.update();
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    if (currentAction) driveMouth(mouthUniforms, currentMouth, currentAction.time);
    updateHaloFollower(haloFollower); // after mixer.update so the head bone is current
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function dispose(): void {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    mixer?.stopAllAction();
    controls?.removeEventListener('change', onControlsChange);
    controls?.dispose();
    controls = null;
    grad?.dispose();
    // External mouth textures live in the eyemouth uniforms, not on a material, so the
    // generic material-texture sweep below won't reach them: dispose them here.
    mouthUniforms?.uMouthTex.value?.dispose();
    mouthUniforms?.uMouthMask.value?.dispose();
    if (root) disposeSubtree(root);
    // The halo was reparented out of `root` onto the scene, so it needs its own sweep.
    if (haloFollower) disposeSubtree(haloFollower.halo);
    renderer?.dispose();
    renderer?.forceContextLoss(); // release the WebGL context; dispose() alone doesn't
    renderer = null;
    scene = null;
    camera = null;
    root = null;
    mixer = null;
    currentAction = null;
    haloFollower = null;
    mouthUniforms = null;
    currentMouth = [];
  }

  onMounted(async () => {
    const canvas = canvasRef.value;
    if (!canvas) {
      error.value = true;
      return;
    }
    setupRenderer(canvas);
    rafId = requestAnimationFrame(tick);
    await loadCharacter();
  });
  onBeforeUnmount(dispose);

  return {
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
  };
}
