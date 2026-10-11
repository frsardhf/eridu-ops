import * as THREE from 'three';

/** Preserve the reference canvas's pixels per model unit when the room grows. */
export function roomFieldOfView(baseFov: number, height: number, referenceSize: number): number {
  return THREE.MathUtils.radToDeg(
    2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(baseFov) / 2) * height) / referenceSize),
  );
}

/** Bound room supersampling without dropping below CSS resolution; keep landing pets unchanged. */
export function chibiPixelRatio(
  width: number,
  height: number,
  deviceRatio: number,
  fullRoom = true,
  coarsePointer = false,
): number {
  const supersampled = Math.min(deviceRatio, 2) * 2;
  if (!fullRoom) return supersampled;
  const pixelBudget = coarsePointer ? 2_000_000 : 8_000_000;
  return Math.max(1, Math.min(supersampled, Math.sqrt(pixelBudget / (width * height))));
}

/** Convert a room pixel to an offset on the camera-facing movement plane. */
export function roomPosition(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  x: number,
  y: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  camera.updateMatrixWorld();
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(direction, target);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((x / width) * 2 - 1, 1 - (y / height) * 2), camera);
  return ray.ray.intersectPlane(plane, new THREE.Vector3())?.sub(target) ?? new THREE.Vector3();
}
