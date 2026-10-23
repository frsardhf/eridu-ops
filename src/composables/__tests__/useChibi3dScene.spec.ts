// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import * as THREE from 'three';
import { useChibi3dScene } from '../useChibi3dScene';
import { driveMouth, driveRenderers } from '../chibi3dCore';

const rendererSpies = vi.hoisted(() => ({
  pixelRatio: vi.fn(),
  render: vi.fn<(scene: THREE.Scene, camera: THREE.PerspectiveCamera) => void>(),
}));

vi.mock('three', async (original) => ({
  ...(await original<typeof import('three')>()),
  WebGLRenderer: class {
    setPixelRatio = rendererSpies.pixelRatio;
    setSize() {}
    setClearColor() {}
    render = rendererSpies.render;
    dispose() {}
    forceContextLoss() {}
  },
}));
vi.mock('../chibi3dCore', async (original) => {
  const real = await original<typeof import('../chibi3dCore')>();
  const three = await import('three');
  return {
    ...real,
    createGltfLoader: () => ({
      load: (_url: string, done: (value: unknown) => void) =>
        done({
          scene: new three.Group(),
          animations: ['Cafe_Idle', 'Formation_Pickup'].map(
            (name) =>
              new three.AnimationClip(`Hihumi_${name}`, 2, [
                new three.NumberKeyframeTrack('.position[x]', [0, 2], [0, 1]),
              ]),
          ),
        }),
    }),
    applyManifestMaterials: () => [],
    createRendererTimeline: () => null,
    makeHaloFollower: () => null,
    driveMouth: vi.fn(),
    driveRenderers: vi.fn(),
  };
});

let app: App;
let transport: ReturnType<typeof useChibi3dScene>;
let frames: FrameRequestCallback[];
let coarsePointer = false;
function frame() {
  const batch = frames.splice(0);
  for (const callback of batch) callback(0);
}

beforeEach(async () => {
  frames = [];
  coarsePointer = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: coarsePointer,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.spyOn(THREE.Clock.prototype, 'getDelta').mockReturnValue(0.1);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        dev: 'Hihumi',
        model: 'hihumi.glb',
        materials: {},
        mouth: {},
      }),
    })),
  );
  app = createApp({
    setup() {
      const canvas = ref<HTMLCanvasElement | null>(null);
      transport = useChibi3dScene(canvas, {
        charId: 'hihumi_original',
        size: 540,
        fullStage: true,
      });
      return () => h('canvas', { ref: canvas });
    },
  });
  app.mount(document.createElement('div'));
  for (let i = 0; i < 10; i++) await nextTick();
  expect(transport.ready.value).toBe(true);
});
afterEach(() => {
  app.unmount();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('chibi animation transport', () => {
  it('moves the pet image in both axes without moving or rotating its model or camera', () => {
    transport.resize(1280, 720);
    frame();
    const [scene, camera] = rendererSpies.render.mock.lastCall!;
    const root = scene.children.find((child) => child.type === 'Group')!;
    const position = root.position.clone();
    const rotation = root.quaternion.clone();
    const cameraPosition = camera.position.clone();
    for (const [x, y] of [
      [150, 160],
      [1050, 550],
    ]) {
      transport.setScreenPosition(x, y);
      frame();
      camera.updateMatrixWorld();
      const projected = new THREE.Vector3(0, 0.6, 0).project(camera);
      expect(((projected.x + 1) * 1280) / 2).toBeCloseTo(x);
      expect(((1 - projected.y) * 720) / 2).toBeCloseTo(y);
      expect(root.position.equals(position)).toBe(true);
      expect(root.quaternion.equals(rotation)).toBe(true);
      expect(camera.position.equals(cameraPosition)).toBe(true);
    }
    transport.setZoom(1.25);
    transport.resize(1920, 1080);
    frame();
    camera.updateMatrixWorld();
    const projected = new THREE.Vector3(0, 0.6, 0).project(camera);
    expect(((projected.x + 1) * 1920) / 2).toBeCloseTo(1050);
    expect(((1 - projected.y) * 1080) / 2).toBeCloseTo(550);
  });

  it('clears pet framing for orbit controls and restores it after leaving orbit', () => {
    transport.resize(1280, 720);
    transport.setScreenPosition(200, 180);
    frame();
    const [, camera] = rendererSpies.render.mock.lastCall!;
    expect(camera.view?.enabled).toBe(true);
    transport.setOrbitEnabled(true, document.createElement('div'));
    frame();
    expect(camera.view?.enabled).toBe(false);
    transport.setScreenPosition(1000, 500);
    expect(camera.view?.enabled).toBe(false);
    transport.setOrbitEnabled(false);
    transport.setScreenPosition(640, 360);
    frame();
    expect(camera.view?.enabled).toBe(true);
    expect(camera.view?.offsetX).toBe(0);
    expect(camera.view?.offsetY).toBe(0);
    camera.updateMatrixWorld();
    const projected = new THREE.Vector3(0, 0.6, 0).project(camera);
    expect(projected.x).toBeCloseTo(0);
    expect(projected.y).toBeCloseTo(0);
  });

  it('applies desktop and touch render budgets on setup and resize', () => {
    expect(rendererSpies.pixelRatio.mock.lastCall?.[0]).toBe(2);
    transport.resize(1920, 1080);
    expect(rendererSpies.pixelRatio.mock.lastCall?.[0]).toBeCloseTo(1.964);
    coarsePointer = true;
    transport.resize(1920, 1080);
    expect(rendererSpies.pixelRatio.mock.lastCall?.[0]).toBe(1);
    transport.resize(812, 375);
    expect(rendererSpies.pixelRatio.mock.lastCall?.[0]).toBe(2);
  });

  it('uses canonical legacy names and freezes the real clip time while paused', () => {
    transport.play('Cafe_Idle');
    frame();
    expect(transport.playback.clip).toBe('Cafe_Idle');
    expect(transport.playback.duration).toBe(2);
    const time = transport.playback.time;
    transport.setPaused(true);
    frame();
    frame();
    expect(transport.playback.time).toBe(time);
    transport.setPaused(false);
    frame();
    expect(transport.playback.time).toBeGreaterThan(time);
  });

  it('evaluates timelines when seeking backwards and restores the prior pause state', () => {
    transport.play('Cafe_Idle');
    transport.beginSeek();
    transport.seek(1.5);
    frame();
    expect(transport.playback.time).toBe(1.5);
    expect(vi.mocked(driveMouth).mock.lastCall?.[2]).toBe(1.5);
    transport.seek(0.3);
    frame();
    expect(vi.mocked(driveRenderers).mock.lastCall?.[2]).toBe(0.3);
    transport.endSeek();
    expect(transport.playback.paused).toBe(false);
    transport.setPaused(true);
    transport.beginSeek();
    transport.seek(-10);
    expect(transport.playback.time).toBe(0);
    transport.endSeek();
    expect(transport.playback.paused).toBe(true);
  });

  it('holds a scrubbed one-shot without invoking its pet behavior callback', () => {
    const onEnd = vi.fn();
    transport.play('Formation_Pickup', { loop: false, onEnd });
    transport.beginSeek();
    transport.seek(99);
    frame();
    expect(transport.playback.time).toBe(2);
    transport.seek(1);
    transport.endSeek();
    for (let i = 0; i < 30; i++) frame();
    expect(onEnd).not.toHaveBeenCalled();
    expect(transport.playback.clip).toBe('Formation_Pickup');
  });
});
