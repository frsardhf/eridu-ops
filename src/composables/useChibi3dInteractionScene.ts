import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  ChibiManifest,
  ChibiMouthEvent,
  ChibiRendererEvent,
  ChibiCharacterConfig,
  ChibiFurnitureConfig,
  ChibiVictoryConfig,
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
  type RendererTimeline,
  FOV_DEG,
  CAM_ORBIT_DISTANCE,
  CHIBI_INT_ZOOM_MIN,
  CHIBI_ZOOM_MAX,
  bareClipName,
  createGltfLoader,
  makeGradient,
  loadTexture,
  driveMouth,
  driveRenderers,
  applyManifestMaterials,
  createRendererTimeline,
  applyToonMaterials,
  addSceneLights,
  disposeSubtree,
  makeHaloFollower,
  updateHaloFollower,
  setHaloOverride,
} from '@/composables/chibi3dCore';
import { CHIBI_FURNITURE_IDS, orderChibiVictoryCharacters } from '@/composables/chibi3dCatalog';

/**
 * Live-3D chibi interaction scene (the Vue port of the deliverable POC's `poc/furniture.html`):
 * a multi-object orbit scene for cafe interactions. Two scene kinds:
 *   - furniture: one or more characters seated at a furniture GLB, playing the matching cafe
 *     clip; the furniture animation is the master clock (others sync via `time % duration`).
 *   - victory: two characters sharing a paired `Victory_*_Interaction` clip, each spun to face the
 *     camera in place (`faceInPlace`) with an optional per-victory offset nudge.
 * Per-scene overrides (furniture rotation / visibility, victory autoflip / offset) come from
 * `scenes.json`. The camera / orbit / zoom / resize block mirrors `useChibi3dScene` (same fixed
 * framing + wheel clamp), minus the roaming-pet pixel hit-test this inspection surface never needs.
 */

interface InteractionSceneOptions {
  /** Candidate character ids to consider for scenes (those with a matching interaction clip). */
  charIds: readonly string[];
  /** Resolve a cid to a display name (student store), for readable victory labels. */
  charName?: (cid: string) => string;
  /** Reports the effective zoom back out when the orbit wheel dollies the camera. */
  onZoomChange?: (zoom: number) => void;
}

interface LoadedChar {
  cid: string;
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  haloMixer: THREE.AnimationMixer | null;
  action: THREE.AnimationAction | null;
  clipsByBase: Map<string, THREE.AnimationClip>;
  mouthUniforms: MouthUniforms[];
  mouthByClip: Record<string, ChibiMouthEvent[]>;
  currentMouth: ChibiMouthEvent[];
  rendererByClip: Record<string, ChibiRendererEvent[]>;
  currentRenderers: ChibiRendererEvent[];
  rendererTimeline: RendererTimeline | null;
  halo: HaloFollower | null;
  pelvis: THREE.Object3D | null; // Bip001 root, for victory faceInPlace
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

/** A selectable scene in the catalog: either a furniture pairing or a char x char victory. */
interface SceneDef {
  id: string;
  label: string;
  type: 'furniture' | 'victory';
  cids: string[];
  furnitureLabel?: string; // furniture scenes
  victoryKey?: string; // victory scenes: the scenes.json key (sorted cids joined with '|')
}

interface Option {
  value: string;
  label: string;
}

/** A scene-picker option tagged with its kind, so the UI can split furniture vs victory tabs. */
interface SceneOption extends Option {
  kind: 'furniture' | 'victory';
}

// Per-scene-type start framing (eyeballed with the camera-tuning panel, then baked). `dir` is the
// unit target->camera direction; distance = CAM_ORBIT_DISTANCE / zoom, so the camera sits at
// `target + dir * distance`. Furniture frames a front-left 3/4 low shot; victory a near-front
// slightly-high shot. Orbit/pan/wheel take over from here.
const SCENE_FRAMING: Record<
  'furniture' | 'victory',
  { targetY: number; dir: THREE.Vector3; zoom: number }
> = {
  furniture: { targetY: -0.2, dir: new THREE.Vector3(-4.49, 2.7, 3.27).normalize(), zoom: 0.5 },
  victory: { targetY: 0.18, dir: new THREE.Vector3(0.01, 0.93, 4.03).normalize(), zoom: 0.75 },
};

const VICTORY_INTERACTION_RE = /victory.*interaction/i;
const norm = (s: string): string =>
  (s || '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .trim();

export function useChibi3dInteractionScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  opts: InteractionSceneOptions,
) {
  const ready = ref(false);
  const error = ref(false);
  const sceneOptions = ref<SceneOption[]>([]); // furniture + victory scenes with matching characters
  const clipOptions = ref<Option[]>([]); // interaction-clip variants for the current scene
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
  let victoryCfgAll: Record<string, ChibiVictoryConfig> = {};
  let charCfgAll: Record<string, ChibiCharacterConfig> = {};
  const sceneCatalog = new Map<string, SceneDef>();

  let chars: LoadedChar[] = [];
  let furniture: LoadedFurniture | null = null;
  let sceneType: 'furniture' | 'victory' = 'furniture';
  let victoryAutoflip = true;
  let victoryMirrorMotionX = false;
  let victoryMirrorMotionZ = false;
  let victoryExclude: string[] = [];
  const victoryOffset = new THREE.Vector3();
  const victorySecondOffset = new THREE.Vector3();

  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;
  let loadToken = 0; // guards against a stale scene load resolving after a newer one

  const loader = createGltfLoader();
  function loadGltf(url: string) {
    return new Promise<{
      scene: THREE.Object3D;
      animations: THREE.AnimationClip[];
      parser?: { json?: { nodes?: Array<{ mesh?: number; name?: string }> } };
    } | null>((resolve) =>
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

  /** Fetch scenes.json + candidate char manifests, then build the furniture + victory scene catalog. */
  async function buildSceneCatalog(): Promise<void> {
    let config: ChibiScenesConfig = {};
    try {
      const res = await fetch(getChibi3dScenesUrl());
      if (res.ok) config = (await res.json()) as ChibiScenesConfig;
    } catch {
      // scenes.json is optional: without it we fall back to no curated overrides.
    }
    furnCfgAll = config.furniture ?? {};
    victoryCfgAll = config.duo ?? config.victory ?? {};
    charCfgAll = config.characters ?? {};

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

    const options: SceneOption[] = [];

    // Furniture scenes: a furniture label + every character with a clip for it.
    for (const label of CHIBI_FURNITURE_IDS) {
      const cids = opts.charIds.filter((cid) =>
        (keysByCid.get(cid) ?? []).some((k) => k.toLowerCase().includes(label.toLowerCase())),
      );
      if (!cids.length) continue;
      sceneCatalog.set(label, { id: label, label, type: 'furniture', cids, furnitureLabel: label });
      options.push({ value: label, label, kind: 'furniture' });
    }

    // Stage order follows the POC so offsets target the authored character. Labels keep the
    // existing reverse presentation order independently from scene transforms.
    for (const key of Object.keys(victoryCfgAll)) {
      const configuredCids = key.split('|').filter((c) => opts.charIds.includes(c));
      const cids = orderChibiVictoryCharacters(configuredCids, keysByCid);
      if (cids.length < 2) continue;
      if (
        !cids.every((cid) => (keysByCid.get(cid) ?? []).some((k) => VICTORY_INTERACTION_RE.test(k)))
      )
        continue;
      const id = `victory:${key}`;
      const label = [...configuredCids]
        .reverse()
        .map((c) => opts.charName?.(c) ?? c)
        .join(' × ');
      sceneCatalog.set(id, { id, label, type: 'victory', cids, victoryKey: key });
      options.push({ value: id, label, kind: 'victory' });
    }

    sceneOptions.value = options;
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
    root.rotation.y = Math.PI; // face the camera (furniture autoflip; victory re-faces per frame)
    scene.add(root);

    let pelvis: THREE.Object3D | null = null;
    root.traverse((o) => {
      if (!pelvis && norm(o.name) === 'bip001') pelvis = o;
    });

    const em = manifest.materials.EyeMouth?.textures ?? {};
    const atlas = em.mouthAtlas
      ? await loadTexture(getChibi3dTextureUrl(cid, em.mouthAtlas))
      : null;
    const mask = em.mouthMask
      ? await loadTexture(getChibi3dTextureUrl(cid, em.mouthMask), false)
      : null;
    const charConfig = charCfgAll[cid];
    const mouthUniforms = applyManifestMaterials(
      root,
      manifest,
      atlas,
      mask,
      grad,
      cid,
      charConfig,
    );
    const rendererTimeline = createRendererTimeline(root, manifest, gltf.parser?.json?.nodes ?? []);
    const halo = makeHaloFollower(root, scene);
    setHaloOverride(halo, charConfig?.halo ?? null);

    const mixer = new THREE.AnimationMixer(root);
    let haloMixer: THREE.AnimationMixer | null = null;
    const clipsByBase = new Map<string, THREE.AnimationClip>();
    const haloClip = gltf.animations.find((clip) => /haloloop$/i.test(clip.name));
    for (const clip of gltf.animations) {
      if (clip !== haloClip) clipsByBase.set(bareClipName(clip.name, manifest.dev), clip);
    }
    if (haloClip) {
      haloMixer = new THREE.AnimationMixer(halo?.halo ?? root);
      const action = haloMixer.clipAction(haloClip).setLoop(THREE.LoopRepeat, Infinity).play();
      action.timeScale = 4;
    }

    return {
      cid,
      root,
      mixer,
      haloMixer,
      action: null,
      clipsByBase,
      mouthUniforms,
      mouthByClip: manifest.mouth ?? {},
      currentMouth: [],
      rendererByClip: manifest.renderers?.clips ?? {},
      currentRenderers: [],
      rendererTimeline,
      halo,
      pelvis,
      atlas,
      mask,
    };
  }

  async function loadFurniture(label: string): Promise<LoadedFurniture | null> {
    if (!scene || !grad) return null;
    const gltf = await loadGltf(getChibi3dFurnitureUrl(label));
    if (!gltf || !scene || !grad) return null;
    const root = gltf.scene;
    const config = furnCfgAll[label];
    applyToonMaterials(root, grad, config?.hide);
    if (config?.seatSky) seatFurnitureSky(root);
    root.rotation.y = ((config?.ry ?? 0) * Math.PI) / 180;
    scene.add(root);
    const mixer = gltf.animations.length ? new THREE.AnimationMixer(root) : null;
    const clipsByBase = new Map<string, THREE.AnimationClip>();
    for (const clip of gltf.animations) clipsByBase.set(bareClipName(clip.name), clip);
    return { label, root, mixer, action: null, clipsByBase };
  }

  /** Re-seat an exported portal sky directly behind its visible window frame. */
  function seatFurnitureSky(root: THREE.Object3D): void {
    root.updateWorldMatrix(true, true);
    let sky: THREE.Mesh | null = null;
    let frame: THREE.Mesh | null = null;
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible) return;
      if (mesh.name.includes('_sky')) sky = mesh;
      else if (!frame) frame = mesh;
    });
    if (!sky || !frame) return;

    const skyMesh = sky as THREE.Mesh;
    const frameMesh = frame as THREE.Mesh;
    skyMesh.geometry = skyMesh.geometry.clone();
    const scratch = new THREE.Vector3();
    const bounds = (mesh: THREE.Mesh): THREE.Box3 => {
      mesh.updateWorldMatrix(true, false);
      if (!(mesh as THREE.SkinnedMesh).isSkinnedMesh) return new THREE.Box3().setFromObject(mesh);
      const skinned = mesh as THREE.SkinnedMesh;
      const positions = skinned.geometry.getAttribute('position');
      const box = new THREE.Box3();
      for (let index = 0; index < positions.count; index++) {
        scratch.fromBufferAttribute(positions, index);
        skinned.applyBoneTransform(index, scratch);
        box.expandByPoint(scratch.applyMatrix4(skinned.matrixWorld));
      }
      return box;
    };

    const frameBox = bounds(frameMesh);
    const skyBox = bounds(skyMesh);
    const frameCenter = frameBox.getCenter(new THREE.Vector3());
    const frameSize = frameBox.getSize(new THREE.Vector3());
    const skyCenter = skyBox.getCenter(new THREE.Vector3());
    const skySize = skyBox.getSize(new THREE.Vector3());
    let depth = 0;
    for (let axis = 1; axis < 3; axis++) {
      if (frameSize.getComponent(axis) < frameSize.getComponent(depth)) depth = axis;
    }
    const side = Math.sign(skyCenter.getComponent(depth) - frameCenter.getComponent(depth)) || 1;
    const target = frameCenter.clone();
    target.setComponent(
      depth,
      frameCenter.getComponent(depth) +
        side * (frameSize.getComponent(depth) / 2 + skySize.getComponent(depth) / 2 - 0.02),
    );
    const worldDelta = target.sub(skyCenter);
    const center = bounds(skyMesh).getCenter(new THREE.Vector3());
    const columns: THREE.Vector3[] = [];
    for (let axis = 0; axis < 3; axis++) {
      const translation = new THREE.Vector3().setComponent(axis, 1);
      skyMesh.geometry.translate(translation.x, translation.y, translation.z);
      columns.push(bounds(skyMesh).getCenter(new THREE.Vector3()).sub(center));
      skyMesh.geometry.translate(-translation.x, -translation.y, -translation.z);
    }
    const matrix = new THREE.Matrix3().set(
      columns[0].x,
      columns[1].x,
      columns[2].x,
      columns[0].y,
      columns[1].y,
      columns[2].y,
      columns[0].z,
      columns[1].z,
      columns[2].z,
    );
    const geometryDelta = worldDelta.applyMatrix3(matrix.invert());
    skyMesh.geometry.translate(geometryDelta.x, geometryDelta.y, geometryDelta.z);
    skyMesh.geometry.computeBoundingSphere();
  }

  function clearScene(): void {
    for (const ch of chars) {
      if (scene) scene.remove(ch.root);
      disposeSubtree(ch.root);
      if (ch.halo && scene) scene.remove(ch.halo.halo);
      if (ch.halo) disposeSubtree(ch.halo.halo);
      ch.mixer.stopAllAction();
      ch.haloMixer?.stopAllAction();
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

  /** Load a scene by catalog id (furniture or victory), then play its default clip. */
  async function loadScene(id: string): Promise<void> {
    const def = sceneCatalog.get(id);
    if (!def) return;
    const token = ++loadToken;
    ready.value = false;
    error.value = false;
    // Clear the variant picker up front so the previous scene's variants don't linger on the
    // dropdown during the async load (e.g. furniture variants flashing after switching to victory).
    clipOptions.value = [];
    currentClip.value = '';
    clearScene();
    if (def.type === 'furniture') await loadFurnitureScene(def, token);
    else await loadVictoryScene(def, token);
  }

  async function loadFurnitureScene(def: SceneDef, token: number): Promise<void> {
    sceneType = 'furniture';
    const label = def.furnitureLabel!;
    furniture = await loadFurniture(label);
    const loaded = await Promise.all(def.cids.map(loadChar));
    if (disposed || token !== loadToken) return;
    if (!furniture) {
      error.value = true;
      return;
    }
    chars = loaded.filter((c): c is LoadedChar => c !== null);
    clipOptions.value = buildFurnitureClipOptions(label);
    const first = defaultFurnitureClip(label, clipOptions.value);
    if (first) playScene(first);
    reframe();
    ready.value = true;
  }

  async function loadVictoryScene(def: SceneDef, token: number): Promise<void> {
    sceneType = 'victory';
    const loaded = await Promise.all(def.cids.map(loadChar));
    if (disposed || token !== loadToken) return;
    chars = loaded.filter((c): c is LoadedChar => c !== null);
    if (chars.length < 2) {
      error.value = true;
      return;
    }
    const cfg = def.victoryKey ? victoryCfgAll[def.victoryKey] : undefined;
    victoryAutoflip = cfg?.autoflip ?? true;
    victoryMirrorMotionX = cfg?.mirrorMotionX ?? false;
    victoryMirrorMotionZ = cfg?.mirrorMotionZ ?? false;
    victoryExclude = (cfg?.exclude ?? []).map((part) => part.toLowerCase());
    victoryOffset.set(cfg?.offset?.x ?? 0, cfg?.offset?.y ?? 0, cfg?.offset?.z ?? 0);
    const secondOffset = cfg?.secondOffset ?? cfg?.lastOffset;
    victorySecondOffset.set(secondOffset?.x ?? 0, secondOffset?.y ?? 0, secondOffset?.z ?? 0);
    for (const ch of chars) {
      setHaloOverride(ch.halo, cfg?.halo?.[ch.cid] ?? charCfgAll[ch.cid]?.halo ?? null);
    }
    clipOptions.value = buildVictoryClipOptions();
    const first =
      clipOptions.value.find((o) => /end/i.test(o.value))?.value ?? clipOptions.value[0]?.value;
    if (first) playScene(first);
    reframe();
    ready.value = true;
  }

  /** Furniture clip variants (non-idle), expanding `solo` variants into one entry per character. */
  function buildFurnitureClipOptions(label: string): Option[] {
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
  function defaultFurnitureClip(label: string, options: Option[]): string | undefined {
    const cfg = furnCfgAll[label];
    const restricted = (b: string): boolean => {
      const v = b.match(/_(\d+)$/)?.[1];
      return !!((cfg?.show && v && cfg.show[v]) || (cfg?.solo && v && cfg.solo[v]));
    };
    const open = options.filter((o) => !o.value.includes('@') && !restricted(o.value));
    return (open.length ? open : options).slice(-1)[0]?.value;
  }

  /** One option per interaction core across all members, even when suffixes differ by character. */
  function buildVictoryClipOptions(): Option[] {
    if (chars.length < 2) return [];
    const byCore = new Map<string, string>();
    const all = chars.flatMap((ch) => [...ch.clipsByBase.keys()]).sort();
    for (const base of all) {
      if (!VICTORY_INTERACTION_RE.test(base) || isExcludedVictoryClip(base)) continue;
      const core = victoryClipCore(base);
      if (!byCore.has(core)) byCore.set(core, base);
    }
    return [...byCore.values()]
      .filter((base) => chars.every((ch) => findVictoryBase(ch, base)))
      .map((base) => ({ value: base, label: victoryClipLabel(base) }));
  }

  const victoryClipCore = (base: string): string => base.replace(/_(\d+)$/, '').toLowerCase();
  const isExcludedVictoryClip = (base: string): boolean =>
    victoryExclude.some((part) => base.toLowerCase().includes(part));

  function victoryClipLabel(base: string): string {
    if (/start/i.test(base)) return 'Start';
    if (/end/i.test(base)) return 'End';
    return base;
  }

  function findClip(ch: LoadedChar, base: string): THREE.AnimationClip | undefined {
    if (ch.clipsByBase.has(base)) return ch.clipsByBase.get(base);
    const want = base.toLowerCase();
    for (const [k, v] of ch.clipsByBase) if (k.toLowerCase() === want) return v;
    return undefined;
  }

  function findVictoryBase(ch: LoadedChar, selected: string): string | undefined {
    if (ch.clipsByBase.has(selected) && !isExcludedVictoryClip(selected)) return selected;
    const keys = [...ch.clipsByBase.keys()].filter((key) => !isExcludedVictoryClip(key));
    const core = victoryClipCore(selected);
    const variant = selected.match(/_(\d+)$/)?.[1];
    return (
      (variant
        ? keys.find(
            (key) => victoryClipCore(key) === core && key.toLowerCase().endsWith(`_${variant}`),
          )
        : undefined) ?? keys.find((key) => victoryClipCore(key) === core)
    );
  }

  function timelineFor<T>(record: Record<string, T[]>, key: string): T[] {
    if (record[key]) return record[key];
    const want = key.toLowerCase();
    const match = Object.keys(record).find((candidate) => candidate.toLowerCase() === want);
    return match ? record[match] : [];
  }

  function playScene(sel: string): void {
    currentClip.value = sel;
    if (sceneType === 'victory') playVictory(sel);
    else playFurniture(sel);
  }

  /**
   * Play a furniture interaction variant. `sel` is a furniture clip base, or `base@cid` for a
   * solo variant. The furniture plays its clip; each character plays the clip matching the same
   * interaction (same variant preferred), and per-variant `show`/`solo` sets who's visible.
   */
  function playFurniture(sel: string): void {
    if (!furniture?.mixer) return;
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
        ch.currentMouth = timelineFor(ch.mouthByClip, cb);
        ch.currentRenderers = timelineFor(ch.rendererByClip, cb);
      } else {
        ch.action = null;
        ch.currentMouth = [];
        ch.currentRenderers = [];
      }
      ch.root.visible = !showList || showList.includes(ch.cid);
    }
  }

  /** Play each group member's matching interaction core, tolerating character-specific suffixes. */
  function playVictory(sel: string): void {
    for (const ch of chars) {
      ch.mixer.stopAllAction();
      const base = findVictoryBase(ch, sel);
      const clip = base ? findClip(ch, base) : undefined;
      if (clip) {
        ch.action = ch.mixer.clipAction(clip);
        ch.action.reset().play();
        ch.currentMouth = timelineFor(ch.mouthByClip, base!);
        ch.currentRenderers = timelineFor(ch.rendererByClip, base!);
      } else {
        ch.action = null;
        ch.currentMouth = [];
        ch.currentRenderers = [];
      }
      ch.root.visible = true;
    }
  }

  // Victory facing: spin each character 180deg about its own body so it faces the camera while
  // staying at its clip-staged position (POC faceInPlace). Auto-flip off = raw clip orientation
  // (for "face each other" victorys), which the manual offset then seats.
  const _fpv = new THREE.Vector3();
  const _fpbox = new THREE.Box3();
  function faceInPlace(ch: LoadedChar): void {
    const root = ch.root;
    root.rotation.y = 0;
    root.position.set(0, 0, 0);
    if (!victoryAutoflip) return;
    root.updateWorldMatrix(true, true); // bake the current pose so we can read where the body stands
    if (ch.pelvis) ch.pelvis.getWorldPosition(_fpv);
    else _fpbox.setFromObject(root).getCenter(_fpv);
    root.rotation.y = Math.PI;
    root.position.set(
      victoryMirrorMotionX ? 0 : 2 * _fpv.x,
      0,
      victoryMirrorMotionZ ? 0 : 2 * _fpv.z,
    );
  }

  function applyBaseCamera(): void {
    if (!camera) return;
    const f = SCENE_FRAMING[sceneType];
    const d = CAM_ORBIT_DISTANCE / currentZoom;
    camera.position.set(f.dir.x * d, f.targetY + f.dir.y * d, f.dir.z * d);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, f.targetY, 0);
  }

  /** Reframe for the current scene type: apply its default zoom + framing, sync the size slider. */
  function reframe(): void {
    currentZoom = SCENE_FRAMING[sceneType].zoom;
    applyBaseCamera();
    if (controls) {
      controls.target.set(0, SCENE_FRAMING[sceneType].targetY, 0);
      controls.update();
    }
    opts.onZoomChange?.(currentZoom);
  }

  function setZoom(zoom: number): void {
    currentZoom = Math.min(CHIBI_ZOOM_MAX, Math.max(CHIBI_INT_ZOOM_MIN, zoom));
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
        controls.target.set(0, SCENE_FRAMING[sceneType].targetY, 0);
        controls.minDistance = CAM_ORBIT_DISTANCE / CHIBI_ZOOM_MAX;
        controls.maxDistance = CAM_ORBIT_DISTANCE / CHIBI_INT_ZOOM_MIN;
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
      ch.haloMixer?.update(dt);
      if (ch.action && ch.action !== master?.action) {
        const d = ch.action.getClip().duration;
        ch.action.time = d ? t % d : t;
        ch.mixer.update(0);
      }
      if (ch.action) driveMouth(ch.mouthUniforms, ch.currentMouth, ch.action.time);
      if (ch.action) driveRenderers(ch.rendererTimeline, ch.currentRenderers, ch.action.time);
    }
    if (furniture?.action && furniture.mixer && furniture.action !== master?.action) {
      const d = furniture.action.getClip().duration;
      furniture.action.time = d ? t % d : t;
      furniture.mixer.update(0);
    }

    // Victory re-faces each character every frame, then applies its configured stage nudges.
    if (sceneType === 'victory') {
      for (const ch of chars) faceInPlace(ch);
      chars[0]?.root.position.add(victoryOffset);
      chars[1]?.root.position.add(victorySecondOffset);
    }

    for (const ch of chars) updateHaloFollower(ch.halo); // after facing -> follow the final head

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
    await buildSceneCatalog(); // the component picks the first scene and drives loadScene
  });
  onBeforeUnmount(dispose);

  return {
    ready,
    error,
    sceneOptions,
    clipOptions,
    currentClip,
    loadScene,
    playScene,
    setOrbitEnabled,
    setZoom,
    resize,
  };
}
