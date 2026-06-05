/**
 * Curated user-facing changelog.
 *
 * Workflow for new entries:
 *  1. Run `npm run changelog:draft` to dump commits since the last entry's
 *     `toCommit` as a markdown summary.
 *  2. Feed the summary to an LLM with the prompt in scripts/changelog-draft.mjs.
 *  3. Paste the resulting object at the top of `CHANGELOG` below.
 *
 * Runtime contract:
 *  - Entries are newest-first. CHANGELOG[0] is the entry that auto-opens for
 *    users whose `lastSeenChangelogId` doesn't match.
 *  - `fromCommit` / `toCommit` are metadata for the draft script only —
 *    nothing reads them at runtime.
 *  - All user-facing strings (title, summary, highlights) are inline-localized
 *    `{ en, jp }` so each entry stays self-contained; this avoids bloating
 *    `locales/index.ts` with ~70 changelog-only keys.
 */

import { computed } from 'vue';
import { currentLanguage } from '@/lib/stores/localizationStore';

export interface LocalizedText {
  en: string;
  jp: string;
}

/**
 * One feature block within a multi-feature release. Use this when a single
 * release date covers two or more independent deliverables that each deserve
 * their own header (e.g. a frontend page + a backend OCR upgrade shipped the
 * same week). Single-feature entries skip `sections` and use `highlights`.
 */
export interface ChangelogSection {
  title: LocalizedText;
  highlights: LocalizedText[];
}

export interface ChangelogEntry {
  id: string;
  date: string;            // YYYY-MM-DD, display only
  title: LocalizedText;
  summary: LocalizedText;
  /** Multi-feature release. Mutually exclusive with `highlights` at the modal. */
  sections?: ChangelogSection[];
  /** Flat list for single-feature releases. Ignored when `sections` is set. */
  highlights?: LocalizedText[];
  fromCommit?: string;     // metadata for the draft script
  toCommit?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-06-hall-and-farming',
    date: '2026-06-04',
    title: {
      en: 'Bond 100 Hall & equipment farming',
      jp: '絆100殿堂と装備ファーム',
    },
    summary: {
      en: 'A community Bond 100 wall, a new equipment farming planner, and a refreshed landing page and navigation.',
      jp: 'コミュニティの絆100ウォール、新しい装備ファームプランナー、刷新されたランディングページとナビゲーションを追加。',
    },
    sections: [
      {
        title: { en: 'Bond 100 Hall', jp: '絆100殿堂' },
        highlights: [
          {
            en: 'A new Hall page shows how many players have reached Bond 100 with each student across the Global servers.',
            jp: '新しい殿堂ページで、グローバル各サーバーで各生徒と絆100に到達したプレイヤー数を表示。',
          },
          {
            en: "Open one to see who's there, with per-server breakdowns and stats; counts refresh daily from public ranking data via arona.icu.",
            jp: '生徒を開くと、サーバー別の内訳や統計とともに到達者を確認できます。件数は arona.icu 経由の公開ランキングデータから毎日更新されます。',
          },
        ],
      },
      {
        title: { en: 'Equipment farming suggestions', jp: '装備ファームの提案' },
        highlights: [
          {
            en: 'A new Students tool recommends which normal stages to farm for your missing Tier 2+ equipment, with expected runs and AP per stage and a 2× / 3× drop-event toggle.',
            jp: '新しい生徒ツールが、不足しているTier2以上の装備を集めるのに最適な通常ステージを、想定周回数・APと2倍／3倍のドロップイベント倍率の切り替え付きで提案。',
          },
        ],
      },
      {
        title: { en: 'Navigation & polish', jp: 'ナビゲーションと細かな改善' },
        highlights: [
          {
            en: 'A new landing page with quick-access cards for Students, Bonds, and the Hall, plus Contact and Credits.',
            jp: '生徒・絆・殿堂へのクイックアクセスカードに加え、問い合わせとクレジットも開ける新しいランディングページ。',
          },
          {
            en: 'A responsive navbar with redesigned dropdown menus and per-card overlay toggles in the student grid.',
            jp: 'レスポンシブなナビゲーションバー、刷新されたドロップダウンメニュー、生徒一覧のカードごとの表示切り替えを追加。',
          },
        ],
      },
    ],
    fromCommit: 'eeb7a0f',
    toCommit: '616b83b',
  },
  {
    id: '2026-05-scanner-batch',
    date: '2026-05-29',
    title: {
      en: 'Faster scanner & multi-screenshot',
      jp: 'スキャナー高速化と複数スクリーンショット対応',
    },
    summary: {
      en: 'Faster quantity scanning, plus support for up to 3 screenshots in one scan.',
      jp: '数量スキャンを高速化し、1回で最大3枚のスクリーンショットに対応。',
    },
    highlights: [
      {
        en: 'Quantity scanning now runs entirely on fast cloud vision models, dropping the slow fallback that could take a few minutes.',
        jp: '数量スキャンを高速なクラウドビジョンモデルのみに変更し、数分かかることがあった低速フォールバックを廃止。',
      },
      {
        en: 'Scan up to 3 screenshots in a single upload instead of one at a time.',
        jp: '1枚ずつではなく、1回のアップロードで最大3枚のスクリーンショットをスキャン。',
      },
      {
        en: 'Items are still detected when the daily scan limit is reached, leaving only the quantities blank to fill in.',
        jp: '1日のスキャン上限に達してもアイテムは検出され、数量のみ空欄になり手動で入力できます。',
      },
    ],
    fromCommit: '75518b5',
  },
  {
    id: '2026-05-release',
    date: '2026-05-26',
    title: {
      en: 'May 2026 release',
      jp: '2026年5月リリース',
    },
    summary: {
      en: 'A dedicated bonds planner plus a major scanner accuracy upgrade.',
      jp: '専用の絆プランナーと、スキャナー精度の大幅な改善。',
    },
    sections: [
      {
        title: {
          en: 'Bond planner page',
          jp: '絆プランナーページ',
        },
        highlights: [
          {
            en: 'Track multiple students from the new Bonds page (tabs or cards layout).',
            jp: '新しい絆ページから複数の生徒を追跡（タブまたはカード表示）。',
          },
          {
            en: 'Plan gifts, cafe taps, and bonus EXP from lessons in one place.',
            jp: 'ギフト、カフェタップ、レッスンからのボーナスEXPをまとめて計画。',
          },
          {
            en: 'See per-gift EXP breakdowns and a projected new bond level live.',
            jp: 'ギフトごとのEXP内訳と予測される新しい絆レベルをリアルタイム表示。',
          },
          {
            en: 'Jump between the student modal and bond planner with deep links.',
            jp: '生徒モーダルと絆プランナー間をディープリンクで移動可能。',
          },
        ],
      },
      {
        title: {
          en: 'Scanner accuracy upgrade',
          jp: 'スキャナー精度の改善',
        },
        highlights: [
          {
            en: 'Quantity OCR upgraded from EasyOCR to Gemini Flash (≈100% accuracy), with a Florence-2 fallback (≈99%) when Gemini is unavailable.',
            jp: '数量OCRをEasyOCRからGemini Flashにアップグレード（精度約100%）。Gemini利用不可時はFlorence-2にフォールバック（約99%）。',
          },
          {
            en: 'Fewer mis-reads on quantities and items, with clearer flags on uncertain cells.',
            jp: '数量とアイテムの誤読が減少し、不確かなセルがより明確に表示されます。',
          },
        ],
      },
    ],
    fromCommit: 'fd07486',
    toCommit: '75518b5',
  },
  {
    id: '2026-05-scanner-tools',
    date: '2026-05-15',
    title: {
      en: 'Inventory screenshot scanner',
      jp: 'インベントリスクリーンショットスキャナー',
    },
    summary: {
      en: 'Bulk-update item and equipment quantities from an in-game screenshot.',
      jp: 'ゲーム内スクリーンショットからアイテム・装備の数量を一括更新。',
    },
    highlights: [
      {
        en: 'Drop, paste, or pick a screenshot and OCR fills the quantities for you.',
        jp: 'スクリーンショットをドロップ、貼り付け、または選択するとOCRが数量を入力。',
      },
      {
        en: 'Confidence indicators flag uncertain reads for quick review.',
        jp: '信頼度インジケーターが不確かな読み取りを表示し、素早く確認可能。',
      },
      {
        en: 'Built-in guide explains screenshot prerequisites and edge cases.',
        jp: '内蔵ガイドでスクリーンショットの前提条件とエッジケースを説明。',
      },
    ],
    fromCommit: '2c5904f',
    toCommit: '913d905',
  },
  {
    id: '2026-05-filters-crafting',
    date: '2026-05-05',
    title: {
      en: 'Filters & crafting helpers',
      jp: 'フィルターとクラフトヘルパー',
    },
    summary: {
      en: 'Richer student filtering plus a dedicated crafting fodder picker.',
      jp: 'より高度な生徒フィルタリングと専用のクラフト素材ピッカー。',
    },
    highlights: [
      {
        en: 'Filter the student grid by school, equipment slot, attack/defense type, rarity, and availability.',
        jp: '学校、装備スロット、攻撃/防御タイプ、レアリティ、入手可能性で生徒グリッドをフィルタリング。',
      },
      {
        en: 'Crafting Fodder modal: mark surplus materials and configure rarity thresholds.',
        jp: 'クラフト素材モーダル：余剰素材をマークし、レアリティしきい値を設定可能。',
      },
      {
        en: 'Your filter and pin settings now stay between visits.',
        jp: 'フィルターとピン設定が訪問間で保持されるようになりました。',
      },
    ],
    toCommit: '2c5904f',
  },
  {
    id: '2026-04-apply-upgrade',
    date: '2026-04-20',
    title: {
      en: 'Apply upgrades with material preview',
      jp: 'アップグレード適用とマテリアルプレビュー',
    },
    summary: {
      en: 'Commit planned upgrades after seeing exactly what they cost.',
      jp: '計画したアップグレードのコストを確認してから適用。',
    },
    highlights: [
      {
        en: 'Apply Upgrade modal summarises pending changes across levels, skills, potentials, equipment, and grade.',
        jp: '適用モーダルがレベル、スキル、ポテンシャル、装備、グレードの変更をまとめて表示。',
      },
      {
        en: 'Toggle between "Consumed" (what will be spent) and "Remaining" (inventory after) views.',
        jp: '「消費」（消費される量）と「残量」（適用後の在庫）ビューを切り替え可能。',
      },
    ],
    toCommit: 'ae9dacb',
  },
  {
    id: '2026-03-deck-builder-ownership',
    date: '2026-03-15',
    title: {
      en: 'Deck builder & ownership tracking',
      jp: 'デッキビルダーと所持状況管理',
    },
    summary: {
      en: 'Build squads and mark which students you actually own.',
      jp: 'スクワッドを編成し、実際に所持している生徒をマーク。',
    },
    highlights: [
      {
        en: 'Drag-and-drop deck builder for 6-student teams with per-deck notes.',
        jp: '6人編成チーム用のドラッグ＆ドロップ式デッキビルダー、デッキごとのメモ付き。',
      },
      {
        en: 'Toggle ownership per student, and the grid splits into Recruited / Not Recruited sections.',
        jp: '生徒ごとに所持状況を切り替えると、グリッドが入手済み／未入手セクションに分かれます。',
      },
    ],
    toCommit: '0366bcf',
  },
  {
    id: '2026-02-modal-redesign',
    date: '2026-02-10',
    title: {
      en: 'Student modal redesign',
      jp: '生徒モーダルのリデザイン',
    },
    summary: {
      en: 'Tabbed layout for Info, Upgrade, and Gear with reactive material costs.',
      jp: '情報、アップグレード、装備のタブ式レイアウトとリアクティブな素材コスト。',
    },
    highlights: [
      {
        en: 'Changing a level instantly updates material totals.',
        jp: 'レベルを変更すると素材合計が即座に反映されます。',
      },
      {
        en: 'Inline editors for levels, skills, potentials, and grade infos.',
        jp: 'レベル、スキル、ポテンシャル、グレード情報のインラインエディター。',
      },
    ],
    toCommit: '4990c63',
  },
  {
    id: '2026-01-indexeddb-migration',
    date: '2026-01-25',
    title: {
      en: 'IndexedDB storage migration',
      jp: 'IndexedDBストレージへの移行',
    },
    summary: {
      en: 'All planner data moved to IndexedDB for better capacity and reliability.',
      jp: 'すべてのプランナーデータをIndexedDBに移行し、容量と信頼性を向上。',
    },
    highlights: [
      {
        en: 'No more localStorage size limits, so you can track every student you want.',
        jp: 'localStorageのサイズ制限がなくなり、好きなだけ生徒を追跡できます。',
      },
      {
        en: 'Automatic one-time migration from the old format on first load.',
        jp: '初回ロード時に旧形式から自動的に一度だけ移行。',
      },
      {
        en: 'Updated Import / Export format covers the new tables.',
        jp: 'インポート/エクスポート形式が新テーブルに対応。',
      },
    ],
    toCommit: '2c5904f',
  },
];

/**
 * Resolve a `LocalizedText` against the active language. Falls back to EN if
 * the current language is missing (defensive — keeps the modal usable if a
 * future entry forgets a translation).
 */
export const localizeChangelogText = (text: LocalizedText): string =>
  text[currentLanguage.value] ?? text.en;

/** Reactive helper for `<template>` use — re-renders when language changes. */
export const useChangelogText = (text: LocalizedText) =>
  computed(() => localizeChangelogText(text));
