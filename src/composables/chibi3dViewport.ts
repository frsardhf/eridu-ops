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

/** Move the pet's image without changing its camera-relative angle or depth. */
export function setRoomViewOffset(
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  x: number,
  y: number,
): void {
  const offsetX = width / 2 - x;
  const offsetY = height / 2 - y;
  const view = camera.view;
  if (
    view?.enabled &&
    view.fullWidth === width &&
    view.fullHeight === height &&
    view.width === width &&
    view.height === height &&
    view.offsetX === offsetX &&
    view.offsetY === offsetY
  )
    return;
  camera.setViewOffset(width, height, offsetX, offsetY, width, height);
}
