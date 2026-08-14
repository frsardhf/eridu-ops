import { describe, expect, it } from 'vitest';

import { CHIBI_CHARACTER_IDS, orderChibiVictoryCharacters } from '../chibi3dCatalog';

describe('chibi character catalog', () => {
  it('includes every complete character in the current deliverable', () => {
    expect(CHIBI_CHARACTER_IDS).toHaveLength(40);
    expect(CHIBI_CHARACTER_IDS).toEqual(
      expect.arrayContaining(['ch0114', 'ch0139', 'ch0205', 'hinata_original', 'kirara_original']),
    );
  });
});

describe('orderChibiVictoryCharacters', () => {
  it('preserves the explicit Aris and Kei stage order', () => {
    const clips = new Map<string, readonly string[]>([
      ['aris_original', ['Cafe_my_event12_gamemachine_01', 'Victory_End_Interaction']],
      ['ch0335', ['my_event088_pastmemory_01', 'Victory_End_Interaction_02']],
    ]);

    expect(orderChibiVictoryCharacters(['aris_original', 'ch0335'], clips)).toEqual([
      'aris_original',
      'ch0335',
    ]);
  });

  it('preserves the explicit armed Aris and Kei stage order', () => {
    const clips = new Map<string, readonly string[]>([
      ['ch0334', ['Cafe_my_event088_maintenancestation_01', 'Victory_End_interaction']],
      ['ch0335', ['my_event088_pastmemory_01', 'Victory_End_interaction_01']],
    ]);

    expect(orderChibiVictoryCharacters(['ch0334', 'ch0335'], clips)).toEqual(['ch0334', 'ch0335']);
  });

  it('reverses a furniture-derived pair like the POC', () => {
    const clips = new Map<string, readonly string[]>([
      ['ch0242', ['Cafe_my_highlander_01_toytrain_01', 'Victory_Start_Interaction']],
      ['ch0243', ['Cafe_my_highlander_01_toytrain_01', 'Victory_Start_Interaction']],
    ]);

    expect(orderChibiVictoryCharacters(['ch0242', 'ch0243'], clips)).toEqual(['ch0243', 'ch0242']);
  });
});
