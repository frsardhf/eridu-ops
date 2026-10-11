// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, h, nextTick, ref, type App } from 'vue';
import Chibi3dPet from '../Chibi3dPet.vue';

const scene = vi.hoisted(() => ({
  position: vi.fn(),
  play: vi.fn(),
  playback: { clip: 'Cafe_Idle', time: 0, duration: 2, paused: false },
}));
vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue');
  return { usePreferredReducedMotion: () => ref('no-preference') };
});
vi.mock('@/composables/useChibiVoice', () => ({
  useChibiVoice: () => ({
    status: {},
    playPickup: vi.fn(),
    playRecovery: vi.fn(),
    playArmedMove: vi.fn(),
    playIdleMonolog: vi.fn(),
    loadBattleLines: vi.fn(),
    stopVoice: vi.fn(),
  }),
}));
vi.mock('@/composables/useChibi3dScene', async () => {
  const { reactive, ref } = await import('vue');
  scene.playback = reactive(scene.playback);
  return {
    useChibi3dScene: () => ({
      ready: ref(true),
      error: ref(false),
      clipNames: ref(['Cafe_Idle', 'Cafe_Walk']),
      play: scene.play,
      hasClip: (clip: string) => clip === 'Cafe_Idle' || clip === 'Cafe_Walk',
      setFacing: vi.fn(),
      faceCamera: vi.fn(),
      isPointerOnModel: () => false,
      getModelBoundsPx: () => null,
      setOrbitEnabled: vi.fn(),
      setZoom: vi.fn(),
      resize: vi.fn(),
      playback: scene.playback,
      setPaused: (paused: boolean) => {
        scene.playback.paused = paused;
      },
      beginSeek: () => {
        scene.playback.paused = true;
      },
      seek: vi.fn(),
      endSeek: vi.fn(),
      resetView: vi.fn(),
      setScreenPosition: scene.position,
    }),
  };
});

let app: App;
let root: HTMLElement;
let frames: FrameRequestCallback[];
const pet = ref<InstanceType<typeof Chibi3dPet> | null>(null);
function frame(time: number) {
  for (const callback of frames.splice(0)) callback(time);
}
async function mount(fullStage = true, wander = false) {
  root = document.createElement('div');
  app = createApp(() =>
    h(Chibi3dPet, {
      ref: pet,
      charId: 'ch0001',
      size: 540,
      speed: 100,
      fullStage,
      wander,
      voice: false,
      centerOnMount: fullStage,
      startX: 40,
      startY: 60,
    }),
  );
  app.mount(root);
  await nextTick();
  frame(1);
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  scene.playback.paused = false;
  frames = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  app.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('chibi movement and preview ownership', () => {
  it('moves in both axes and freezes/resumes the destination when paused', async () => {
    await mount();
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;
    pet.value!.walkTo(x + 200, y + 200);
    frame(1001);
    const moving = scene.position.mock.lastCall! as [number, number];
    expect(moving[0]).toBeGreaterThan(x);
    expect(moving[1]).toBeGreaterThan(y);
    pet.value!.setPaused(true);
    frame(2001);
    expect(scene.position.mock.lastCall).toEqual(moving);
    pet.value!.setPaused(false);
    frame(3001);
    expect(scene.position.mock.lastCall![0]).toBeGreaterThan(moving[0]);
    expect(scene.position.mock.lastCall![1]).toBeGreaterThan(moving[1]);
  });

  it('scrubbing cancels translation and a manual preview is not replaced by wandering', async () => {
    await mount(true, true);
    pet.value!.walkTo(800, 650);
    frame(1001);
    pet.value!.beginSeek();
    const position = scene.position.mock.lastCall;
    scene.playback.paused = false;
    frame(2001);
    expect(scene.position.mock.lastCall).toEqual(position);
    pet.value!.playClip('Cafe_Idle');
    const count = scene.play.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    frame(3001);
    expect(scene.play.mock.calls.length).toBe(count);
    expect(scene.position.mock.lastCall).toEqual(position);
  });

  it('retains the small translated landing canvas and its starting position', async () => {
    await mount(false);
    expect(root.querySelector<HTMLElement>('.chibi-pet')?.style.transform).toContain('40px, 60px');
    expect(root.querySelector('canvas')?.style.width).toBe('540px');
    expect(scene.position).not.toHaveBeenCalled();
  });
});
