export type PullRecapResultKind = 'new' | 'dupe';
export const PULL_RECAP_PITY_MARKS = ['fiftyFifty', 'fiftyFiftyLost', 'hardPity'] as const;
export type PullRecapPityMark = (typeof PULL_RECAP_PITY_MARKS)[number];

export interface PullRecapResult {
  id: number;
  studentId: number;
  kind: PullRecapResultKind;
  pullNumber?: number;
  pityMark?: PullRecapPityMark;
}

export interface PullRecapResultSection {
  kind: PullRecapResultKind;
  cards: (PullRecapResult & {
    name?: string;
    portrait: string;
    elephArtwork?: string;
  })[];
}

export interface PullRecapDraft {
  version: 1;
  title: string;
  pullCount: number | null;
  results: PullRecapResult[];
}
