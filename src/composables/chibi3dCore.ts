import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type {
  ChibiCharacterConfig,
  ChibiHaloOverride,
  ChibiManifest,
  ChibiMouthEvent,
  ChibiRendererEvent,
} from '@/types/chibi';

/**
 * Shared live-3D chibi core (the Vue port of the deliverable POC's `common.js`): the pieces
 * that are identical for every character and for both the single-character pet scene
 * (`useChibi3dScene`) and the multi-object interaction scene (`useChibi3dInteractionScene`) --
 * toon gradient + texture loading, the EyeMouth cel/mouth-overlay material, manifest-driven
 * material assignment, the FxFollower halo spring, the fixed camera framing, and disposal.
 *
 * The calibrated mouth mapping and halo-spring values are ported verbatim from the POC: do not
 * re-derive them (see the deliverable GUIDE.md section 3 and section 6a).
 */

// The mouth-overlay uniforms injected into the EyeMouth MeshToonMaterial.
export interface MouthUniforms {
  uMouthTex: { value: THREE.Texture | null };
  uMouthMask: { value: THREE.Texture | null };
  uMouthCell: { value: THREE.Vector2 };
  uMouthOffset: { value: THREE.Vector2 };
  uMouthGrid: { value: THREE.Vector2 };
  uMode: { value: number };
}

export interface RendererTimeline {
  defaults: Record<string, boolean>;
  rendererByKey: Map<string, THREE.Object3D>;
  baseVisibility: Map<THREE.Object3D, boolean>;
}

// FxFollower halo spring (BA values, identical across characters: GUIDE.md section 6a).
export interface HaloFollower {
  root: THREE.Object3D;
  head: THREE.Object3D;
  halo: THREE.Object3D;
  relPos: THREE.Vector3;
  relRot: THREE.Quaternion;
  clampMin: THREE.Vector3;
  clampMax: THREE.Vector3;
  relPos0: THREE.Vector3;
  clampMin0: THREE.Vector3;
  clampMax0: THREE.Vector3;
  extraTweak: THREE.Quaternion | null;
  posPow: number;
  rotPow: number;
  prevPos: THREE.Vector3;
  prevQuat: THREE.Quaternion;
  init: boolean;
}

// --- Fixed camera framing (POC). Orbit moves the camera from here; orbit-off restores it. ---
export const FOV_DEG = 35; // vertical fov
const TILT_TAN = Math.tan((13.8 * Math.PI) / 180); // ~13.8deg downtilt (looking down at the pet)
export const CAM_TARGET_Y = 0.6; // look-at height; the canvas centre maps to (0, this, 0)
const CAM_DISTANCE = 3; // camera distance at zoom 1 (the Size slider divides this)
// positionBaseCamera sits the camera at (0, +d*TILT_TAN, d) with d = CAM_DISTANCE/zoom, so the true
// |camera - target| is d times this factor. Orbit dolly / zoom read-back use the true distance so
// zoom <-> distance round-trips exactly (else each orbit toggle shrank zoom by this factor).
export const CAM_ORBIT_DISTANCE = CAM_DISTANCE * Math.sqrt(1 + TILT_TAN * TILT_TAN);

/** Apparent-size (camera dolly) bounds, shared by the size slider and the orbit wheel clamp. */
export const CHIBI_ZOOM_MIN = 0.5;
export const CHIBI_ZOOM_MAX = 1.5;
// The interaction stage allows zooming much further out (big furniture scenes). Floored just
// above 0 because zoom 0 = distance CAM_ORBIT_DISTANCE / 0 = Infinity (camera lost, NaN).
export const CHIBI_INT_ZOOM_MIN = 0.05;

/**
 * Position the fixed camera: look at (0, CAM_TARGET_Y, 0), sit CAM_DISTANCE in front with the
 * ~13.8deg downtilt, scaled by zoom (so zooming preserves the tilt angle).
 */
export function positionBaseCamera(camera: THREE.PerspectiveCamera, zoom: number): void {
  const d = CAM_DISTANCE / zoom;
  camera.position.set(0, CAM_TARGET_Y + d * TILT_TAN, d);
  camera.up.set(0, 1, 0);
  camera.lookAt(0, CAM_TARGET_Y, 0);
}

/** Strip the `CH####_` prefix UnityGLTF may add, so manifest/clip keys line up. */
export const bareClipName = (name: string, dev = ''): string => {
  const prefix = `${dev}_`;
  return dev && name.toLowerCase().startsWith(prefix.toLowerCase())
    ? name.slice(prefix.length)
    : name.replace(/^CH\d+_/i, '');
};

// --- Shared toon gradient + texture loader (common.js) ---
export function makeGradient(): THREE.DataTexture {
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

/**
 * GLTFLoader with the meshopt decoder attached. The production GLBs are gltfpack'd
 * (EXT_meshopt_compression + KHR_mesh_quantization, see `npm run chibi3d:pack`), which needs
 * the decoder; plain uncompressed GLBs still load through the same loader unchanged.
 */
export function createGltfLoader(): GLTFLoader {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

export function loadTexture(url: string, srgb = true): Promise<THREE.Texture | null> {
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
  cols: number,
  rows: number,
  mode: number,
): { material: THREE.MeshToonMaterial; uniforms: MouthUniforms } {
  const material = new THREE.MeshToonMaterial({ map: baseMap, gradientMap: grad });
  const uniforms: MouthUniforms = {
    uMouthTex: { value: atlasTex },
    uMouthMask: { value: maskTex },
    uMouthCell: { value: new THREE.Vector2(2, 5) }, // idle (code 401) = Unity (col2,row5)
    uMouthOffset: { value: new THREE.Vector2(0, 0) },
    uMouthGrid: { value: new THREE.Vector2(cols, rows) },
    uMode: { value: mode },
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
        `uniform sampler2D uMouthTex; uniform sampler2D uMouthMask; uniform vec2 uMouthCell; uniform vec2 uMouthOffset; uniform vec2 uMouthGrid; uniform float uMode;
	void main() {`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        { float mask = texture2D(uMouthMask, vMapUv).r;
          if (mask > 0.5) {                       // mouth region of the face
            if (uMode > 1.5) discard;
            vec2 cell = vec2(uMouthCell.x - 1.0, 5.0 - uMouthCell.y) / uMouthGrid;
            vec4 mouth = texture2D(uMouthTex, (vMapUv - uMouthOffset) * (4.0 / uMouthGrid) + cell);
            if (mouth.a < 0.5) discard;           // no mouth pixel here -> show FACE skin behind
            diffuseColor.rgb = mouth.rgb;         // draw the mouth
          } else if (uMode > 0.5 && uMode < 1.5) discard;
        }`,
      );
  };
  material.needsUpdate = true;
  return { material, uniforms };
}

// mouth event (col,row) -> uMouthCell (Unity 1-indexed): common.js codeToCell.
const codeToCell = (col: number, row: number): [number, number] => [col + 1, row + 1];

/** Set the mouth cell for the active clip time from its timeline (no-op without a face). */
export function driveMouth(
  uniforms: MouthUniforms[],
  mouth: ChibiMouthEvent[],
  time: number,
): void {
  if (!uniforms.length || !mouth.length) return;
  let cur = mouth[0];
  for (const e of mouth) {
    if (e.t <= time) cur = e;
    else break;
  }
  const [c, r] = codeToCell(cur.col, cur.row);
  for (const item of uniforms) item.uMouthCell.value.set(c, r);
}

/**
 * Assign the per-submesh materials of a character root from its manifest (cel body / EyeMouth
 * overlay / unlit-additive halo), returning the EyeMouth uniforms (or null if the model has no
 * face submesh). `grad` is the shared toon ramp; `atlas`/`mask` are the external mouth textures.
 */
export function applyManifestMaterials(
  root: THREE.Object3D,
  manifest: ChibiManifest,
  atlas: THREE.Texture | null,
  mask: THREE.Texture | null,
  grad: THREE.DataTexture,
  charId: string,
  config: ChibiCharacterConfig = {},
): MouthUniforms[] {
  const mouthUniforms: MouthUniforms[] = [];
  const extraMeshPasses: Array<[THREE.Object3D, THREE.Mesh]> = [];
  const materialKeys = Object.keys(manifest.materials).sort((a, b) => b.length - a.length);
  const cols = manifest.mouthAtlas?.cols ?? 8;
  const rows = manifest.mouthAtlas?.rows ?? 8;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (config.hide?.some((part) => mesh.name.includes(part))) {
      mesh.visible = false;
      return;
    }
    const mat = mesh.material as THREE.Material & {
      name?: string;
      map?: THREE.Texture | null;
      color?: THREE.Color;
      isMeshBasicMaterial?: boolean;
    };
    const matName = `${mat?.name ?? ''} ${charId === 'ch0294' ? mesh.name : ''}`.toLowerCase();
    const key = materialKeys.find((k) => matName.includes(k.toLowerCase()));
    const def = key ? manifest.materials[key] : null;
    const baseMap = mat?.map ?? null;
    const baseColor = mat?.color ?? new THREE.Color(0xffffff);
    if (def?.shader === 'eyemouth') {
      let mode = 0;
      if (config.eyeNode) {
        let parent: THREE.Object3D | null = mesh;
        let underEyeNode = false;
        while (parent) {
          if (parent.name.includes(config.eyeNode)) {
            underEyeNode = true;
            break;
          }
          parent = parent.parent;
        }
        mode = underEyeNode ? 2 : 1;
      }
      const built = makeEyeMouth(baseMap, atlas, mask, grad, cols, rows, mode);
      mesh.material = built.material;
      mouthUniforms.push(built.uniforms);
    } else if (def?.shader === 'unlit' || (!def && mat?.isMeshBasicMaterial)) {
      const material = new THREE.MeshBasicMaterial({
        map: baseMap,
        color: baseColor,
        transparent: true,
        blending: def?.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });
      if (def?.blend === 'additive') {
        material.blending = THREE.CustomBlending;
        material.blendEquation = THREE.AddEquation;
        material.blendSrc = THREE.OneFactor;
        material.blendDst = THREE.OneFactor;
      }
      mesh.material = material;
      mesh.renderOrder = 10;
    } else {
      const seeThrough =
        (charId === 'ch0293' && key === 'Body_Alpha') || (charId === 'ch0295' && key === 'Alpha');
      mesh.material = new THREE.MeshToonMaterial({
        map: baseMap,
        color: baseColor,
        gradientMap: grad,
        transparent: seeThrough,
        opacity: seeThrough ? 0.808 : 1,
        depthWrite: !seeThrough,
      });
      if (seeThrough) mesh.renderOrder = 2;
    }
    if (key) extraMeshPasses.push(...applyMeshOverrides(mesh, key, config));
  });
  for (const [parent, pass] of extraMeshPasses) parent.add(pass);
  return mouthUniforms;
}

function connectedComponents(geometry: THREE.BufferGeometry): number[][] {
  const source = geometry.index?.array;
  if (!source) return [];
  const triangleCount = Math.floor(source.length / 3);
  const trianglesByVertex = new Map<number, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle++) {
    for (let corner = 0; corner < 3; corner++) {
      const vertex = source[triangle * 3 + corner];
      const touching = trianglesByVertex.get(vertex) ?? [];
      touching.push(triangle);
      trianglesByVertex.set(vertex, touching);
    }
  }

  const visited = new Uint8Array(triangleCount);
  const components: number[][] = [];
  for (let seed = 0; seed < triangleCount; seed++) {
    if (visited[seed]) continue;
    const queue = [seed];
    const triangles: number[] = [];
    visited[seed] = 1;
    while (queue.length) {
      const triangle = queue.pop();
      if (triangle === undefined) break;
      triangles.push(triangle);
      for (let corner = 0; corner < 3; corner++) {
        for (const next of trianglesByVertex.get(source[triangle * 3 + corner]) ?? []) {
          if (visited[next]) continue;
          visited[next] = 1;
          queue.push(next);
        }
      }
    }
    components.push(
      triangles.flatMap((triangle) => [
        source[triangle * 3],
        source[triangle * 3 + 1],
        source[triangle * 3 + 2],
      ]),
    );
  }
  return components;
}

function applyMeshOverrides(
  mesh: THREE.Mesh,
  materialKey: string,
  config: ChibiCharacterConfig,
): Array<[THREE.Object3D, THREE.Mesh]> {
  const materialOverride = config.materialOverrides?.[materialKey];
  const material = mesh.material as THREE.Material;
  if (materialOverride) {
    if (materialOverride.depthWrite !== undefined)
      material.depthWrite = materialOverride.depthWrite;
    if (materialOverride.depthTest !== undefined) material.depthTest = materialOverride.depthTest;
    if (materialOverride.polygonOffset !== undefined) {
      material.polygonOffset = true;
      material.polygonOffsetFactor = materialOverride.polygonOffset;
      material.polygonOffsetUnits = materialOverride.polygonOffset;
    }
    if (materialOverride.renderOrder !== undefined) mesh.renderOrder = materialOverride.renderOrder;
  }

  const layers = config.componentLayers?.[materialKey];
  const parent = mesh.parent;
  if (!parent || !layers || layers.length < 2) return [];
  const components = connectedComponents(mesh.geometry);
  if (!components.length) return [];

  const claimed = new Set<number>();
  const extraPasses: Array<[THREE.Object3D, THREE.Mesh]> = [];
  for (let index = 0; index < layers.length; index++) {
    const layer = layers[index];
    const componentIds = layer.remaining
      ? components.map((_, componentIndex) => componentIndex).filter((id) => !claimed.has(id))
      : (layer.components ?? []);
    componentIds.forEach((id) => claimed.add(id));
    const indices = componentIds.flatMap((id) => components[id] ?? []);
    if (!indices.length) continue;
    const pass = index === layers.length - 1 ? mesh : (mesh.clone(false) as THREE.Mesh);
    pass.geometry = mesh.geometry.clone();
    pass.geometry.setIndex(indices);
    pass.name = `${mesh.name}_${layer.name ?? `Layer${index}`}`;
    if (layer.renderOrder !== undefined) pass.renderOrder = layer.renderOrder;
    if (pass !== mesh) extraPasses.push([parent, pass]);
  }
  return extraPasses;
}

/** Build the renderer lookup used by Unity visibility timelines. */
export function createRendererTimeline(
  root: THREE.Object3D,
  manifest: ChibiManifest,
  nodes: Array<{ mesh?: number; name?: string }> = [],
  config: ChibiCharacterConfig = {},
): RendererTimeline | null {
  if (!manifest.renderers) return null;
  const rendererByKey = new Map<string, THREE.Object3D>();
  for (const node of nodes) {
    if (node.mesh === undefined || !node.name) continue;
    const object = root.getObjectByName(node.name);
    if (object) rendererByKey.set(String(node.mesh), object);
  }
  const rendererPaths = new Set(
    Object.values(manifest.renderers.clips)
      .flat()
      .flatMap((event) => (event.node ? [event.node] : [])),
  );
  for (const path of rendererPaths) {
    const nodeName = path.split('/').at(-1);
    if (!nodeName) continue;
    const object = root.getObjectByName(nodeName);
    if (object) rendererByKey.set(path, object);
  }
  for (const [index, name] of Object.entries(config.rendererNodes ?? {})) {
    const object = root.getObjectByName(name);
    if (object) rendererByKey.set(index, object);
  }
  const baseVisibility = new Map<THREE.Object3D, boolean>();
  for (const object of rendererByKey.values()) {
    if (!baseVisibility.has(object)) baseVisibility.set(object, object.visible);
  }
  return { defaults: manifest.renderers.default ?? {}, rendererByKey, baseVisibility };
}

/** Replay renderer visibility from the clip-start defaults through the active clip time. */
export function driveRenderers(
  timeline: RendererTimeline | null,
  events: ChibiRendererEvent[],
  time: number,
): void {
  if (!timeline) return;
  for (const [object, visible] of timeline.baseVisibility) object.visible = visible;
  for (const [key, visible] of Object.entries(timeline.defaults)) {
    const object = timeline.rendererByKey.get(key);
    if (object) object.visible = visible;
  }
  for (const event of events) {
    if (event.t > time) break;
    const key = event.node ?? (event.idx === undefined ? null : String(event.idx));
    if (!key) continue;
    const object = timeline.rendererByKey.get(key);
    if (object) object.visible = event.on;
  }
}

/** Re-material every mesh under `root` as a plain toon (furniture: no manifest, just base maps). */
export function applyToonMaterials(
  root: THREE.Object3D,
  grad: THREE.DataTexture,
  hide: string[] = [],
): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material & { map?: THREE.Texture | null };
    if (hide.some((part) => mesh.name.includes(part)) || !mat?.map) {
      mesh.visible = false;
      return;
    }
    mesh.material = new THREE.MeshToonMaterial({ map: mat.map, gradientMap: grad });
  });
}

/** Even fill from all angles (no dark side) plus a soft hemi/dir for a hint of form. */
export function addSceneLights(scene: THREE.Scene): void {
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9090a0, 0.4));
  const dir = new THREE.DirectionalLight(0xffffff, 0.4);
  dir.position.set(0.5, 1, 1);
  scene.add(dir);
}

// Dispose a material AND every texture bound to it. three's `material.dispose()` does
// NOT free the textures it references, so without this every scene teardown (HMR reload
// or character switch) leaks the GLB's embedded base maps on the GPU: the main leak.
function disposeMaterial(mat: THREE.Material): void {
  for (const value of Object.values(mat as unknown as Record<string, unknown>)) {
    if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
  }
  mat.dispose();
}

/** Dispose every mesh's geometry + material(s) under an object subtree. */
export function disposeSubtree(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mat = mesh.material;
    if (Array.isArray(mat)) mat.forEach(disposeMaterial);
    else if (mat) disposeMaterial(mat);
  });
}

// --- Halo FxFollower spring (common.js HALO_CFG / make- / updateHaloFollower) ---
const HALO_CFG = {
  targetBone: 'Bip001 Head',
  relPos: new THREE.Vector3(-0.36429, -0.20871, 0),
  relRot: new THREE.Quaternion(0.5, -0.5, -0.5, -0.5),
  clampMin: new THREE.Vector3(-0.48, -0.34, -0.27),
  clampMax: new THREE.Vector3(-0.26, -0.07, 0.27),
  posPow: 0.1,
  rotPow: 0.07,
};
// Unity(LH) -> glTF(RH): positions negate X, quats -> (x,-y,-z,w).
const convVec = (v: THREE.Vector3) => new THREE.Vector3(-v.x, v.y, v.z);
const convQuat = (q: THREE.Quaternion) => new THREE.Quaternion(q.x, -q.y, -q.z, q.w);

const _hv = new THREE.Vector3();
const _hq = new THREE.Quaternion();
const _hs = new THREE.Vector3();
const _hm = new THREE.Matrix4();
// Per-frame halo scratch: reused so updateHaloFollower allocates nothing each frame.
const _hlp = new THREE.Vector3();
const _htr = new THREE.Quaternion();

/**
 * Find + detach the halo under `root` and return a follower (or null if no head/halo node).
 * `scene` is the identity root the halo is reparented onto so the spring can drive its world
 * transform.
 */
export function makeHaloFollower(root: THREE.Object3D, scene: THREE.Scene): HaloFollower | null {
  let head: THREE.Object3D | null = null;
  let halo: THREE.Object3D | null = null;
  // GLTFLoader sanitizes 'Bip001 Head' -> 'Bip001_Head'; normalize before matching.
  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .replace(/[\s_]+/g, ' ')
      .trim();
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
  const relPos = convVec(HALO_CFG.relPos);
  const a = convVec(HALO_CFG.clampMin);
  const b = convVec(HALO_CFG.clampMax);
  const clampMin = new THREE.Vector3(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.min(a.z, b.z));
  const clampMax = new THREE.Vector3(Math.max(a.x, b.x), Math.max(a.y, b.y), Math.max(a.z, b.z));
  const relRot = convQuat(HALO_CFG.relRot);

  root.updateWorldMatrix(true, true);
  headObj.updateWorldMatrix(true, false);
  haloObj.updateWorldMatrix(true, true);
  headObj.matrixWorld.decompose(_hv, _hq, _hs);
  const targetPos = relPos.clone().applyMatrix4(headObj.matrixWorld);
  const targetQuat = _hq.clone().multiply(relRot);
  const followerRoot = new THREE.Group();
  followerRoot.name = `${haloObj.name || 'Halo'}_FxFollowerRoot`;
  followerRoot.position.copy(targetPos);
  followerRoot.quaternion.copy(targetQuat);
  scene.add(followerRoot);
  followerRoot.updateWorldMatrix(true, false);
  followerRoot.attach(haloObj);

  return {
    root,
    head: headObj,
    halo: followerRoot,
    relPos,
    relRot,
    clampMin,
    clampMax,
    relPos0: relPos.clone(),
    clampMin0: clampMin.clone(),
    clampMax0: clampMax.clone(),
    extraTweak: null,
    posPow: HALO_CFG.posPow,
    rotPow: HALO_CFG.rotPow,
    prevPos: targetPos.clone(),
    prevQuat: targetQuat.clone(),
    init: true,
  };
}

export function updateHaloFollower(f: HaloFollower | null): void {
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
  f.halo.quaternion.copy(f.prevQuat);
  if (f.extraTweak) f.halo.quaternion.multiply(f.extraTweak);
  f.halo.position.copy(_hlp);
  f.init = true;
}

/** Apply or clear a scene-specific head-local halo target and orientation correction. */
export function setHaloOverride(follower: HaloFollower | null, override: ChibiHaloOverride | null) {
  if (!follower) return;
  if (!override) {
    follower.relPos.copy(follower.relPos0);
    follower.clampMin.copy(follower.clampMin0);
    follower.clampMax.copy(follower.clampMax0);
    follower.extraTweak = null;
    follower.init = false;
    return;
  }
  const position = override.pos ?? [follower.relPos.x, follower.relPos.y, follower.relPos.z];
  follower.relPos.set(position[0], position[1], position[2]);
  follower.clampMin.set(position[0] - 10, position[1] - 10, position[2] - 10);
  follower.clampMax.set(position[0] + 10, position[1] + 10, position[2] + 10);
  const rotation = override.rot;
  if (rotation?.some(Boolean)) {
    const D = Math.PI / 180;
    follower.extraTweak = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rotation[0] * D, rotation[1] * D, rotation[2] * D),
    );
  } else {
    follower.extraTweak = null;
  }
  follower.init = false;
}
