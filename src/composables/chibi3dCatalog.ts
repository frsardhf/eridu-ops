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

/** Match modern DevName ids and legacy asset folders against IndexedDB student master fields. */
export function getChibiStudentLookupKeys(charId: string): string[] {
  const normalized = charId.toLowerCase();
  const base = normalized.replace(/_original$/, '');
  return base === normalized ? [normalized] : [normalized, base];
}
