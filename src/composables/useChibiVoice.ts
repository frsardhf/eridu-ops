import { reactive, onUnmounted } from 'vue';
import { getChibiVoiceUrl } from '@/lib/utils/iconUtils';

/**
 * SchaleDB R2 voice for a chibi. Preloads the pickup line + the armed-move pool via
 * HTMLAudioElement (no CORS needed for playback), tracks per-line availability (characters
 * don't all have every line — e.g. specials often lack the battle lines), and plays
 * one-shots that restart on retrigger. `status` feeds the test page's availability readout.
 */

export type VoiceStatus = 'loading' | 'available' | 'missing';

/** Pickup (grab) line. */
const PICKUP_LINE = 'formation_select';
/** Armed-walk (Move_Ing) pool — gacha'd among the *available* ones when a striker sorties. */
const ARMED_MOVE_LINES = ['battle_move_1', 'battle_move_2', 'battle_tacticalaction_1'] as const;
/** Idle-chatter pool — gacha'd periodically while she stands idle (every character has all 5). */
const MONOLOG_LINES = [
  'cafe_monolog_1',
  'cafe_monolog_2',
  'cafe_monolog_3',
  'cafe_monolog_4',
  'cafe_monolog_5',
] as const;

/** All lines this composable manages, in display order (for the availability UI). */
export const CHIBI_VOICE_LINES: readonly string[] = [
  PICKUP_LINE,
  ...ARMED_MOVE_LINES,
  ...MONOLOG_LINES,
];

export function useChibiVoice(charId: string) {
  const status = reactive<Record<string, VoiceStatus>>({});
  const audios: Record<string, HTMLAudioElement> = {};

  for (const line of CHIBI_VOICE_LINES) {
    status[line] = 'loading';
    const audio = new Audio(getChibiVoiceUrl(charId, line));
    audio.preload = 'auto';
    // loadedmetadata = the resource exists and is decodable; error = 404 / not playable.
    audio.addEventListener('loadedmetadata', () => { status[line] = 'available'; }, { once: true });
    audio.addEventListener('error', () => { status[line] = 'missing'; }, { once: true });
    audio.load();
    audios[line] = audio;
  }

  function playLine(line: string): void {
    const audio = audios[line];
    if (!audio || status[line] !== 'available') return;
    audio.currentTime = 0;
    void audio.play().catch(() => {}); // ignore autoplay/abort rejections
  }

  /** Pickup voice (on grab). One-shot, restarts each time. */
  function playPickup(): void {
    playLine(PICKUP_LINE);
  }

  /** Gacha one of the available armed-move lines (on an armed-walk start). No-op if none. */
  function playArmedMove(): void {
    const avail = ARMED_MOVE_LINES.filter((l) => status[l] === 'available');
    if (avail.length) playLine(avail[Math.floor(Math.random() * avail.length)]);
  }

  /** Gacha one of the available cafe monolog lines (periodic idle chatter). No-op if none. */
  function playIdleMonolog(): void {
    const avail = MONOLOG_LINES.filter((l) => status[l] === 'available');
    if (avail.length) playLine(avail[Math.floor(Math.random() * avail.length)]);
  }

  onUnmounted(() => {
    for (const audio of Object.values(audios)) {
      audio.pause();
      audio.src = '';
    }
  });

  return { status, playPickup, playArmedMove, playIdleMonolog };
}
