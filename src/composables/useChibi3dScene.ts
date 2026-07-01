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

/**
 * Live-3D chibi renderer — the Vue port of the deliverable's three.js POC
 * (`poc/index.html` + `poc/common.js`). Owns a fixed-camera WebGL scene drawn
 * into a transparent square canvas: loads one GLB + its manifest, assigns the
 * cel / eyemouth / additive-halo materials per submesh, plays clips through an
 * AnimationMixer, drives the per-clip mouth timeline each frame, and runs the
 * halo's FxFollower spring. The roaming-pet behaviour (walk/drag/gacha) lives in
 * the component; this composable is rendering only and exposes imperative
 * `play` / `setFacing` / `faceCamera` controls plus `ready` / `error` state.
 *
 * The calibrated mouth mapping and halo-spring values are ported verbatim from
 * the POC — do not re-derive them (see the deliverable GUIDE.md §3 and §6a).
 */

interface PlayOptions {
  /** Loop the clip (default) or play once and clamp on the final frame. */
  loop?: boolean;
  /** Fired once when a non-looping clip finishes (e.g. Victory_Start → Victory_End). */
  onEnd?: () => void;
}

interface Chibi3dSceneOptions {
  /** Character folder id, e.g. `ch0158`. */
  charId: string;
  /** Rendered canvas size in px (square). */
  size: number;
}

// The four mouth-overlay uniforms injected into the EyeMouth MeshToonMaterial.
interface MouthUniforms {
  uMouthTex: { value: THREE.Texture | null };
  uMouthMask: { value: THREE.Texture | null };
  uMouthCell: { value: THREE.Vector2 };
  uMouthOffset: { value: THREE.Vector2 };
}

// FxFollower halo spring (BA values, identical across characters — GUIDE.md §6a).
interface HaloFollower {
  root: THREE.Object3D;
  head: THREE.Object3D;
  halo: THREE.Object3D;
  relPos: THREE.Vector3;
  relRot: THREE.Quaternion;
  clampMin: THREE.Vector3;
  clampMax: THREE.Vector3;
  geomCenter: THREE.Vector3;
  tweakQuat: THREE.Quaternion;
  posPow: number;
  rotPow: number;
  prevPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  init: boolean;
}

// ── Shared toon gradient + texture loader (common.js) ──────────────────────────
function makeGradient(): THREE.DataTexture {
  const grad = new THREE.DataTexture(
    new Uint8Array([170, 170, 170, 255, 255, 255, 255, 255]),
    2,
    1,
    THREE.RGBAFormat,
  );
  grad.needsUpdate = true;
  grad.minFilter = THREE.NearestFilter;
  grad.magFilter = THREE.NearestFilter;
  return grad;
}

function loadTexture(url: string, srgb = true): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.flipY = false;
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        resolve(t);
      },
      undefined,
      () => resolve(null),
    );
  });
}

// EyeMouth: lit cel + the mouth-atlas overlay. uMouthCell is Unity's 1-indexed
// (col,row); the GLSL maps it to the atlas (col-1, 5-row, row reflected).
function makeEyeMouth(
  baseMap: THREE.Texture | null,
  atlasTex: THREE.Texture | null,
  maskTex: THREE.Texture | null,
  grad: THREE.DataTexture,
): { material: THREE.MeshToonMaterial; uniforms: MouthUniforms } {
  const material = new THREE.MeshToonMaterial({ map: baseMap, gradientMap: grad });
  const uniforms: MouthUniforms = {
    uMouthTex: { value: atlasTex },
    uMouthMask: { value: maskTex },
    uMouthCell: { value: new THREE.Vector2(2, 5) }, // idle (code 401) = Unity (col2,row5)
    uMouthOffset: { value: new THREE.Vector2(0, 0) },
  };
  if (atlasTex) {
    atlasTex.wrapS = THREE.RepeatWrapping;
    atlasTex.wrapT = THREE.RepeatWrapping;
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `uniform sampler2D uMouthTex; uniform sampler2D uMouthMask; uniform vec2 uMouthCell; uniform vec2 uMouthOffset;
void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        { float mask = texture2D(uMouthMask, vMapUv).r;
          if (mask > 0.5) {                       // mouth region of the face
            vec2 cell = vec2(uMouthCell.x - 1.0, 5.0 - uMouthCell.y) * 0.125;
            vec4 mouth = texture2D(uMouthTex, (vMapUv - uMouthOffset) * 0.5 + cell);
            if (mouth.a < 0.5) discard;           // no mouth pixel here -> show FACE skin behind
            diffuseColor.rgb = mouth.rgb;         // draw the mouth
          }                                        // else: eye region -> keep base (eyes)
        }`,
      );
  };
  material.needsUpdate = true;
  return { material, uniforms };
}

// mouth event (col,row) -> uMouthCell (Unity 1-indexed) — common.js codeToCell.
const codeToCell = (col: number, row: number): [number, number] => [col + 1, row + 1];

// Fixed pet camera (POC framing). Orbit mode moves the camera from here; toggling
// orbit off restores exactly this so the model-facing logic lines up again.
const FOV_DEG = 35; // vertical fov (square aspect, so == horizontal)
// One hardcoded camera for all characters (they share a rig + scale, so a single framing
// is consistent — auto-fitting per model was unreliable because SkinnedMesh bbox = bind
// pose). Tune DEFAULT_TARGET_Y (vertical centering) + DEFAULT_DISTANCE (size) by eye.
const TILT_TAN = Math.tan((13.8 * Math.PI) / 180); // ~13.8° downtilt (looking down at the pet)
const CAM_TARGET_Y = 0.6; // look-at height; the canvas centre maps to (0, this, 0)
const CAM_DISTANCE = 3; // camera distance at zoom 1 (the Size slider divides this)

// Dispose a material AND every texture bound to it. three's `material.dispose()` does
// NOT free the textures it references, so without this every scene teardown (HMR reload
// or character switch) leaks the GLB's embedded base maps on the GPU — the main leak.
function disposeMaterial(mat: THREE.Material): void {
  for (const value of Object.values(mat as unknown as Record<string, unknown>)) {
    if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
  }
  mat.dispose();
}

// Dispose every mesh's geometry + material(s) under an object subtree.
function disposeSubtree(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
}

// ── Halo FxFollower spring (common.js HALO_CFG / make- / updateHaloFollower) ────
const HALO_CFG = {
  targetBone: 'Bip001 Head',
  relPos: new THREE.Vector3(-0.36429, -0.20871, 0),
  relRot: new THREE.Quaternion(0.5, -0.5, -0.5, -0.5),
  clampMin: new THREE.Vector3(-0.48, -0.34, -0.27),
  clampMax: new THREE.Vector3(-0.26, -0.07, 0.27),
  posPow: 0.1,
  rotPow: 0.07,
  tweakDeg: [85, 0, 0] as const, // visual ring-tilt correction after the LH->RH flip
};
// Unity(LH) -> glTF(RH): positions negate X, quats -> (x,-y,-z,w).
const convVec = (v: THREE.Vector3) => new THREE.Vector3(-v.x, v.y, v.z);
const convQuat = (q: THREE.Quaternion) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);

const _hv = new THREE.Vector3();
const _hq = new THREE.Quaternion();
const _hs = new THREE.Vector3();
const _hm = new THREE.Matrix4();
// Per-frame halo scratch — reused so updateHaloFollower allocates nothing each frame.
const _hlp = new THREE.Vector3();
const _htr = new THREE.Quaternion();
const _hoff = new THREE.Vector3();

function makeHaloFollower(root: THREE.Object3D, scene: THREE.Scene): HaloFollower | null {
  let head: THREE.Object3D | null = null;
  let halo: THREE.Object3D | null = null;
  // GLTFLoader sanitizes 'Bip001 Head' -> 'Bip001_Head'; normalize before matching.
  const norm = (s: string) => (s || '').toLowerCase().replace(/[\s_]+/g, ' ').trim();
  const wantHead = norm(HALO_CFG.targetBone);
  root.traverse((o) => {
    const nm = norm(o.name);
    if (nm === wantHead) head = o;
    if (nm.endsWith('halo')) halo = o;
  });
  if (!head || !halo) return null;

  // `head`/`halo` are narrowed to never by the closure above; re-assert the type.
  const headObj = head as THREE.Object3D;
  const haloObj = halo as THREE.Object3D;
  scene.attach(haloObj);

  let geom: THREE.BufferGeometry | null = null;
  haloObj.traverse((o) => {
    if (!geom && (o as THREE.Mesh).isMesh) geom = (o as THREE.Mesh).geometry;
  });
  const geomCenter = new THREE.Vector3();
  if (geom) {
    (geom as THREE.BufferGeometry).computeBoundingBox();
    (geom as THREE.BufferGeometry).boundingBox?.getCenter(geomCenter);
  }

  const a = convVec(HALO_CFG.clampMin);
  const b = convVec(HALO_CFG.clampMax);
  const td = HALO_CFG.tweakDeg;
  const D = Math.PI / 180;
  return {
    root,
    head: headObj,
    halo: haloObj,
    relPos: convVec(HALO_CFG.relPos),
    relRot: convQuat(HALO_CFG.relRot),
    clampMin: new THREE.Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z)),
    clampMax: new THREE.Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z)),
    geomCenter,
    tweakQuat: new THREE.Quaternion().setFromEuler(new THREE.Euler(td[0] * D, td[1] * D, td[2] * D)),
    posPow: HALO_CFG.posPow,
    rotPow: HALO_CFG.rotPow,
    prevPos: new THREE.Vector3(),
    prevQuat: new THREE.Quaternion(),
    init: false,
  };
}

function updateHaloFollower(f: HaloFollower | null): void {
  if (!f) return;
  f.halo.visible = f.root.visible;
  f.head.updateWorldMatrix(true, false);
  f.head.matrixWorld.decompose(_hv, _hq, _hs);
  _hm.copy(f.head.matrixWorld).invert();
  _hlp.copy(f.prevPos).applyMatrix4(_hm);
  if (!f.init) _hlp.copy(f.relPos);
  _hlp.lerp(f.relPos, f.posPow).clamp(f.clampMin, f.clampMax);
  _hlp.applyMatrix4(f.head.matrixWorld); // _hlp is now the halo world position
  f.prevPos.copy(_hlp);
  _htr.copy(_hq).multiply(f.relRot);
  if (!f.init) f.prevQuat.copy(_htr);
  f.prevQuat.slerp(_htr, f.rotPow);
  f.halo.quaternion.copy(f.prevQuat).multiply(f.tweakQuat);
  _hoff.copy(f.geomCenter).multiply(f.halo.scale).applyQuaternion(f.halo.quaternion);
  f.halo.position.copy(_hlp).sub(_hoff);
  f.init = true;
}

export function useChibi3dScene(
  canvasRef: Ref<HTMLCanvasElement | null>,
  opts: Chibi3dSceneOptions,
) {
  const ready = ref(false);
  const error = ref(false);

  // three objects, kept out of Vue reactivity (no `ref` — these never render as data).
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

  const clipsByName = new Map<string, THREE.AnimationClip>(); // bare name -> clip
  let mouthByClip: Record<string, ChibiMouthEvent[]> = {};
  let currentMouth: ChibiMouthEvent[] = [];
  let pendingOnEnd: (() => void) | null = null;

  const clock = new THREE.Clock();
  let rafId = 0;
  let disposed = false;

  /** Strip the `CH####_` prefix UnityGLTF may add, so manifest keys line up. */
  const bare = (name: string) => name.replace(/^CH\d+_/i, '');

  function setupRenderer(canvas: HTMLCanvasElement): void {
    // preserveDrawingBuffer lets isPointerOnModel read back the rendered frame for a
    // pixel-accurate (alpha) grab hit-test; negligible cost for a single chibi.
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    // Supersample: render at SS× the canvas resolution and let the browser downscale,
    // so the model stays crisp in a small canvas (the POC looks sharper only because it
    // renders into the whole window — far more pixels on the same model). 2× is plenty
    // for one chibi; raise toward 3 for more, lower if it ever costs frames.
    const SUPERSAMPLE = 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * SUPERSAMPLE);
    renderer.setSize(opts.size, opts.size, false);
    renderer.setClearColor(0x000000, 0); // transparent: the pet floats over the page
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.01, 100);
    applyBaseCamera();

    // Even fill from all angles -> no dark side; soft hemi/dir for a hint of form.
    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9090a0, 0.4));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(0.5, 1, 1);
    scene.add(dir);
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

    const gltf = await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[] } | null>(
      (resolve) => {
        new GLTFLoader().load(
          getChibi3dModelUrl(charId, manifest.model),
          (g) => resolve(g),
          undefined,
          () => resolve(null),
        );
      },
    );
    if (!gltf || disposed || !scene) {
      if (!gltf) error.value = true;
      return;
    }

    root = gltf.scene;
    root.rotation.y = Math.PI; // model's default forward points away -> face the camera
    scene.add(root);

    // External mouth textures (the only maps glTF can't carry; base maps are embedded).
    const em = manifest.materials.EyeMouth?.textures ?? {};
    const atlas = em.mouthAtlas ? await loadTexture(getChibi3dTextureUrl(charId, em.mouthAtlas)) : null;
    const mask = em.mouthMask
      ? await loadTexture(getChibi3dTextureUrl(charId, em.mouthMask), false)
      : null;
    if (disposed) return;

    grad = makeGradient();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material & { name?: string; map?: THREE.Texture | null };
      const matName = (mat?.name || mesh.name || '').toLowerCase();
      const key = Object.keys(manifest.materials).find((k) => matName.includes(k.toLowerCase()));
      const def = key ? manifest.materials[key] : null;
      const baseMap = mat?.map ?? null;
      if (def?.shader === 'eyemouth') {
        const built = makeEyeMouth(baseMap, atlas, mask, grad!);
        mesh.material = built.material;
        mouthUniforms = built.uniforms;
      } else if (def?.shader === 'unlit') {
        mesh.material = new THREE.MeshBasicMaterial({
          map: baseMap,
          transparent: true,
          blending: def.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
          depthWrite: false,
        });
        mesh.renderOrder = 10;
      } else {
        mesh.material = new THREE.MeshToonMaterial({ map: baseMap, gradientMap: grad! });
      }
    });

    haloFollower = makeHaloFollower(root, scene); // detach + drive with the FxFollower spring

    mixer = new THREE.AnimationMixer(root);
    mixer.addEventListener('finished', () => {
      const cb = pendingOnEnd;
      pendingOnEnd = null;
      cb?.();
    });
    clipsByName.clear();
    for (const clip of gltf.animations) clipsByName.set(bare(clip.name), clip);
    mouthByClip = manifest.mouth ?? {};

    ready.value = true;
  }

  /** Whether the loaded GLB contains a clip (by logical/bare name). Drives pet behaviour
   *  off real clips, not the unreliable manifest `petClips` (e.g. striker = has Move_Ing). */
  function hasClip(name: string): boolean {
    return resolveClip(name) !== null;
  }

  function resolveClip(name: string): THREE.AnimationClip | null {
    const want = bare(name).toLowerCase();
    if (clipsByName.has(bare(name))) return clipsByName.get(bare(name))!;
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
    currentMouth = mouthByClip[bare(name)] ?? [];
  }

  const _pixel = new Uint8Array(4);
  /**
   * True if a pointer at canvas-local px `(localX, localY)` (0..size) is over Rio's
   * opaque pixels — an alpha hit-test against the rendered frame, so the pet only
   * grabs on her actual silhouette, not the empty corners of the square canvas.
   * (Raycasting the animated SkinnedMesh is unreliable; reading the pixel isn't.)
   * Misses fall through to the stage (walk) in the component.
   */
  function isPointerOnModel(localX: number, localY: number): boolean {
    if (!renderer) return false;
    const gl = renderer.getContext();
    const ratio = renderer.getPixelRatio();
    const px = Math.floor(localX * ratio);
    const py = Math.floor((opts.size - localY) * ratio); // WebGL origin is bottom-left
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, _pixel);
    return _pixel[3] > 16; // alpha: >0-ish means a model pixel was drawn here
  }

  const _box = new THREE.Box3();
  const _corner = new THREE.Vector3();
  /**
   * Rio's current bounding box projected into canvas-local px (0..size) — the rect her
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
      const cx = (_corner.x * 0.5 + 0.5) * opts.size;
      const cy = (0.5 - _corner.y * 0.5) * opts.size;
      minX = Math.min(minX, cx);
      maxX = Math.max(maxX, cx);
      minY = Math.min(minY, cy);
      maxY = Math.max(maxY, cy);
    }
    return { minX, minY, maxX, maxY };
  }

  // Screen movement vector -> model yaw. Screen +x = right, +y = down (toward
  // viewer); yaw = atan2(-dx,-dy) so "down" faces the camera (yaw π), "up" faces
  // away (yaw 0), and left/right turn in profile. Calibrate against the model.
  function setFacing(dx: number, dy: number): void {
    if (!root || (dx === 0 && dy === 0)) return;
    root.rotation.y = Math.atan2(-dx, -dy);
  }

  /** Face the camera (the idle/reaction resting pose). */
  function faceCamera(): void {
    if (root) root.rotation.y = Math.PI;
  }

  /**
   * Position the fixed pet camera: look at (0, CAM_TARGET_Y, 0), sit CAM_DISTANCE in front
   * with the ~13.8° downtilt, all scaled by zoom (so zooming preserves the tilt angle).
   */
  function applyBaseCamera(): void {
    if (!camera) return;
    const d = CAM_DISTANCE / currentZoom;
    camera.position.set(0, CAM_TARGET_Y + d * TILT_TAN, d);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, CAM_TARGET_Y, 0);
  }

  /**
   * Zoom = apparent size: >1 dollies the camera closer so she fills more of the canvas
   * (no canvas resize, no extra render cost). Applies immediately when not orbiting;
   * during orbit the wheel drives zoom and this stays the framing orbit-off restores to.
   */
  function setZoom(zoom: number): void {
    currentZoom = Math.max(0.5, zoom);
    if (!controls?.enabled) applyBaseCamera();
  }

  /**
   * Inspection-only orbit (the POC's OrbitControls). On: drag to spin / wheel to zoom
   * the camera; the component suspends pet gestures so they don't collide. `domElement`
   * is the input surface — pass the full-viewport stage so orbit works anywhere, not just
   * over the small canvas. Off: restore the fixed (zoomed) pet camera.
   */
  function setOrbitEnabled(on: boolean, domElement?: HTMLElement): void {
    if (!renderer || !camera) return;
    if (on) {
      if (!controls) {
        controls = new OrbitControls(camera, domElement ?? renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, CAM_TARGET_Y, 0);
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

    if (mouthUniforms && currentMouth.length && currentAction) {
      const t = currentAction.time;
      let cur = currentMouth[0];
      for (const e of currentMouth) {
        if (e.t <= t) cur = e;
        else break;
      }
      const [c, r] = codeToCell(cur.col, cur.row);
      mouthUniforms.uMouthCell.value.set(c, r);
    }

    updateHaloFollower(haloFollower); // after mixer.update so the head bone is current
    if (renderer && scene && camera) renderer.render(scene, camera);
  }

  function dispose(): void {
    disposed = true;
    if (rafId) cancelAnimationFrame(rafId);
    mixer?.stopAllAction();
    controls?.dispose();
    controls = null;
    grad?.dispose();
    // External mouth textures live in the eyemouth uniforms, not on a material, so the
    // generic material-texture sweep below won't reach them — dispose them here.
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
    play,
    hasClip,
    setFacing,
    faceCamera,
    isPointerOnModel,
    getModelBoundsPx,
    setOrbitEnabled,
    setZoom,
  };
}
