import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  ChibiManifest,
  ChibiMouthEvent,
  ChibiFurnitureConfig,
  ChibiScenesConfig,
} from '@/types/chibi';
import {
  getChibi3dManifestUrl,
  getChibi3dModelUrl,
  getChibi3dTextureUrl,
  getChibi3dFurnitureUrl,
  getChibi3dScenesUrl,
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
  applyToonMaterials,
  addSceneLights,
  disposeSubtree,
  makeHaloFollower,
  updateHaloFollower,
} from '@/composables/chibi3dCore';

/**
 * Live-3D chibi interaction scene (the Vue port of the deliverable POC's `poc/furniture.html`,
 * furniture branch): a multi-object orbit scene that seats one or more characters at a furniture
 * GLB and plays their cafe-interaction clips against it. The furniture animation is the master
 * clock; each character's clip syncs to it (`time % duration`). Per-furniture overrides
 * (rotation, per-variant character visibility / solo split) come from `scenes.json`.
 *
 * The camera / orbit / zoom / resize block mirrors `useChibi3dScene` (same fixed framing + wheel
 * clamp), minus the roaming-pet pixel hit-test which this inspection-only surface never needs.
 */

interface InteractionSceneOptions {
  /** Candidate character ids to consider for scenes (those with a matching interaction clip). */
  charIds: readonly string[];
  /** Reports the effective zoom back out when the orbit wheel dollies the camera. */
  onZoomChange?: (zoom: number) => void;
}

interface LoadedChar {
  cid: string;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction | null;
  clipsByBase: Map<string, THREE.AnimationClip>;
  mouthUniforms: MouthUniforms | null;
  mouthByClip: Record<string, ChibiMouthEvent[]>;
  currentMouth: ChibiMouthEvent[];
  halo: HaloFollower | null;
  atlas: THREE.Texture | null;
  mask: THREE.Texture | null;
}

interface LoadedFurniture {
  label: string;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  clipsByBase: Map<string, THREE.AnimationClip>;
}

interface Option {
  value: string;
  label: string;
}

export function useChibi3dInteractionScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  opts: InteractionSceneOptions,
) {
  const ready = ref(false);
  const error = ref(false);
  const furnitureOptions = ref<Option[]>([]); // furniture scenes with at least one matching char
  const clipOptions = ref<Option[]>([]); // interaction-clip variants for the current furniture
  const currentClip = ref(''); // the playing variant (mirrors the clip picker's value)

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let controls: OrbitControls | null = null;
  let grad: THREE.DataTexture | null = null;
  let currentZoom = 1;
  let curW = 1;
  let curH = 1;

  let furnCfgAll: Record<string, ChibiFurnitureConfig> = {};
  const charsByFurniture = new Map<string, string[]>(); // label -> cids with a matching clip

  let chars: LoadedChar[] = [];
  let furniture: LoadedFurniture | null = null;

  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;
  let loadToken = 0; // guards against a stale scene load resolving after a newer one

  const loader = new GLTFLoader();
  function loadGltf(url: string) {
    return new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] } | null>(
      (resolve) =>
        loader.load(
          url,
          (g) => resolve(g),
          undefined,
          () => resolve(null),
        ),
    );
  }

  function setupRenderer(canvas: HTMLCanvasElement): void {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * 2);
    renderer.setSize(curW, curH, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV_DEG, curW / curH, 0.01, 100);
    applyBaseCamera();
    addSceneLights(scene);
    grad = makeGradient();
  }

  /** Fetch scenes.json + every candidate char manifest to learn which chars each furniture has. */
  async function buildSceneCatalog(): Promise<void> {
    let config: ChibiScenesConfig = {};
    try {
      const res = await fetch(getChibi3dScenesUrl());
      if (res.ok) config = (await res.json()) as ChibiScenesConfig;
    } catch {
      // scenes.json is optional: without it we fall back to no curated overrides.
    }
    furnCfgAll = config.furniture ?? {};

    // Per-char interaction clip keys, read from the manifest mouth map (cheap JSON).
    const keysByCid = new Map<string, string[]>();
    await Promise.all(
      opts.charIds.map(async (cid) => {
        try {
          const res = await fetch(getChibi3dManifestUrl(cid));
          if (!res.ok) return;
          const m = (await res.json()) as ChibiManifest;
          keysByCid.set(cid, Object.keys(m.mouth ?? {}));
        } catch {
          // A missing manifest just excludes that char from scenes.
        }
      }),
    );

    const options: Option[] = [];
    for (const label of Object.keys(furnCfgAll)) {
      const matched = opts.charIds.filter((cid) =>
        (keysByCid.get(cid) ?? []).some((k) => k.toLowerCase().includes(label.toLowerCase())),
      );
      if (!matched.length) continue; // no character has a clip for this furniture -> skip
      charsByFurniture.set(label, matched);
      options.push({ value: label, label });
    }
    furnitureOptions.value = options;
  }

  async function loadChar(cid: string): Promise<LoadedChar | null> {
    if (!scene || !grad) return null;
    let manifest: ChibiManifest;
    try {
      const res = await fetch(getChibi3dManifestUrl(cid));
      if (!res.ok) return null;
      manifest = (await res.json()) as ChibiManifest;
    } catch {
      return null;
    }
    const gltf = await loadGltf(getChibi3dModelUrl(cid, manifest.model));
    if (!gltf || !scene || !grad) return null;

    const root = gltf.scene;
    root.rotation.y = Math.PI; // face the camera (furniture autoflip)
    scene.add(root);

    const em = manifest.materials.EyeMouth?.textures ?? {};
    const atlas = em.mouthAtlas
      ? await loadTexture(getChibi3dTextureUrl(cid, em.mouthAtlas))
      : null;
    const mask = em.mouthMask
      ? await loadTexture(getChibi3dTextureUrl(cid, em.mouthMask), false)
      : null;
    const mouthUniforms = applyManifestMaterials(root, manifest, atlas, mask, grad);
    const halo = makeHaloFollower(root, scene);

    const mixer = new THREE.AnimationMixer(root);
    const clipsByBase = new Map<string, THREE.AnimationClip>();
    for (const clip of gltf.animations) clipsByBase.set(bareClipName(clip.name), clip);

    return {
      cid,
      root,
      mixer,
      action: null,
      clipsByBase,
      mouthUniforms,
      mouthByClip: manifest.mouth ?? {},
      currentMouth: [],
      halo,
      atlas,
      mask,
    };
  }

  async function loadFurniture(label: string): Promise<LoadedFurniture | null> {
    if (!scene || !grad) return null;
    const gltf = await loadGltf(getChibi3dFurnitureUrl(label));
    if (!gltf || !scene || !grad) return null;
    const root = gltf.scene;
    applyToonMaterials(root, grad);
    // Face-camera rotation (per-furniture; default 180deg like the POC's world flip).
    root.rotation.y = ((furnCfgAll[label]?.ry ?? 180) * Math.PI) / 180;
    scene.add(root);
    const mixer = gltf.animations.length ? new THREE.AnimationMixer(root) : null;
    const clipsByBase = new Map<string, THREE.AnimationClip>();
    for (const clip of gltf.animations) clipsByBase.set(bareClipName(clip.name), clip);
    return { label, root, mixer, action: null, clipsByBase };
  }

  function clearScene(): void {
    for (const ch of chars) {
      if (scene) scene.remove(ch.root);
      disposeSubtree(ch.root);
      if (ch.halo && scene) scene.remove(ch.halo.halo);
      if (ch.halo) disposeSubtree(ch.halo.halo);
      ch.mixer.stopAllAction();
      ch.atlas?.dispose();
      ch.mask?.dispose();
    }
    chars = [];
    if (furniture) {
      if (scene) scene.remove(furniture.root);
      disposeSubtree(furniture.root);
      furniture.mixer?.stopAllAction();
      furniture = null;
    }
  }

  /** Load a furniture scene: its GLB + every matching character, then play the default variant. */
  async function loadScene(label: string): Promise<void> {
    const token = ++loadToken;
    ready.value = false;
    error.value = false;
    clearScene();

    const cids = charsByFurniture.get(label) ?? [];
    furniture = await loadFurniture(label);
    const loaded = await Promise.all(cids.map(loadChar));
    if (disposed || token !== loadToken) return; // a newer load superseded this one
    if (!furniture) {
      error.value = true;
      return;
    }
    chars = loaded.filter((c): c is LoadedChar => c !== null);

    clipOptions.value = buildClipOptions(label);
    const def = defaultClip(label, clipOptions.value);
    if (def) playScene(def);
    ready.value = true;
  }

  /** Furniture clip variants (non-idle), expanding `solo` variants into one entry per character. */
  function buildClipOptions(label: string): Option[] {
    if (!furniture) return [];
    const cfg = furnCfgAll[label];
    const bases = [...furniture.clipsByBase.keys()].filter((b) => !/_Idle$/i.test(b)).sort();
    const options: Option[] = [];
    for (const b of bases) {
      const v = b.match(/_(\d+)$/)?.[1];
      // Furniture is already chosen in the top picker, so label by the variant number alone.
      const friendly = v ? `Variant ${v}` : b;
      const solo = cfg?.solo && v ? cfg.solo[v] : null;
      if (solo) {
        for (const cid of solo) {
          if (chars.some((c) => c.cid === cid))
            options.push({ value: `${b}@${cid}`, label: `${friendly} · ${cid}` });
        }
      } else {
        options.push({ value: b, label: friendly });
      }
    }
    return options;
  }

  /** Prefer the "all characters" variant (unrestricted, non-solo); else the last option. */
  function defaultClip(label: string, options: Option[]): string | undefined {
    const cfg = furnCfgAll[label];
    const restricted = (b: string): boolean => {
      const v = b.match(/_(\d+)$/)?.[1];
      return !!((cfg?.show && v && cfg.show[v]) || (cfg?.solo && v && cfg.solo[v]));
    };
    const open = options.filter((o) => !o.value.includes('@') && !restricted(o.value));
    return (open.length ? open : options).slice(-1)[0]?.value;
  }

  /**
   * Play a furniture interaction variant. `sel` is a furniture clip base, or `base@cid` for a
   * solo variant. The furniture plays its clip; each character plays the clip matching the same
   * interaction (same variant preferred), and per-variant `show`/`solo` sets who's visible.
   */
  function playScene(sel: string): void {
    if (!furniture?.mixer) return;
    currentClip.value = sel;
    furniture.mixer.stopAllAction();
    const [furnBase, soloCid] = sel.split('@');
    const fc = furniture.clipsByBase.get(furnBase);
    if (fc) {
      furniture.action = furniture.mixer.clipAction(fc);
      furniture.action.reset().play();
    }
    const core = furnBase.replace(/_(\d+|Idle)$/i, '').toLowerCase();
    const v = furnBase.match(/_(\d+)$/)?.[1];
    const cfg = furnCfgAll[furniture.label];
    const showList = soloCid ? [soloCid] : cfg?.show && v && v in cfg.show ? cfg.show[v] : null;

    for (const ch of chars) {
      ch.mixer.stopAllAction();
      const keys = [...ch.clipsByBase.keys()];
      const cb =
        keys.find((b) => b.toLowerCase().includes(core) && (!v || b.endsWith(`_${v}`))) ??
        keys.find((b) => b.toLowerCase().includes(core));
      if (cb) {
        ch.action = ch.mixer.clipAction(ch.clipsByBase.get(cb)!);
        ch.action.reset().play();
        ch.currentMouth = ch.mouthByClip[cb] ?? [];
      } else {
        ch.action = null;
        ch.currentMouth = [];
      }
      ch.root.visible = !showList || showList.includes(ch.cid);
    }
  }

  function applyBaseCamera(): void {
    if (camera) positionBaseCamera(camera, currentZoom);
  }

  function setZoom(zoom: number): void {
    currentZoom = Math.min(CHIBI_ZOOM_MAX, Math.max(CHIBI_ZOOM_MIN, zoom));
    if (controls?.enabled && camera) {
      const wantDist = CAM_ORBIT_DISTANCE / currentZoom;
      if (Math.abs(camera.position.distanceTo(controls.target) - wantDist) < 1e-3) return;
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, wantDist);
      controls.update();
    } else {
      applyBaseCamera();
    }
  }

  function onControlsChange(): void {
    if (!camera || !controls) return;
    const z = CAM_ORBIT_DISTANCE / camera.position.distanceTo(controls.target);
    if (Math.abs(z - currentZoom) < 1e-4) return;
    currentZoom = z;
    opts.onZoomChange?.(z);
  }

  function resize(w: number, h: number): void {
    curW = Math.max(1, Math.round(w));
    curH = Math.max(1, Math.round(h));
    renderer?.setSize(curW, curH, false);
    if (camera) {
      camera.aspect = curW / curH;
      camera.updateProjectionMatrix();
    }
  }

  function setOrbitEnabled(on: boolean, domElement?: HTMLElement): void {
    if (!renderer || !camera) return;
    if (on) {
      if (!controls) {
        controls = new OrbitControls(camera, domElement ?? renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, CAM_TARGET_Y, 0);
        controls.minDistance = CAM_ORBIT_DISTANCE / CHIBI_ZOOM_MAX;
        controls.maxDistance = CAM_ORBIT_DISTANCE / CHIBI_ZOOM_MIN;
        controls.listenToKeyEvents(window); // arrow keys pan (right-drag pans too)
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

    // Master clock = the longest active clip; shorter clips loop within it (avantgardekun's
    // furniture clip out-runs the character's, so freezing on the shorter one would stutter).
    const active: { action: THREE.AnimationAction; mixer: THREE.AnimationMixer }[] = [];
    for (const ch of chars) if (ch.action) active.push({ action: ch.action, mixer: ch.mixer });
    if (furniture?.action && furniture.mixer)
      active.push({ action: furniture.action, mixer: furniture.mixer });

    let master = active[0] ?? null;
    for (const a of active) {
      if (a.action.getClip().duration > master!.action.getClip().duration) master = a;
    }
    master?.mixer.update(dt);
    const t = master ? master.action.time : 0;

    for (const ch of chars) {
      if (ch.action && ch.action !== master?.action) {
        const d = ch.action.getClip().duration;
        ch.action.time = d ? t % d : t;
        ch.mixer.update(0);
      }
      if (ch.action) driveMouth(ch.mouthUniforms, ch.currentMouth, ch.action.time);
      updateHaloFollower(ch.halo);
    }
    if (furniture?.action && furniture.mixer && furniture.action !== master?.action) {
      const d = furniture.action.getClip().duration;
      furniture.action.time = d ? t % d : t;
      furniture.mixer.update(0);
    }

    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function dispose(): void {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    controls?.removeEventListener('change', onControlsChange);
    controls?.dispose();
    controls = null;
    clearScene();
    grad?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    renderer = null;
    scene = null;
    camera = null;
  }

  onMounted(async () => {
    const canvas = canvasRef.value;
    if (!canvas) {
      error.value = true;
      return;
    }
    setupRenderer(canvas);
    rafId = requestAnimationFrame(tick);
    await buildSceneCatalog(); // the component picks the first furniture and drives loadScene
  });
  onBeforeUnmount(dispose);

  return {
    ready,
    error,
    furnitureOptions,
    clipOptions,
    currentClip,
    loadScene,
    playScene,
    setOrbitEnabled,
    setZoom,
    resize,
  };
}
