import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import type { ChibiManifest, ChibiMouthEvent } from '@/types/chibi';

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

// The four mouth-overlay uniforms injected into the EyeMouth MeshToonMaterial.
export interface MouthUniforms {
  uMouthTex: { value: THREE.Texture | null };
  uMouthMask: { value: THREE.Texture | null };
  uMouthCell: { value: THREE.Vector2 };
  uMouthOffset: { value: THREE.Vector2 };
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
  geomCenter: THREE.Vector3;
  tweakQuat: THREE.Quaternion;
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
export const bareClipName = (name: string): string => name.replace(/^CH\d+_/i, '');

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

// mouth event (col,row) -> uMouthCell (Unity 1-indexed): common.js codeToCell.
const codeToCell = (col: number, row: number): [number, number] => [col + 1, row + 1];

/** Set the mouth cell for the active clip time from its timeline (no-op without a face). */
export function driveMouth(
  uniforms: MouthUniforms | null,
  mouth: ChibiMouthEvent[],
  time: number,
): void {
  if (!uniforms || !mouth.length) return;
  let cur = mouth[0];
  for (const e of mouth) {
    if (e.t <= time) cur = e;
    else break;
  }
  const [c, r] = codeToCell(cur.col, cur.row);
  uniforms.uMouthCell.value.set(c, r);
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
): MouthUniforms | null {
  let mouthUniforms: MouthUniforms | null = null;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material & { name?: string; map?: THREE.Texture | null };
    const matName = (mat?.name || mesh.name || '').toLowerCase();
    const key = Object.keys(manifest.materials).find((k) => matName.includes(k.toLowerCase()));
    const def = key ? manifest.materials[key] : null;
    const baseMap = mat?.map ?? null;
    if (def?.shader === 'eyemouth') {
      const built = makeEyeMouth(baseMap, atlas, mask, grad);
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
      mesh.material = new THREE.MeshToonMaterial({ map: baseMap, gradientMap: grad });
    }
  });
  return mouthUniforms;
}

/** Re-material every mesh under `root` as a plain toon (furniture: no manifest, just base maps). */
export function applyToonMaterials(root: THREE.Object3D, grad: THREE.DataTexture): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mat = mesh.material as THREE.Material & { map?: THREE.Texture | null };
    mesh.material = new THREE.MeshToonMaterial({ map: mat?.map ?? null, gradientMap: grad });
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
  tweakDeg: [85, 0, 0] as const, // visual ring-tilt correction after the LH->RH flip
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
const _hoff = new THREE.Vector3();

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
    tweakQuat: new THREE.Quaternion().setFromEuler(
      new THREE.Euler(td[0] * D, td[1] * D, td[2] * D),
    ),
    posPow: HALO_CFG.posPow,
    rotPow: HALO_CFG.rotPow,
    prevPos: new THREE.Vector3(),
    prevQuat: new THREE.Quaternion(),
    init: false,
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
  f.halo.quaternion.copy(f.prevQuat).multiply(f.tweakQuat);
  _hoff.copy(f.geomCenter).multiply(f.halo.scale).applyQuaternion(f.halo.quaternion);
  f.halo.position.copy(_hlp).sub(_hoff);
  f.init = true;
}
