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
 *  - `fromCommit` / `toCommit` are metadata for the draft script only;
 *    nothing reads them at runtime.
 *  - All user-facing strings (title, summary, highlights) are inline-localized
 *    `{ en, jp, kr }` so each entry stays self-contained; this avoids bloating
 *    `locales/index.ts` with ~70 changelog-only keys. `kr` is optional: a new
 *    entry without it falls back to EN via localizeChangelogText until translated.
 */

import { currentLanguage } from '@/lib/stores/localizationStore';

export interface LocalizedText {
  en: string;
  jp: string;
  /** Optional: a new entry may ship EN/JP first and fall back to EN for KR
   *  (see localizeChangelogText). Add the KR string when available. */
  kr?: string;
}

/**
 * One feature block within a multi-feature release. Use this when a single
 * release date covers two or more independent deliverables that each deserve
 * their own header (e.g. a frontend page + a backend OCR upgrade shipped the
 * same week). Single-feature entries skip `sections` and use `highlights`.
 */
interface ChangelogSection {
  title: LocalizedText;
  highlights: LocalizedText[];
}

export interface ChangelogEntry {
  id: string;
  date: string; // YYYY-MM-DD, display only
  title: LocalizedText;
  summary: LocalizedText;
  /** Multi-feature release. Mutually exclusive with `highlights` at the modal. */
  sections?: ChangelogSection[];
  /** Flat list for single-feature releases. Ignored when `sections` is set. */
  highlights?: LocalizedText[];
  fromCommit?: string; // metadata for the draft script
  toCommit?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-06-scanner-exact-matching',
    date: '2026-06-13',
    title: {
      en: 'Inventory scanner: faster and more accurate',
      jp: 'インベントリスキャナーがより速く、より正確に',
      kr: '인벤토리 스캐너: 더 빠르고 더 정확하게',
    },
    summary: {
      en: 'The inventory scanner now reads your screenshots in seconds and identifies every item correctly.',
      jp: 'インベントリスキャナーが数秒でスクリーンショットを読み取り、アイテムを正確に認識できるようになりました。',
      kr: '인벤토리 스캐너가 이제 스크린샷을 몇 초 만에 읽고 모든 아이템을 정확하게 인식합니다.',
    },
    highlights: [
      {
        en: 'Items are now identified by comparing them directly with the real game icons. In our tests, every item was detected correctly, including ones that look almost the same (like Blu-ray and Tech Note tiers).',
        jp: 'アイテムをゲーム内の実際のアイコンと直接比較して識別するようになりました。テストでは、戦術教育BDや技術ノートのような見た目がそっくりなアイテムも含め、すべて正しく検出されました。',
        kr: '이제 아이템을 게임 내 실제 아이콘과 직접 비교하여 식별합니다. 테스트에서는 전술 교육 BD와 기술 노트 등급처럼 거의 똑같아 보이는 아이템을 포함해 모든 아이템이 정확하게 감지되었습니다.',
      },
      {
        en: 'The "Known limitations" note about similar-looking items was removed from the guide, since this is no longer an issue. Cells the scanner is unsure about are still highlighted so you can double-check them.',
        jp: '見た目が似たアイテムに関する「既知の制限事項」は、問題が解消されたためガイドから削除しました。スキャナーが確信を持てないセルは今までどおりハイライト表示されるので、すぐに確認できます。',
        kr: '비슷하게 생긴 아이템에 관한 "알려진 제한 사항" 안내는 문제가 해결되어 가이드에서 삭제했습니다. 스캐너가 확신하지 못하는 칸은 여전히 강조 표시되어 바로 확인할 수 있습니다.',
      },
    ],
  },
  {
    id: '2026-06-hall-entries-redesign',
    date: '2026-06-07',
    title: {
      en: 'Bond 100 Hall, redesigned',
      jp: '絆100殿堂をリニューアル',
      kr: '인연 100 전당 리뉴얼',
    },
    summary: {
      en: 'A roomier Hall entries view with search, a quicker way to add yourself, and a note on data delays.',
      jp: '殿堂のエントリー表示を見やすく刷新し、検索や自分を追加する手段を追加。データ遅延についての案内も掲載。',
      kr: '더 넉넉해진 전당 항목 보기에 검색, 더 빠른 등록 방법, 데이터 지연 안내를 추가했습니다.',
    },
    highlights: [
      {
        en: 'Opening a student in the Hall now shows a larger portrait and every listed sensei in one scrollable view (no more flipping through pages), plus a search box to find a specific name.',
        jp: '殿堂で生徒を開くと、大きなポートレートと掲載中の全先生を1つのスクロール表示でまとめて確認できるようになりました（ページ送り不要）。名前を探せる検索ボックスも追加。',
        kr: '전당에서 학생을 열면 이제 더 큰 일러스트와 등록된 모든 선생님을 하나의 스크롤 화면에서 볼 수 있으며(페이지 넘김 불필요), 특정 이름을 찾을 수 있는 검색창도 추가되었습니다.',
      },
      {
        en: 'Heads up: the Hall shows a daily snapshot from arona.icu, which is currently having server issues on their side, so newly added or updated players can take longer than usual (sometimes a few days) to appear.',
        jp: 'ご注意：殿堂は arona.icu の1日1回のスナップショットを表示しています。現在 arona.icu 側でサーバーの不具合が発生しているため、新しく追加・更新されたプレイヤーの反映に通常より時間がかかる（数日かかる）場合があります。',
        kr: '참고: 전당은 arona.icu의 일일 스냅샷을 표시합니다. 현재 arona.icu 측 서버 문제로 인해 새로 추가되거나 갱신된 플레이어가 표시되기까지 평소보다 오래(때로는 며칠) 걸릴 수 있습니다.',
      },
    ],
    fromCommit: '616b83b',
    toCommit: 'c8487b9',
  },
  {
    id: '2026-06-hall-and-farming',
    date: '2026-06-04',
    title: {
      en: 'Bond 100 Hall & equipment farming',
      jp: '絆100殿堂と装備ファーム',
      kr: '인연 100 전당과 장비 파밍',
    },
    summary: {
      en: 'A community Bond 100 wall, a new equipment farming planner, and a refreshed landing page and navigation.',
      jp: 'コミュニティの絆100ウォール、新しい装備ファームプランナー、刷新されたランディングページとナビゲーションを追加。',
      kr: '커뮤니티 인연 100 전당, 새로운 장비 파밍 플래너, 새로워진 랜딩 페이지와 내비게이션을 추가했습니다.',
    },
    sections: [
      {
        title: { en: 'Bond 100 Hall', jp: '絆100殿堂', kr: '인연 100 전당' },
        highlights: [
          {
            en: 'A new Hall page shows how many players have reached Bond 100 with each student across the Global servers.',
            jp: '新しい殿堂ページで、グローバル各サーバーで各生徒と絆100に到達したプレイヤー数を表示。',
            kr: '새로운 전당 페이지에서 글로벌 각 서버에서 각 학생과 인연 100을 달성한 플레이어 수를 확인할 수 있습니다.',
          },
          {
            en: "Open one to see who's there, with per-server breakdowns and stats; counts refresh daily from public ranking data via arona.icu.",
            jp: '生徒を開くと、サーバー別の内訳や統計とともに到達者を確認できます。件数は arona.icu 経由の公開ランキングデータから毎日更新されます。',
            kr: '학생을 열면 서버별 내역과 통계와 함께 달성자를 볼 수 있습니다. 집계는 arona.icu를 통한 공개 랭킹 데이터로 매일 갱신됩니다.',
          },
        ],
      },
      {
        title: {
          en: 'Equipment farming suggestions',
          jp: '装備ファームの提案',
          kr: '장비 파밍 추천',
        },
        highlights: [
          {
            en: 'A new Students tool recommends which normal stages to farm for your missing Tier 2+ equipment, with expected runs and AP per stage and a 2× / 3× drop-event toggle.',
            jp: '新しい生徒ツールが、不足しているTier2以上の装備を集めるのに最適な通常ステージを、想定周回数・APと2倍／3倍のドロップイベント倍率の切り替え付きで提案。',
            kr: '새로운 학생 도구가 부족한 Tier 2 이상 장비를 위해 파밍할 일반 스테이지를 추천하며, 스테이지별 예상 주회 수와 AP, 2배 / 3배 드롭 이벤트 전환 기능을 제공합니다.',
          },
        ],
      },
      {
        title: {
          en: 'Navigation & polish',
          jp: 'ナビゲーションと細かな改善',
          kr: '내비게이션과 세부 개선',
        },
        highlights: [
          {
            en: 'A new landing page with quick-access cards for Students, Bonds, and the Hall, plus Contact and Credits.',
            jp: '生徒・絆・殿堂へのクイックアクセスカードに加え、問い合わせとクレジットも開ける新しいランディングページ。',
            kr: '학생, 인연, 전당으로 빠르게 이동하는 카드와 문의, 크레딧을 함께 제공하는 새로운 랜딩 페이지.',
          },
          {
            en: 'A responsive navbar with redesigned dropdown menus and per-card overlay toggles in the student grid.',
            jp: 'レスポンシブなナビゲーションバー、刷新されたドロップダウンメニュー、生徒一覧のカードごとの表示切り替えを追加。',
            kr: '반응형 내비게이션 바, 새로워진 드롭다운 메뉴, 학생 그리드의 카드별 표시 전환 기능을 추가했습니다.',
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
      kr: '더 빠른 스캐너와 다중 스크린샷',
    },
    summary: {
      en: 'Faster quantity scanning, plus support for up to 3 screenshots in one scan.',
      jp: '数量スキャンを高速化し、1回で最大3枚のスクリーンショットに対応。',
      kr: '더 빠른 수량 스캔과 한 번의 스캔에서 최대 3장의 스크린샷 지원.',
    },
    highlights: [
      {
        en: 'Quantity scanning now runs entirely on fast cloud vision models, dropping the slow fallback that could take a few minutes.',
        jp: '数量スキャンを高速なクラウドビジョンモデルのみに変更し、数分かかることがあった低速フォールバックを廃止。',
        kr: '수량 스캔이 이제 전적으로 빠른 클라우드 비전 모델에서 실행되며, 몇 분이 걸릴 수 있던 느린 대체 방식을 제거했습니다.',
      },
      {
        en: 'Scan up to 3 screenshots in a single upload instead of one at a time.',
        jp: '1枚ずつではなく、1回のアップロードで最大3枚のスクリーンショットをスキャン。',
        kr: '한 장씩이 아니라 한 번의 업로드로 최대 3장의 스크린샷을 스캔합니다.',
      },
      {
        en: 'Items are still detected when the daily scan limit is reached, leaving only the quantities blank to fill in.',
        jp: '1日のスキャン上限に達してもアイテムは検出され、数量のみ空欄になり手動で入力できます。',
        kr: '일일 스캔 한도에 도달해도 아이템은 계속 감지되며, 수량만 비워 두어 직접 입력할 수 있습니다.',
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
      kr: '2026년 5월 릴리스',
    },
    summary: {
      en: 'A dedicated bonds planner plus a major scanner accuracy upgrade.',
      jp: '専用の絆プランナーと、スキャナー精度の大幅な改善。',
      kr: '전용 인연 플래너와 스캐너 정확도의 대폭 향상.',
    },
    sections: [
      {
        title: {
          en: 'Bond planner page',
          jp: '絆プランナーページ',
          kr: '인연 플래너 페이지',
        },
        highlights: [
          {
            en: 'Track multiple students from the new Bonds page (tabs or cards layout).',
            jp: '新しい絆ページから複数の生徒を追跡（タブまたはカード表示）。',
            kr: '새로운 인연 페이지에서 여러 학생을 추적(탭 또는 카드 레이아웃).',
          },
          {
            en: 'Plan gifts, cafe taps, and bonus EXP from lessons in one place.',
            jp: 'ギフト、カフェタップ、レッスンからのボーナスEXPをまとめて計画。',
            kr: '선물, 카페 터치, 과외 보너스 EXP를 한곳에서 계획.',
          },
          {
            en: 'See per-gift EXP breakdowns and a projected new bond level live.',
            jp: 'ギフトごとのEXP内訳と予測される新しい絆レベルをリアルタイム表示。',
            kr: '선물별 EXP 내역과 예상되는 새 인연 레벨을 실시간으로 확인.',
          },
          {
            en: 'Jump between the student modal and bond planner with deep links.',
            jp: '生徒モーダルと絆プランナー間をディープリンクで移動可能。',
            kr: '학생 모달과 인연 플래너 사이를 딥링크로 이동.',
          },
        ],
      },
      {
        title: {
          en: 'Scanner accuracy upgrade',
          jp: 'スキャナー精度の改善',
          kr: '스캐너 정확도 향상',
        },
        highlights: [
          {
            en: 'Quantity OCR upgraded from EasyOCR to Gemini Flash (≈100% accuracy), with a Florence-2 fallback (≈99%) when Gemini is unavailable.',
            jp: '数量OCRをEasyOCRからGemini Flashにアップグレード（精度約100%）。Gemini利用不可時はFlorence-2にフォールバック（約99%）。',
            kr: '수량 OCR을 EasyOCR에서 Gemini Flash로 업그레이드(정확도 약 100%)했으며, Gemini를 사용할 수 없을 때는 Florence-2로 대체합니다(약 99%).',
          },
          {
            en: 'Fewer mis-reads on quantities and items, with clearer flags on uncertain cells.',
            jp: '数量とアイテムの誤読が減少し、不確かなセルがより明確に表示されます。',
            kr: '수량과 아이템의 오인식이 줄고, 불확실한 칸이 더 명확하게 표시됩니다.',
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
      kr: '인벤토리 스크린샷 스캐너',
    },
    summary: {
      en: 'Bulk-update item and equipment quantities from an in-game screenshot.',
      jp: 'ゲーム内スクリーンショットからアイテム・装備の数量を一括更新。',
      kr: '게임 내 스크린샷에서 아이템과 장비 수량을 일괄 업데이트.',
    },
    highlights: [
      {
        en: 'Drop, paste, or pick a screenshot and OCR fills the quantities for you.',
        jp: 'スクリーンショットをドロップ、貼り付け、または選択するとOCRが数量を入力。',
        kr: '스크린샷을 드롭, 붙여넣기 또는 선택하면 OCR이 수량을 채워 줍니다.',
      },
      {
        en: 'Confidence indicators flag uncertain reads for quick review.',
        jp: '信頼度インジケーターが不確かな読み取りを表示し、素早く確認可能。',
        kr: '신뢰도 표시가 불확실한 인식을 표시하여 빠르게 확인할 수 있습니다.',
      },
      {
        en: 'Built-in guide explains screenshot prerequisites and edge cases.',
        jp: '内蔵ガイドでスクリーンショットの前提条件とエッジケースを説明。',
        kr: '내장 가이드가 스크린샷 준비 사항과 예외 상황을 설명합니다.',
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
      kr: '필터와 제작 도우미',
    },
    summary: {
      en: 'Richer student filtering plus a dedicated crafting fodder picker.',
      jp: 'より高度な生徒フィルタリングと専用のクラフト素材ピッカー。',
      kr: '더 풍부한 학생 필터링과 전용 제작 재료 선택 도구.',
    },
    highlights: [
      {
        en: 'Filter the student grid by school, equipment slot, attack/defense type, rarity, and availability.',
        jp: '学校、装備スロット、攻撃/防御タイプ、レアリティ、入手可能性で生徒グリッドをフィルタリング。',
        kr: '학원, 장비 슬롯, 공격/방어 타입, 희귀도, 입수 방법으로 학생 그리드를 필터링.',
      },
      {
        en: 'Crafting Fodder modal: mark surplus materials and configure rarity thresholds.',
        jp: 'クラフト素材モーダル：余剰素材をマークし、レアリティしきい値を設定可能。',
        kr: '제작 재료 모달: 잉여 재료를 표시하고 희귀도 기준치를 설정.',
      },
      {
        en: 'Your filter and pin settings now stay between visits.',
        jp: 'フィルターとピン設定が訪問間で保持されるようになりました。',
        kr: '필터와 고정 설정이 이제 방문 간에 유지됩니다.',
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
      kr: '재료 미리보기와 함께 강화 적용',
    },
    summary: {
      en: 'Commit planned upgrades after seeing exactly what they cost.',
      jp: '計画したアップグレードのコストを確認してから適用。',
      kr: '계획한 강화의 비용을 정확히 확인한 뒤 적용.',
    },
    highlights: [
      {
        en: 'Apply Upgrade modal summarises pending changes across levels, skills, potentials, equipment, and grade.',
        jp: '適用モーダルがレベル、スキル、ポテンシャル、装備、グレードの変更をまとめて表示。',
        kr: '강화 적용 모달이 레벨, 스킬, 잠재능력, 장비, 성급에 걸친 대기 중인 변경을 요약합니다.',
      },
      {
        en: 'Toggle between "Consumed" (what will be spent) and "Remaining" (inventory after) views.',
        jp: '「消費」（消費される量）と「残量」（適用後の在庫）ビューを切り替え可能。',
        kr: '"소비"(소비될 양)와 "잔량"(적용 후 보유량) 보기를 전환할 수 있습니다.',
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
      kr: '덱 빌더와 보유 관리',
    },
    summary: {
      en: 'Build squads and mark which students you actually own.',
      jp: 'スクワッドを編成し、実際に所持している生徒をマーク。',
      kr: '스쿼드를 편성하고 실제로 보유한 학생을 표시.',
    },
    highlights: [
      {
        en: 'Drag-and-drop deck builder for 6-student teams with per-deck notes.',
        jp: '6人編成チーム用のドラッグ＆ドロップ式デッキビルダー、デッキごとのメモ付き。',
        kr: '덱별 메모가 있는 6인 팀용 드래그 앤 드롭 덱 빌더.',
      },
      {
        en: 'Toggle ownership per student, and the grid splits into Recruited / Not Recruited sections.',
        jp: '生徒ごとに所持状況を切り替えると、グリッドが入手済み／未入手セクションに分かれます。',
        kr: '학생별 보유 상태를 전환하면 그리드가 영입됨 / 미영입 섹션으로 나뉩니다.',
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
      kr: '학생 모달 리디자인',
    },
    summary: {
      en: 'Tabbed layout for Info, Upgrade, and Gear with reactive material costs.',
      jp: '情報、アップグレード、装備のタブ式レイアウトとリアクティブな素材コスト。',
      kr: '정보, 육성, 무기 탭 레이아웃과 실시간 재료 비용.',
    },
    highlights: [
      {
        en: 'Changing a level instantly updates material totals.',
        jp: 'レベルを変更すると素材合計が即座に反映されます。',
        kr: '레벨을 변경하면 재료 합계가 즉시 반영됩니다.',
      },
      {
        en: 'Inline editors for levels, skills, potentials, and grade infos.',
        jp: 'レベル、スキル、ポテンシャル、グレード情報のインラインエディター。',
        kr: '레벨, 스킬, 잠재능력, 성급 정보의 인라인 편집기.',
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
      kr: 'IndexedDB 저장소 마이그레이션',
    },
    summary: {
      en: 'All planner data moved to IndexedDB for better capacity and reliability.',
      jp: 'すべてのプランナーデータをIndexedDBに移行し、容量と信頼性を向上。',
      kr: '모든 플래너 데이터를 IndexedDB로 옮겨 용량과 안정성을 향상.',
    },
    highlights: [
      {
        en: 'No more localStorage size limits, so you can track every student you want.',
        jp: 'localStorageのサイズ制限がなくなり、好きなだけ生徒を追跡できます。',
        kr: 'localStorage 용량 제한이 사라져 원하는 만큼 학생을 추적할 수 있습니다.',
      },
      {
        en: 'Automatic one-time migration from the old format on first load.',
        jp: '初回ロード時に旧形式から自動的に一度だけ移行。',
        kr: '첫 로드 시 이전 형식에서 자동으로 한 번 마이그레이션.',
      },
      {
        en: 'Updated Import / Export format covers the new tables.',
        jp: 'インポート/エクスポート形式が新テーブルに対応。',
        kr: '업데이트된 가져오기 / 내보내기 형식이 새 테이블을 지원합니다.',
      },
    ],
    toCommit: '2c5904f',
  },
];

/**
 * Resolve a `LocalizedText` against the active language. Falls back to EN if
 * the current language is missing (defensive: keeps the modal usable if a
 * future entry forgets a translation).
 */
export const localizeChangelogText = (text: LocalizedText): string =>
  text[currentLanguage.value] ?? text.en;
