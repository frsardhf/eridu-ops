/** Character assets with complete GLBs in the current chibi deliverable. */
export const CHIBI_CHARACTER_IDS = [
  'aris_original',
  'ch0137',
  'ch0152',
  'ch0155',
  'ch0158',
  'ch0167',
  'ch0198',
  'ch0211',
  'ch0231',
  'ch0235',
  'ch0242',
  'ch0243',
  'ch0293',
  'ch0294',
  'ch0295',
  'ch0310',
  'ch0331',
  'ch0333',
  'ch0334',
  'ch0335',
  'hihumi_original',
  'hoshino_original',
  'hoshino_swimsuit',
  'ibuki_original',
  'izuna_original',
] as const;

/** Furniture GLBs shipped beside the character catalog. */
export const CHIBI_FURNITURE_IDS = [
  'avantgardekun',
  'beachswing',
  'gamingspace',
  'kidstableset',
  'maintenancestation',
  'opencar',
  'pastmemory',
  'retractwindow',
  'swingchair',
  'toytrain',
] as const;

const POC_SHARED_VICTORY_CLIPS = ['Victory_End_Interaction', 'Victory_Start_Interaction'] as const;

/** Match the POC's stage order: reverse furniture-derived duos, preserve explicit groups. */
export function orderChibiVictoryCharacters(
  configuredIds: readonly string[],
  clipKeysByCharacter: ReadonlyMap<string, readonly string[]>,
): string[] {
  const sharesFurniture = CHIBI_FURNITURE_IDS.some((furnitureId) =>
    configuredIds.every((characterId) =>
      (clipKeysByCharacter.get(characterId) ?? []).some((clip) =>
        clip.toLowerCase().includes(furnitureId),
      ),
    ),
  );
  const sharesPocVictoryClip = POC_SHARED_VICTORY_CLIPS.some((victoryClip) =>
    configuredIds.every((characterId) =>
      (clipKeysByCharacter.get(characterId) ?? []).includes(victoryClip),
    ),
  );

  return sharesFurniture && sharesPocVictoryClip
    ? [...configuredIds].reverse()
    : [...configuredIds];
}

/** Match modern DevName ids and legacy asset folders against IndexedDB student master fields. */
export function getChibiStudentLookupKeys(charId: string): string[] {
  const normalized = charId.toLowerCase();
  const base = normalized.replace(/_original$/, '');
  return base === normalized ? [normalized] : [normalized, base];
}
