// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import * as THREE from 'three';
import { useChibi3dScene } from '../useChibi3dScene';
import { driveMouth, driveRenderers } from '../chibi3dCore';

vi.mock('three', async (original) => ({
  ...(await original<typeof import('three')>()),
  WebGLRenderer: class {
    setPixelRatio() {}
    setSize() {}
    setClearColor() {}
    render() {}
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
function frame() {
  const batch = frames.splice(0);
  for (const callback of batch) callback(0);
}

beforeEach(async () => {
  frames = [];
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
