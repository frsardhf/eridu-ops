import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { chibiPixelRatio, roomFieldOfView, roomPosition } from '../chibi3dViewport';
import { FOV_DEG, CAM_TARGET_Y, positionBaseCamera } from '../chibi3dCore';

describe('full-room chibi viewport', () => {
  it.each([
    [1280, 800],
    [375, 812],
    [540, 540],
  ])('projects destinations in both screen axes at %s x %s', (width, height) => {
    const target = new THREE.Vector3(0, CAM_TARGET_Y, 0);
    for (const zoom of [0.5, 1.25, 2]) {
      const camera = new THREE.PerspectiveCamera(
        roomFieldOfView(FOV_DEG, height, 540),
        width / height,
        0.01,
        100,
      );
      positionBaseCamera(camera, zoom);
      for (const [x, y] of [
        [50, 60],
        [width / 2, height / 2],
        [width - 50, height - 60],
      ]) {
        const projected = roomPosition(camera, width, height, x, y, target)
          .add(target)
          .project(camera);
        expect(((projected.x + 1) * width) / 2).toBeCloseTo(x);
        expect(((1 - projected.y) * height) / 2).toBeCloseTo(y);
      }
    }
  });

  it('preserves model size as the room grows beyond the old square', () => {
    const pixels = (height: number) => {
      const camera = new THREE.PerspectiveCamera(
        roomFieldOfView(FOV_DEG, height, 540),
        1,
        0.01,
        100,
      );
      positionBaseCamera(camera, 1.25);
      camera.updateMatrixWorld();
      const a = new THREE.Vector3(0, CAM_TARGET_Y, 0).project(camera);
      const b = new THREE.Vector3(0, CAM_TARGET_Y + 0.5, 0).project(camera);
      return ((b.y - a.y) * height) / 2;
    };
    expect(pixels(1000)).toBeCloseTo(pixels(540));
  });

  it('preserves existing landing supersampling on desktop and touch devices', () => {
    expect(chibiPixelRatio(540, 540, 3, false)).toBe(4);
    expect(chibiPixelRatio(540, 540, 1, false)).toBe(2);
    expect(chibiPixelRatio(540, 540, 3, false, true)).toBe(4);
  });

  it('uses an eight-million-pixel desktop budget', () => {
    for (const [w, h] of [
      [1280, 800],
      [1920, 1080],
      [2560, 1440],
    ]) {
      const ratio = chibiPixelRatio(w, h, 3);
      expect(w * h * ratio * ratio).toBeCloseTo(8_000_000);
    }
    expect(chibiPixelRatio(1280, 720, 2)).toBeCloseTo(2.946);
    expect(chibiPixelRatio(1920, 1080, 2)).toBeCloseTo(1.964);
  });

  it.each([
    [375, 812],
    [812, 375],
    [1024, 1366],
    [1366, 1024],
  ])('keeps touch devices at two million pixels at %s x %s', (w, h) => {
    const ratio = chibiPixelRatio(w, h, 3, true, true);
    expect(w * h * ratio * ratio).toBeCloseTo(2_000_000);
  });

  it('never renders rooms below CSS resolution, even above the pixel budget', () => {
    expect(chibiPixelRatio(3840, 2160, 2)).toBe(1);
    expect(chibiPixelRatio(5120, 2880, 2)).toBe(1);
    expect(chibiPixelRatio(2560, 1440, 2, true, true)).toBe(1);
    expect(chibiPixelRatio(1280, 720, 0.4)).toBe(1);
  });

  it('retains the existing supersampling ceiling when the room is small', () => {
    expect(chibiPixelRatio(540, 540, 3)).toBe(4);
    expect(chibiPixelRatio(540, 540, 1)).toBe(2);
  });
});
