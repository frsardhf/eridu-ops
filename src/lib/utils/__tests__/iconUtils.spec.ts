import { describe, expect, it } from 'vitest';

import { getChibiVoiceUrl } from '../iconUtils';

describe('getChibiVoiceUrl', () => {
  it.each([
    [
      'ch0158',
      'formation_select',
      'https://r2.schaledb.com/voice/jp_ch0158/ch0158_formation_select.mp3',
    ],
    [
      'ch0155',
      'battle_recovery_1',
      'https://r2.schaledb.com/voice/jp_ch0155/ch0155_battle_recovery_1.mp3',
    ],
    [
      'aris_original',
      'formation_select',
      'https://r2.schaledb.com/voice/jp_aris/aris_formation_select.mp3',
    ],
    [
      'izuna_original',
      'formation_select',
      'https://r2.schaledb.com/voice/jp_izuna/izuna_formation_select.mp3',
    ],
    [
      'hoshino_swimsuit',
      'formation_select',
      'https://r2.schaledb.com/voice/jp_hoshinoswimsuit/hoshinoswimsuit_formation_select.mp3',
    ],
  ])('maps %s to its SchaleDB voice asset id', (charId, line, expectedUrl) => {
    expect(getChibiVoiceUrl(charId, line)).toBe(expectedUrl);
  });

  it('maps older legacy cafe monolog names to cafe_act', () => {
    expect(getChibiVoiceUrl('hihumi_original', 'cafe_monolog_2')).toBe(
      'https://r2.schaledb.com/voice/jp_hihumi/hihumi_cafe_act_2.mp3',
    );
  });

  it('preserves cafe_monolog for legacy assets that use the newer naming', () => {
    expect(getChibiVoiceUrl('izuna_original', 'cafe_monolog_2')).toBe(
      'https://r2.schaledb.com/voice/jp_izuna/izuna_cafe_monolog_2.mp3',
    );
  });
});
