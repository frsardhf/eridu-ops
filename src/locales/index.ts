import { computed } from 'vue';
import { currentLanguage, Language } from '../lib/stores/localizationStore';

// Translation strings for each supported language
export const translations = {
  en: {
    // Landing
    landingSubtitle: "Blue Archive Student Progression Planner",
    studentsDesc: "Track bond levels, skill upgrades, gear progression, and material costs.",
    bondsDesc: "Gift planning and bond progress tracker for your students.",
    bond100Desc: "See who across the player base has reached Bond 100 with each student.",

    // Bond100 page
    bond100: {
      nav: "Hall",
      title: "Bond 100 Hall",
      subtitle: "Who's reached Bond 100 across Global servers.",
      aboutTitle: "About these counts",
      aboutInfo: "About Bond 100 Hall",
      aboutCount: "Each number is how many players have reached Bond 100 with that student.",
      aboutSources: "Counts come from a daily snapshot of public in-game ranking data via arona.icu. Only a player name and server are shown.",
      demoDataNote: "Preview data — live counts coming soon.",
      summaryUnavailable: "Bond 100 Hall is unavailable right now.",
      entriesUnavailable: "Couldn't load entries for this student.",
      atBond100: "at Bond 100",
      studentsRepresented: "Students",
      server: "Server",
      allServers: "All servers",
      sort: "Sort",
      stats: {
        aria: "Hall stats",
        title: "Hall summary",
        byServer: "By server",
        topStudents: "Most reached",
        coverage: "Coverage",
        ofStudents: "of {total} students",
        updated: "Updated daily",
        empty: "No Bond 100 data yet.",
      },
      sortModes: {
        default: "Default",
        name: "Name",
        bond100: "Count",
      },
      searchPlaceholder: "Search students...",
      noStudents: "No students match these filters.",
      submit: "Add Bond 100",
      requestRemoval: "Request removal",
      removalNote: "Only your in-game name and server are shown. To get off the wall, use the Request removal button and a mod will take it down.",
      entriesTitle: "{name} · Bond 100 Hall",
      entriesKicker: "Hall entries",
      noEntries: "No entries yet.",
      form: {
        back: "Back",
        cancel: "Cancel",
        send: "Submit",
        sending: "Submitting…",
        name: "In-game name",
        friendCode: "Friend code",
        assistHint: "Put the students you want listed in a support/assist slot first. Only assisted students are visible to arona, and your account is pulled from arona, so you'll appear in the next update.",
        guidelinesBody: "To remove your entry: open the arona.icu page below, enter your server and friend code, then press the \"Remove share\" button. It updates here on the next sync.",
        proof: "Proof URL",
        contact: "Contact",
        reason: "Reason",
        reasonPrivacy: "I don't want to be listed",
        reasonIncorrect: "This entry is wrong or isn't me",
        reasonOther: "Other",
        whichListing: "Which listing is yours?",
        optional: "optional",
        selectPlaceholder: "Select…",
        privacyNote: "Friend code is used only to verify your entry and prevent duplicates — never published or stored as-is. Contact and proof are seen only by moderators.",
        submittedTitle: "Submitted",
        submittedBody: "Thanks! Your account will be pulled from arona and appear in the next update.",
        removalSubmittedBody: "Thanks! We'll review your removal request shortly.",
        error: "Couldn't submit right now. Please try again later.",
      },
      serverRegions: {
        global_na: "Global NA",
        global_asia: "Global Asia",
        global_eu: "Global EU",
        global_kr: "Global KR",
        global_tw: "Global TW/HK",
      },
    },

    // BondsPage
    otherGifts: "Other gifts",
    favoredGifts: "Favored gifts",
    exp: "EXP",
    total: "Total",
    totalSr: "Total SR",
    totalSsr: "Total SSR",
    addStudent: "Add student",
    noTrackedStudents: "No tracked students yet. Add a student to start planning bonds and gifts.",
    layoutTabs: "Tabs",
    layoutCards: "Cards",
    suggestedStudents: "Suggested",
    alreadyTracked: "Tracking",
    bondMaxed: "Bond maxed",
    allOwnedStudents: "All owned",
    untrack: "Untrack",
    untrackTooltip: "Your gift allocations are preserved. Re-add anytime from the picker.",
    hideEditor: "Hide",
    showEditor: "Show",
    planGifts: "Plan gifts for this student",
    hideGiftGrid: "Hide gift grid",
    yellowStones: "Yellow stones",
    conversion: "Conversion",
    consumed: "Consumed",

    // BondsPage — Other EXP sources panel
    otherExpSources: "Other EXP",
    otherExpTooltip: "Plan cafe taps and add bonus EXP from lessons",
    cafeTaps: "Cafe taps",
    tapsPerDay: "Taps / day",
    startDate: "Start date",
    endDate: "End date",
    targetDate: "Target date",
    day: "day",
    days: "days",
    inclusiveAbbr: "incl",
    exclusiveAbbr: "excl",
    includeTodayTooltip: "Toggle whether the target date counts as a day",
    bonusExp: "Bonus EXP",
    bonusExpTooltip: "EXP from lessons",
    manualExp: "Amount",
    lessonRates: "Lesson rates",
    areaRank: "Area rank",
    expPerLesson: "EXP",
    bonusChance: "2× EXP chance",
    clear: "Clear",
    clearAll: "Clear all",
    done: "Done",
    projection: "Projection",
    reachesBondN: "→ Bond {n}",
    reachesBondMax: "→ Bond 100",

    // Navbar
    students: "Students",
    bonds: "Bonds",
    searchStudents: "Search students...",
    sort: {
      id: "ID",
      name: "Name",
      default: "Default",
      bond: "Bond",
      level: "Level",
      grade: "Grade",
      school: "School",
      club: "Club",
      pinned: "Pinned",
      pinnedHint: "Sorting is paused while Pinned view is on.",
      method: "Sorting Method"
    },
    direction: {
      ascending: "Ascending",
      descending: "Descending"
    },
    overlays: {
      title: "Show on cards",
      selectAll: "Select all",
      level: "Level",
      grade: "Grade",
      equipment: "Equipment",
      skills: "Skills",
      potential: "Potential"
    },
    data: "Data",
    exportData: "Export Data",
    importData: "Import Data",
    app: "App",
    contact: "Contact",
    credits: "Credits",
    whatsNew: "What's New",
    whatsNewLatest: "Latest update",
    previousUpdates: "Previous updates",
    noPreviousUpdates: "No previous updates yet.",

    // Import modal
    importErrorFileType: "Please select a .txt file",
    importingData: "Importing data...",
    importSuccessful: "Import successful! Reloading page...",
    importFailed: "Import failed. Please try again.",
    importFileFormatError: "Import failed. Please check your file format.",
    dragDropFile: "Drag & drop your export file here",
    or: "or",
    browseFiles: "Browse Files",
    importInstructions: "Import your previously exported data to restore your progress and settings.",
    importWarning: "Note: This will replace your current data and reload the page.",
    importFromFile: "From File",
    importFromText: "From Text",
    pasteImportData: "Paste justin163 data",
    import: "Import",
    importEmptyText: "Please paste data",
    
    // Student modal tabs
    info: "Info",
    bond: "Bond",
    upgrade: "Skills",
    gear: "Weapons",
    items: "Items",
    equipment: "Equipment",
    summary: "Summary",
    
    // Bond component
    currentBond: "Current Bond",
    editBondLevel: "Click to edit bond level",
    openInBondsPage: "Open in Bonds page",
    returnToStudent: "Return to student",
    expToNextLevel: "XP to next level",
    totalExp: "Total EXP",
    
    // Gift options
    giftOptions: "Gift Options",
    convertGiftBox: "Convert Box",
    syncGifts: "Sync Gifts",
    resetGifts: "Reset",
    undoChanges: "Undo",
    redoChanges: "Redo",
    convertGiftBoxTooltip: "Convert SR gift materials into selector boxes. Each box costs 1 fusion keystone and 2 SR gift materials. Requires at least 1 fusion keystone and 2 SR gift materials.",
    syncGiftsTooltip: "Fill gift quantities from your current inventory, reserving amounts already allocated to other students.",
    resetGiftsTooltip: "Reset all gift quantities to zero.",
    undoChangesTooltip: "Undo changes and revert to previous gift quantities.",
    redoChangesTooltip: "Redo previously undone changes.",
    manualStepperWarning: "Manual changes will clear per-gift tracking. Use Sync Gifts to restore it.",
    // Sync Gifts mode dialog
    syncGiftsModeTitle: "Sync Gifts Mode",
    syncGiftsModeGreedy: "Fill All Available",
    syncGiftsModeGreedyDesc: "Fills all owned gifts regardless of other students' gear upgrade needs.",
    syncGiftsModeAware: "Reserve Gear Needs First",
    syncGiftsModeAwareDesc: "Reserves gifts needed for other students' exclusive gear upgrades before filling.",
    // Convert material selection dialog
    convertMaterialTitle: "Select Conversion Materials",
    convertMaterialDesc: "Select which gifts to use as materials ({needed} needed):",
    convertMaterialSelected: "{current} / {needed} selected",
    convertMaterialConfirm: "Convert",
    convertMaterialInventoryNote: "Does not deduct from your owned counts — update them after converting in-game.",

    // Upgrade component - Skills
    skills: "Skills",
    maxAll: "Max All",
    maxTarget: "Max Target",
    max: "MAX",
    cost: "Cost",
    level: "Level",
    current: "Current",
    target: "Target",
    skillToggle: {
      normal: "Switch to normal EX skill",
      enhanced: "Switch to enhanced EX skill"
    },
    
    // Upgrade component - Levels
    characterLevel: "Level",
    currentLevel: "Current Level",
    targetLevel: "Target Level",
    xpRequired: "XP Required",
    maxLevel: "MAX LEVEL",
    maxBond: "MAX BOND",

    // Upgrade component - Potential/Talent
    talent: "Talent",
    clickTo: "click to",
    collapse: "collapse",
    expand: "expand",
    attack: "Attack",
    maxHp: "Max HP",
    healPower: "Heal Power",
    
    // Upgrade/Gear component - Materials
    totalMaterialsNeeded: "Total Materials Needed",
    noMaterialsNeeded: "No resources needed for upgrades",
    allMaterialsAvailable: "You have all the materials you need! ✓",
    noResourcesNeeded: "No resources needed",
    noPendingUpgrades: "No pending upgrades.",
    noMaterialsToConsume: "No materials to consume.",
    confirmApplyUpgrade: "Confirm Apply Upgrade",
    progression: "Progression",
    applyUpgrade: "Apply Upgrade",
    material: "Material",
    unknownResource: "Unknown Resource",
    unknown: "Unknown",
    
    // Mode toggle
    showMissing: "Show Missing",
    showNeeded: "Show Needed",
    missing: "Missing",
    leftover: "Leftover",
    used: "Used",
    notEnough: "Not enough",
    activityReport: "Activity Report",
    equipmentXp: "Equipment XP",

    // Resource summary component
    itemsNeeded: "Items Needed",
    missingItems: "Missing Items",
    equipmentNeeded: "Equipment Needed",
    missingEquipment: "Missing Equipment",
    gifts: "Gifts",
    giftsNeeded: "Gifts Needed",
    missingGifts: "Missing Gifts",
    owned: "Owned",
    needed: "Needed",
    remaining: "Remaining",
    elephsOwned: "Elephs Owned",
    elephsNeeded: "Elephs Needed",
    price: "Eligma Price",
    purchasable: "Purchasable",
    noUpgradeNeeded: "No upgrade needed",
    noLeftoverResources: "No leftover resources",
    perStudentView: "Per Student",
    aggregateView: "Aggregate",

    // Equipment types and gear component
    equipmentTypes: {
      Hat: "Hat",
      Gloves: "Gloves",
      Shoes: "Shoes",
      Bag: "Bag",
      Badge: "Badge",
      Hairpin: "Hairpin",
      Charm: "Amulet",
      Watch: "Watch",
      Necklace: "Necklace"
    },
    tier: "T",
    gears: "Gears",
    currentEquipment: "Current",
    targetEquipment: "Target",
    setMinLevel: "Set to minimum level",
    setMaxLevel: "Set to maximum level",
    decreaseLevel: "Decrease level",
    increaseLevel: "Increase level",
    
    // Weapon Grade component
    exclusiveWeapon: "Ex Weapon",
    currentGrade: "Current",
    targetGrade: "Target",
    maxGrade: "MAX",
    
    // Info tab
    exclusiveGear: "Exclusive Gear",
    empty: "EMPTY",
    bondRequired: "Bond > 15 Required",
    locked: "Locked",
    atk: "ATK",
    def: "DEF",
    school: "School",
    club: "Club",

    // Linked students
    switchStyle: "Switch Style",

    // Inventory modal
    inventory: "Inventory",
    studentDetails: "Student Details",

    // Buttons and actions
    reset: "Reset",
    save: "Save",
    loading: "Loading",
    close: "Close",
    update: "Update",
    confirm: "Confirm",
    cancel: "Cancel",
    apply: "Apply",
    selectAll: "Select All",

    // Navigation
    previous: "Previous",
    next: "Next",

    // Tools rail
    tools: "Tools",

    // Contact modal
    contactModal: {
      body: "If you have any inquiries or want to report bugs, you can contact me on Discord:",
    },

    // Credits modal
    creditsModal: {
      dataSources: "Data Sources",
      dataSourcesBody: "The data used in this application is sourced from:",
      translationsHeader: "Translations",
      translationsBody: "English translations of skills are provided by Lonqie and are used with permission. Please note that translations in other languages may be contributed by other translators and are not free to use in other projects without explicit permission.",
      acknowledgements: "Acknowledgements",
      acknowledgementsBody: "Special thanks to the SchaleDB team and Lonqie for their incredible work in maintaining comprehensive Blue Archive data resources that make applications like this possible.",
    },

    // Ownership (recruited / not recruited)
    ownership: {
      recruited: "Recruited",
      notRecruited: "Not Recruited",
      markRecruited: "Mark as Recruited",
      markNotRecruited: "Mark as Not Recruited",
      ownershipFilter: "Recruitment",
      filterAll: "All",
      filterOwned: "Recruited",
      filterUnowned: "Not Recruited",
    },

    // Deck Builder modal
    deckBuilder: {
      title: "Deck Builder",
      presetName: "Preset name",
      removeTeam: "Remove team",
      copyTeamToPreset: "Copy team to preset",
      dragToReorder: "Drag to reorder team",
      selectStriker: "Select Striker",
      selectSpecial: "Select Special",
      filterByName: "Filter by name...",
      assistLimitReached: "Assist limit reached (1/1) — students already used as assist are hidden",
      noStudentsAvailable: "No students available for this slot",
      addTeam: "+ Add Team",
      exportImage: "Export Image",
      exporting: "Exporting…",
      copiedTo: "Copied to",
      removeStudent: "Remove student",
    },

    // Inventory screenshot parser modal
    scanInventory: "Scan Inventory",
    inventoryScreenshot: "Inventory Screenshot",
    selectInventoryType: "What are you scanning?",
    uploadScreenshot: "Upload Screenshot",
    dragDropScreenshot: "Select or drop up to 3 screenshots",
    parsingScreenshot: "Parsing screenshot…",
    parseFailed: "Parse failed. Is the parser service running?",
    parseResults: "Review Results",
    applyInventory: "Apply",
    reupload: "Re-upload",
    confidence: "Confidence",
    lowConfidenceWarning: "Low-confidence items may be incorrect — check before applying.",
    noItemsDetected: "No items detected. Check that the parser service is running and the screenshot is correct.",

    // Inventory screenshot scanner — guide panel
    scanGuide: {
      beforeScanning: {
        title: "Before scanning",
        sortOrder: "Set inventory sort to <strong>ascending or descending by Item ID</strong> (the game default). Name / usage / owned sort is not supported.",
        onePerScan: "Up to 3 screenshots per scan — select or drop them together. Re-upload for more pages.",
        selectType: "Select the correct type: <strong>Items</strong> or <strong>Equipment</strong> — the grids differ.",
      },
      screenshots: {
        title: "Screenshots",
        resolution: "Optimised for <strong>FHD (1920 × 1080)</strong>. Higher resolutions (2K / 4K) work fine — the parser locates the inventory panel by aspect ratio.",
        itemsTab: "<strong>Items</strong> tab detects: EXP materials, Artifacts, Blu-ray, Tech Notes, and Gifts (4 rows per page).",
        equipmentTab: "<strong>Equipment</strong> tab detects: T2+ equipment pieces (5 rows per page). T1 pieces and EXP equipment are excluded.",
      },
      reviewing: {
        title: "Reviewing results",
        confidence: "Orange-highlighted cards indicate moderate confidence (50–80%). Inspect these first.",
        hoverControls: "Hover any card to reveal controls: <strong>✏</strong> change item · edit quantity field · <strong>×</strong> remove.",
        appliesDetected: "Applying only updates quantities for <strong>detected items</strong> — undetected cells are left unchanged.",
      },
      limitations: {
        title: "Known limitations",
        iconSimilarity: "The icon model may misidentify visually similar items within the same design family (e.g. blu-ray series).",
      },
      examples: {
        title: "Screenshot examples",
        correct: "✓ Correct",
        clipped: "✗ Clipped",
        clippedCaption: "First row partially cut — grey padding must be visible on all sides",
      },
    },

    // Inventory screenshot scanner — modal UX strings (validation errors, loading tips, banners)
    scanModal: {
      errInvalidMime: "Please select a PNG, JPG, or WebP image.",
      errDecodeFailed: "Could not read image dimensions. Try a different file.",
      errNotLandscape: "Screenshot must be landscape (16:9). Yours looks like a phone capture ({width}×{height}).",
      errTooSmall: "Screenshot must be at least {minWidth}px wide (FHD or higher). Yours is {width}×{height}.",
      errBadAspect: "Screenshot must be 16:9 (e.g. 1920×1080). Yours is {width}×{height} — not a supported aspect ratio.",
      errTooMany: "Up to {max} screenshots per scan. Please select fewer.",
      tipFast: "Reading quantities with AI vision…",
      tipSlow: "Taking longer than expected — running local OCR (~4 min total). Feel free to leave this tab open.",
      appliedOne: "Applied 1 item — upload another screenshot or close.",
      appliedMany: "Applied {count} items — upload another screenshot or close.",
      prepHintItems: "<strong>Before screenshotting:</strong> apply in-game filters so only EXP materials, Artifacts, Blu-ray, Tech Notes, and Gifts are visible. Other categories won't be detected.",
      prepHintEquipment: "<strong>Before screenshotting:</strong> scroll so the first row contains T2+ equipment. T1 pieces and EXP equipment are excluded.",
    },

    // Bulk Modify Students modal
    bulkModify: {
      title: "Bulk Modify Students",
      studentSelection: "Student Selection",
      selected: "Selected",
      filters: {
        baseGrade: "Base Grade",
        availability: "Availability",
        charLevel: "Char Level",
        formStatus: "Form Status",
        unfilledOnly: "Unfilled Only",
      },
      availability: {
        fest: "Fest",
        unique: "Unique",
        event: "Event",
        regular: "Regular",
      },
      selectAllFiltered: "Select all filtered students",
      visible: "Visible",
      formInputs: "Form Inputs",
      setSeparateTargets: "Set separate targets",
      formNote: "Leave empty to keep existing value. For students without form data, defaults are used.",
      fields: {
        bond: "Bond",
        characterLevel: "Character Level",
        skillEx: "EX Skill",
        skillPublic: "Basic Skill",
        skillPassive: "Enhanced Skill",
        skillExtraPassive: "Sub Skill",
        equipmentSlot1: "Equipment Slot 1",
        equipmentSlot2: "Equipment Slot 2",
        equipmentSlot3: "Equipment Slot 3",
        gradeLevel: "Grade Level",
        potentialLevel: "Potential Level",
      },
      overwriteWarningPrefix: "Warning: ",
      overwriteWarningSuffix: " selected students already have non-default saved form data. Filled fields will replace those values.",
      applying: "Applying...",
      apply: "Apply Bulk Update",
    },

    // Bond Update tool
    bondUpdate: {
      title: "Bond Update",
      placeholder: "name bond\ns.name bond\n...",
      parse: "Parse",
      flagged: "Needs Resolution",
      skip: "Skip",
      searchPlaceholder: "Search student...",
      guideTitle: "Format Guide",
      guideLine1: "One student per line",
      guideLine2: "Names are case-insensitive",
      guideLine3: "Use prefix.name for variants — more letters disambiguate:",
      guideLine4: "Unmatched names are flagged for manual pick",
      guideLineRomaji: "Always use the romaji base name — works in all locales",
      guideLinePrefixes: "Common prefixes (add letters to disambiguate: bu=Bunny, ba=Battle):",
      prefixTable: "b=Bunny/Battle (Armed)/Band · c=Cheerleader/Christmas/Camp/Casual/Cycling · d=Dress · g=Guide · i=Idol · m=Maid/Magical · n=New Year · o=Onsen · p=Pajama/Part-Timer · q=Qipao · s=Swimsuit · t=Track/Terror · u=Uniform",
    },

    // Crafting Fodder tool
    craftingFodder: {
      title: "Crafting Fodder",
      keepAtLeast: "Keep at least",
      stage1Filter: "Show in Stage 1",
      stage1: "Stage 1 Fodder",
      stage2: "Stage 2 Fodder (SR / SSR)",
      artifact: "Artifact",
      bookItem: "Book",
      cdItem: "Music",
      noFodder: "No excess materials above thresholds",
      legend: "Legend",
      legendCraft: "Crafts",
      legendExcess: "Excess",
      legendQty: "Recyclable",
    },

    // Student filter panel
    filter: {
      title: "Filter",
      clearAll: "Clear All",
      type: "Type",
      rarity: "Rarity",
      attackType: "Attack",
      defenseType: "Defense",
      academy: "Academy",
      equipment: "Equipment",
      availability: "Availability",
      regular: "Regular",
      limited: "Limited",
      unique: "Unique",
      fest: "Fest",
      perm3star: "Archived",
      other: "Other",
    },
  },
  jp: {
    // Landing
    landingSubtitle: "ブルーアーカイブ 生徒育成プランナー",
    studentsDesc: "絆レベル、スキル強化、装備の進捗、素材コストを追跡。",
    bondsDesc: "ギフト計画と絆進捗の追跡。",
    bond100Desc: "プレイヤー間で誰がどの生徒と絆100に到達したかを確認。",

    // Bond100 page
    bond100: {
      nav: "殿堂",
      title: "絆100 殿堂",
      subtitle: "グローバル各サーバーで誰が絆100に到達したか。",
      aboutTitle: "件数について",
      aboutInfo: "絆100殿堂について",
      aboutCount: "各数値は、その生徒と絆100に到達したプレイヤーの人数です。",
      aboutSources: "件数は arona.icu 経由のゲーム内公開ランキングの日次スナップショットに基づいています。表示されるのはプレイヤー名とサーバーのみです。",
      demoDataNote: "プレビューデータ — 実際の件数は近日公開。",
      summaryUnavailable: "絆100殿堂は現在利用できません。",
      entriesUnavailable: "この生徒のエントリーを読み込めませんでした。",
      atBond100: "人が絆100",
      studentsRepresented: "生徒",
      server: "サーバー",
      allServers: "全サーバー",
      sort: "並び替え",
      stats: {
        aria: "殿堂の統計",
        title: "殿堂サマリー",
        byServer: "サーバー別",
        topStudents: "最多到達",
        coverage: "網羅率",
        ofStudents: "/ {total} 人中",
        updated: "毎日更新",
        empty: "絆100のデータはまだありません。",
      },
      sortModes: {
        default: "デフォルト",
        name: "名前",
        bond100: "件数",
      },
      searchPlaceholder: "生徒を検索...",
      noStudents: "条件に一致する生徒はいません。",
      submit: "絆100を追加",
      requestRemoval: "削除をリクエスト",
      removalNote: "表示されるのはゲーム内名とサーバーのみです。掲載を消したいときは「削除をリクエスト」から送ってください。モデレーターが対応します。",
      entriesTitle: "{name} · 絆100殿堂",
      entriesKicker: "殿堂エントリー",
      noEntries: "エントリーはまだありません。",
      form: {
        back: "戻る",
        cancel: "キャンセル",
        send: "送信",
        sending: "送信中…",
        name: "ゲーム内名",
        friendCode: "フレンドコード",
        assistHint: "掲載したい学生を先にサポート（助っ人）枠に設定してください。arona は助っ人枠の学生しか取得できません。データは arona から取得されるため、次回の更新時に反映されます。",
        guidelinesBody: "掲載を削除するには：下の arona.icu のページを開き、サーバーとフレンドコードを入力して「共有を解除」ボタンを押してください。次回の更新時にこちらへ反映されます。",
        proof: "証明URL",
        contact: "連絡先",
        reason: "理由",
        reasonPrivacy: "掲載されたくない",
        reasonIncorrect: "この掲載は誤り、または自分ではない",
        reasonOther: "その他",
        whichListing: "どの掲載があなたですか？",
        optional: "任意",
        selectPlaceholder: "選択…",
        privacyNote: "フレンドコードはエントリーの確認と重複防止のみに使用し、そのまま保存・公開することはありません。連絡先・証明はモデレーターのみが確認します。",
        submittedTitle: "送信しました",
        submittedBody: "ありがとうございます！アカウント情報が arona から取得され、次回の更新時に表示されます。",
        removalSubmittedBody: "ありがとうございます！削除リクエストを確認します。",
        error: "現在送信できません。後でもう一度お試しください。",
      },
      serverRegions: {
        global_na: "Global NA",
        global_asia: "Global Asia",
        global_eu: "Global EU",
        global_kr: "Global KR",
        global_tw: "Global TW/HK",
      },
    },

    // BondsPage
    otherGifts: "その他のギフト",
    favoredGifts: "好みのギフト",
    exp: "EXP",
    total: "合計",
    totalSr: "SR合計",
    totalSsr: "SSR合計",
    addStudent: "生徒を追加",
    noTrackedStudents: "追跡中の生徒はいません。生徒を追加して絆とギフトの計画を始めましょう。",
    layoutTabs: "タブ",
    layoutCards: "カード",
    suggestedStudents: "おすすめ",
    alreadyTracked: "追跡中",
    bondMaxed: "絆MAX",
    allOwnedStudents: "所持生徒",
    untrack: "解除",
    untrackTooltip: "ギフトの設定は保持されます。ピッカーからいつでも再追加できます。",
    hideEditor: "非表示",
    showEditor: "表示",
    planGifts: "この生徒にギフトを計画する",
    hideGiftGrid: "ギフトグリッドを隠す",
    yellowStones: "黄色の石",
    conversion: "変換",
    consumed: "消費",

    // BondsPage — Other EXP sources panel
    otherExpSources: "その他EXP",
    otherExpTooltip: "カフェタップとレッスンEXPを計画",
    cafeTaps: "カフェタップ",
    tapsPerDay: "タップ/日",
    startDate: "開始日",
    endDate: "終了日",
    targetDate: "目標日",
    day: "日",
    days: "日",
    inclusiveAbbr: "含む",
    exclusiveAbbr: "除く",
    includeTodayTooltip: "目標日を1日としてカウントするか切り替え",
    bonusExp: "ボーナスEXP",
    bonusExpTooltip: "レッスンからのEXP",
    manualExp: "数値",
    lessonRates: "レッスン獲得量",
    areaRank: "エリアランク",
    expPerLesson: "EXP",
    bonusChance: "2倍EXP確率",
    clear: "クリア",
    clearAll: "全てクリア",
    done: "完了",
    projection: "予測",
    reachesBondN: "→ 絆 {n}",
    reachesBondMax: "→ 絆 100",

    // Navbar
    students: "生徒",
    bonds: "絆",
    searchStudents: "生徒を検索...",
    sort: {
      id: "ID",
      name: "名前",
      default: "デフォルト",
      bond: "絆",
      level: "レベル",
      grade: "星級",
      school: "学園",
      club: "部活",
      pinned: "ピン留め",
      pinnedHint: "ピン留め表示中は並び替えが一時停止します。",
      method: "ソート方法"
    },
    direction: {
      ascending: "昇順",
      descending: "降順"
    },
    overlays: {
      title: "カードに表示",
      selectAll: "すべて選択",
      level: "レベル",
      grade: "星級",
      equipment: "装備",
      skills: "スキル",
      potential: "潜在能力"
    },
    data: "データ",
    exportData: "データエクスポート",
    importData: "データインポート",
    app: "アプリ",
    contact: "お問い合わせ",
    credits: "クレジット",
    whatsNew: "新着情報",
    whatsNewLatest: "最新のアップデート",
    previousUpdates: "過去のアップデート",
    noPreviousUpdates: "過去のアップデートはまだありません。",

    // Import modal
    importErrorFileType: ".txtファイルを選択してください",
    importingData: "データをインポート中...",
    importSuccessful: "インポート成功！ページを再読み込み中...",
    importFailed: "インポートに失敗しました。もう一度お試しください。",
    importFileFormatError: "インポートに失敗しました。ファイル形式を確認してください。",
    dragDropFile: "エクスポートファイルをここにドラッグ＆ドロップ",
    or: "または",
    browseFiles: "ファイルを参照",
    importInstructions: "以前にエクスポートしたデータをインポートして、進捗と設定を復元します。",
    importWarning: "注意：これにより現在のデータが置き換えられ、ページが再読み込みされます。",
    importFromFile: "ファイルから",
    importFromText: "テキストから",
    pasteImportData: "justin163データを貼り付け",
    import: "インポート",
    importEmptyText: "データを貼り付けてください",
    
    // Student modal tabs
    info: "情報",
    bond: "絆",
    upgrade: "育成",
    gear: "武器",
    items: "アイテム",
    equipment: "装備",
    summary: "要約",

    // Bond component
    currentBond: "現在の絆",
    editBondLevel: "クリックして絆レベルを編集",
    openInBondsPage: "絆ページで開く",
    returnToStudent: "生徒に戻る",
    expToNextLevel: "次のレベルまで",
    totalExp: "総経験値",
    
    // Gift options
    giftOptions: "ギフト設定",
    convertGiftBox: "選択ボックス変換",
    syncGifts: "ギフト同期",
    resetGifts: "リセット",
    undoChanges: "元に戻す",
    redoChanges: "やり直し",
    convertGiftBoxTooltip: "SRギフト素材をセレクターボックスに変換します。1ボックスにつき融合キーストーン1つとSRギフト素材2つが必要です。使用するには融合キーストーンとSRギフト素材がそれぞれ1つ以上必要です。",
    syncGiftsTooltip: "現在のインベントリからギフト数量を設定します。他のキャラクターに割り当て済みの数量は除外されます。",
    resetGiftsTooltip: "ギフトの数量をゼロにリセットします。",
    undoChangesTooltip: "ギフトの変更を取り消し、以前のギフト数量に戻します。",
    redoChangesTooltip: "取り消した変更をやり直します。",
    manualStepperWarning: "手動変更はギフト追跡をクリアします。ギフト同期を使用して復元してください。",
    // Sync Gifts mode dialog
    syncGiftsModeTitle: "ギフト同期モード",
    syncGiftsModeGreedy: "全て利用可能分を設定",
    syncGiftsModeGreedyDesc: "他のキャラクターのギア強化に関係なく、全ての所持ギフトを設定します。",
    syncGiftsModeAware: "ギア強化分を優先確保",
    syncGiftsModeAwareDesc: "他のキャラクターの専用ギア強化に必要なギフトを確保してから設定します。",
    // Convert material selection dialog
    convertMaterialTitle: "変換素材の選択",
    convertMaterialDesc: "素材として使用するギフトを選択してください（{needed}個必要）：",
    convertMaterialSelected: "{current} / {needed} 個選択済み",
    convertMaterialConfirm: "変換",
    convertMaterialInventoryNote: "所持数は変更されません。ゲーム内で変換を実行した後、所持数を更新してください。",

    // Upgrade component - Skills
    skills: "スキル",
    maxAll: "全て最大化",
    maxTarget: "目標を最大化",
    max: "最大",
    cost: "コスト",
    level: "レベル",
    current: "現在",
    target: "目標",
    skillToggle: {
      normal: "通常のEXスキルに切り替え",
      enhanced: "強化EXスキルに切り替え"
    },
    
    // Upgrade component - Levels
    characterLevel: "レベル",
    currentLevel: "現在のレベル",
    targetLevel: "目標のレベル",
    xpRequired: "必要な経験値",
    maxLevel: "最大レベル",
    maxBond: "最大絆",

    // Upgrade component - Potential/Talent
    talent: "能力",
    clickTo: "クリックして",
    collapse: "折りたたむ",
    expand: "展開する",
    attack: "攻撃力",
    maxHp: "最大HP",
    healPower: "回復力",

    // Upgrade/Gear component - Materials
    totalMaterialsNeeded: "必要な素材の合計",
    noMaterialsNeeded: "アップグレードに必要な素材はありません",
    allMaterialsAvailable: "必要な素材はすべて揃っています! ✓",
    noResourcesNeeded: "アップグレードに必要な素材はありません",
    noPendingUpgrades: "保留中のアップグレードはありません。",
    noMaterialsToConsume: "消費する素材はありません。",
    confirmApplyUpgrade: "アップグレードの確認",
    progression: "育成状況",
    applyUpgrade: "アップグレード適用",
    material: "素材",
    unknownResource: "不明な素材",
    unknown: "不明",
    
    // Mode toggle
    showMissing: "不足アイテムを表示",
    showNeeded: "必要アイテムを表示",
    missing: "不足",
    leftover: "余剰",
    used: "使用",
    notEnough: "不足素材",
    activityReport: "活動報告書",
    equipmentXp: "装備EXP",

    // Resource summary component
    itemsNeeded: "全体の必要アイテム",
    missingItems: "不足アイテム",
    equipmentNeeded: "全体の必要装備",
    missingEquipment: "不足装備",
    gifts: "ギフト",
    giftsNeeded: "必要ギフト",
    missingGifts: "不足ギフト",
    owned: "所持",
    needed: "必要",
    remaining: "残り",
    elephsOwned: "所持エレフ",
    elephsNeeded: "必要エレフ",
    price: "エリグマ価格",
    purchasable: "購入可能数",
    noUpgradeNeeded: "アップグレード不要",
    noLeftoverResources: "余っている素材はありません",
    perStudentView: "生徒別",
    aggregateView: "まとめ表示",

    // Equipment types and gear component
    equipmentTypes: {
      Hat: "帽子",
      Gloves: "グローブ",
      Shoes: "シューズ",
      Bag: "バッグ",
      Badge: "バッジ",
      Hairpin: "ヘアピン",
      Charm: "お守り",
      Watch: "腕時計",
      Necklace: "ネックレス"
    },
    tier: "T",
    gears: "装備",
    currentEquipment: "現在",
    targetEquipment: "目標",
    setMinLevel: "最小レベルに設定",
    setMaxLevel: "最大レベルに設定",
    decreaseLevel: "レベルを下げる",
    increaseLevel: "レベルを上げる",

    // Weapon Grade component
    exclusiveWeapon: "固有武器",
    currentGrade: "現在",
    targetGrade: "目標",
    maxGrade: "最大",
    
    // Info tab
    exclusiveGear: "固有装備",
    empty: "空欄",
    bondRequired: "絆Lv.15以上が必要",
    locked: "未解放",
    atk: "ATK",
    def: "DEF",
    school: "学園",
    club: "部活",

    // Linked students
    switchStyle: "スタイル切替",

    // Inventory modal
    inventory: "所持品",
    studentDetails: "生徒詳細",

    // Buttons and actions
    reset: "リセット",
    save: "保存",
    loading: "読み込み中",
    close: "閉じる",
    update: "更新",
    confirm: "確認",
    cancel: "キャンセル",
    apply: "適用",
    selectAll: "全選択",

    // Navigation
    previous: "前へ",
    next: "次へ",

    // Tools rail
    tools: "ツール",

    // Contact modal
    contactModal: {
      body: "ご質問やバグの報告はDiscordでお問い合わせください：",
    },

    // Credits modal
    creditsModal: {
      dataSources: "データソース",
      dataSourcesBody: "このアプリケーションで使用されているデータは以下を元にしています：",
      translationsHeader: "翻訳",
      translationsBody: "English translations of skills are provided by Lonqie and are used with permission. Please note that translations in other languages may be contributed by other translators and are not free to use in other projects without explicit permission.",
      acknowledgements: "謝辞",
      acknowledgementsBody: "Special thanks to the SchaleDB team and Lonqie for their incredible work in maintaining comprehensive Blue Archive data resources that make applications like this possible.",
    },

    // Ownership (recruited / not recruited)
    ownership: {
      recruited: "加入済み",
      notRecruited: "未加入",
      markRecruited: "加入済みにする",
      markNotRecruited: "未加入にする",
      ownershipFilter: "加入状態",
      filterAll: "全て",
      filterOwned: "加入済み",
      filterUnowned: "未加入",
    },

    // Deck Builder modal
    deckBuilder: {
      title: "デッキビルダー",
      presetName: "プリセット名",
      removeTeam: "チームを削除",
      copyTeamToPreset: "プリセットにコピー",
      dragToReorder: "ドラッグして並び替え",
      selectStriker: "ストライカーを選択",
      selectSpecial: "スペシャルを選択",
      filterByName: "名前で絞り込み...",
      assistLimitReached: "アシスト制限に達しました (1/1) — 既にアシストとして使用中の生徒は非表示",
      noStudentsAvailable: "このスロットに配置できる生徒はいません",
      addTeam: "+ チームを追加",
      exportImage: "画像をエクスポート",
      exporting: "エクスポート中…",
      copiedTo: "コピー先：",
      removeStudent: "生徒を削除",
    },

    // Inventory screenshot parser modal
    scanInventory: "インベントリスキャン",
    inventoryScreenshot: "インベントリスクリーンショット",
    selectInventoryType: "何をスキャンしますか？",
    uploadScreenshot: "スクリーンショットをアップロード",
    dragDropScreenshot: "最大3枚のスクリーンショットを選択またはドロップ",
    parsingScreenshot: "スクリーンショットを解析中…",
    parseFailed: "解析に失敗しました。パーサーサービスが起動しているか確認してください。",
    parseResults: "結果を確認",
    applyInventory: "適用",
    reupload: "再アップロード",
    confidence: "信頼度",
    lowConfidenceWarning: "信頼度の低いアイテムは誤認識の可能性があります。適用前にご確認ください。",
    noItemsDetected: "アイテムが検出されませんでした。パーサーサービスとスクリーンショットを確認してください。",

    // Inventory screenshot scanner — guide panel
    scanGuide: {
      beforeScanning: {
        title: "スキャン前の準備",
        sortOrder: "インベントリの並び順を<strong>アイテムIDの昇順または降順</strong>（ゲーム標準）に設定してください。名前・使用回数・所持数による並び替えには対応していません。",
        onePerScan: "1回のスキャンにつき最大3枚 — まとめて選択またはドロップしてください。追加ページは再アップロードで。",
        selectType: "正しい種類を選択してください：<strong>アイテム</strong>または<strong>装備</strong> — グリッドの構造が異なります。",
      },
      screenshots: {
        title: "スクリーンショット",
        resolution: "<strong>FHD（1920 × 1080）</strong>に最適化されています。アスペクト比でインベントリパネルを検出するため、2K / 4K などの高解像度でも問題ありません。",
        itemsTab: "<strong>アイテム</strong>タブで検出されるもの：経験値素材、秘伝記、戦術教育BD、技術ノート、贈り物（1ページ4行）。",
        equipmentTab: "<strong>装備</strong>タブで検出されるもの：T2以上の装備（1ページ5行）。T1装備および装備経験値アイテムは対象外です。",
      },
      reviewing: {
        title: "結果の確認",
        confidence: "オレンジ色のカードは中程度の信頼度（50〜80%）を示します。優先的に確認してください。",
        hoverControls: "カードにカーソルを合わせると操作ボタンが表示されます：<strong>✏</strong> アイテム変更 · 個数を編集 · <strong>×</strong> 削除。",
        appliesDetected: "適用は<strong>検出されたアイテム</strong>の個数のみを更新します。未検出のセルはそのまま残ります。",
      },
      limitations: {
        title: "既知の制限事項",
        iconSimilarity: "同じデザインシリーズ内で見た目の似たアイテム（戦術教育BDシリーズなど）を誤認識する場合があります。",
      },
      examples: {
        title: "スクリーンショットの例",
        correct: "✓ 正しい",
        clipped: "✗ 見切れ",
        clippedCaption: "1行目が途切れています — 全ての辺にグレーの余白が必要です",
      },
    },

    // Inventory screenshot scanner — modal UX strings (validation errors, loading tips, banners)
    scanModal: {
      errInvalidMime: "PNG、JPG、WebP のいずれかの画像を選択してください。",
      errDecodeFailed: "画像のサイズを読み取れませんでした。別のファイルをお試しください。",
      errNotLandscape: "スクリーンショットは横向き（16:9）にしてください。これはスマートフォンの縦画面のようです（{width}×{height}）。",
      errTooSmall: "スクリーンショットは{minWidth}px以上の幅が必要です（FHD以上）。現在は{width}×{height}です。",
      errBadAspect: "スクリーンショットは 16:9（例：1920×1080）にしてください。現在の{width}×{height}は対応していないアスペクト比です。",
      errTooMany: "1回のスキャンにつき最大{max}枚です。枚数を減らしてください。",
      tipFast: "AIビジョンで個数を読み取り中…",
      tipSlow: "想定より時間がかかっています — ローカルOCRを実行中（合計約4分）。タブを開いたままで構いません。",
      appliedOne: "1個のアイテムを適用しました — 次のスクリーンショットをアップロード、または閉じてください。",
      appliedMany: "{count}個のアイテムを適用しました — 次のスクリーンショットをアップロード、または閉じてください。",
      prepHintItems: "<strong>スクリーンショットを撮る前に：</strong>ゲーム内フィルターで経験値素材、秘伝記、戦術教育BD、技術ノート、贈り物のみを表示してください。それ以外のカテゴリは検出されません。",
      prepHintEquipment: "<strong>スクリーンショットを撮る前に：</strong>1行目にT2以上の装備が表示されるようにスクロールしてください。T1装備および装備経験値アイテムは対象外です。",
    },

    // Bulk Modify Students modal
    bulkModify: {
      title: "生徒の一括変更",
      studentSelection: "生徒選択",
      selected: "選択済み",
      filters: {
        baseGrade: "初期星級",
        availability: "入手方法",
        charLevel: "キャラLv",
        formStatus: "設定状態",
        unfilledOnly: "未設定のみ",
      },
      availability: {
        fest: "フェス",
        unique: "固定",
        event: "イベント",
        regular: "通常",
      },
      selectAllFiltered: "フィルタした生徒を全選択",
      visible: "表示数",
      formInputs: "入力フォーム",
      setSeparateTargets: "目標を個別に設定",
      formNote: "空欄の項目は既存の値を保持します。データのない生徒にはデフォルト値が使用されます。",
      fields: {
        bond: "絆",
        characterLevel: "キャラクターレベル",
        skillEx: "EXスキル",
        skillPublic: "通常スキル",
        skillPassive: "パッシブスキル",
        skillExtraPassive: "サブスキル",
        equipmentSlot1: "装備スロット1",
        equipmentSlot2: "装備スロット2",
        equipmentSlot3: "装備スロット3",
        gradeLevel: "星級",
        potentialLevel: "ポテンシャルレベル",
      },
      overwriteWarningPrefix: "警告：",
      overwriteWarningSuffix: "人の生徒にデフォルト以外の保存済みフォームデータがあります。入力されたフィールドはそれらの値を上書きします。",
      applying: "適用中...",
      apply: "一括変更を適用",
    },

    // Bond Update tool
    bondUpdate: {
      title: "絆更新",
      placeholder: "name bond\ns.name bond\n...",
      parse: "解析",
      flagged: "要解決",
      skip: "スキップ",
      searchPlaceholder: "生徒を検索...",
      guideTitle: "フォーマットガイド",
      guideLine1: "1行につき1人",
      guideLine2: "名前は大文字・小文字を区別しません",
      guideLine3: "バリアントはprefix.nameで指定 — 文字を追加すると絞り込めます:",
      guideLine4: "マッチしない名前は手動で選択できます",
      guideLineRomaji: "名前は常にローマ字で入力してください（全言語で使用可能）",
      guideLinePrefixes: "よく使うプレフィックス（文字を追加すると絞り込めます: bu=バニー, ba=臨戦）:",
      prefixTable: "b=バニーガール/臨戦/バンド · c=応援団/クリスマス/キャンプ/私服/ライディング · d=ドレス · g=ガイド · i=アイドル · m=メイド/マジカル · n=正月 · o=温泉 · p=パジャマ/アルバイト · q=チーパオ · s=水着 · t=体操服/シロコ＊テラー · u=制服",
    },

    // Crafting Fodder tool
    craftingFodder: {
      title: "クラフト素材",
      keepAtLeast: "最低限キープ",
      stage1Filter: "ステージ1に表示",
      stage1: "ステージ1素材",
      stage2: "ステージ2素材 (SR / SSR)",
      artifact: "アーティファクト",
      bookItem: "本",
      cdItem: "音楽",
      noFodder: "閾値を超える余剰素材はありません",
      legend: "凡例",
      legendCraft: "クラフト",
      legendExcess: "余剰",
      legendQty: "リサイクル可能",
    },

    // Student filter panel
    filter: {
      title: "フィルター",
      clearAll: "全クリア",
      type: "タイプ",
      rarity: "レアリティ",
      attackType: "攻撃",
      defenseType: "防御",
      academy: "学園",
      equipment: "装備",
      availability: "入手方法",
      regular: "通常",
      limited: "限定",
      unique: "ユニーク",
      fest: "フェス",
      perm3star: "アーカイブ",
      other: "その他",
    },
  }
};

// Create a computed ref that returns the translations for the current language
export const t = computed(() => {
  return translations[currentLanguage.value];
});

// Resolved translation cache keyed by "lang:path".
// Keying on language means no invalidation is ever needed — switching language
// just uses a different key prefix, leaving old entries harmlessly stale.
const _translationCache = new Map<string, string>();

// Function to get a specific translation using a path
export function useTranslation(path: string, language?: Language): string {
  const lang = language || currentLanguage.value;
  const cacheKey = `${lang}:${path}`;

  const cached = _translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const parts = path.split('.');
  let result: any = translations[lang];

  for (const part of parts) {
    if (result && result[part] !== undefined) {
      result = result[part];
    } else {
      console.warn(`Translation missing for path: ${path} in language: ${lang}`);
      // Try to get the English equivalent as fallback
      if (lang !== 'en') {
        const fallback = useTranslation(path, 'en');
        _translationCache.set(cacheKey, fallback);
        return fallback;
      }
      _translationCache.set(cacheKey, path);
      return path;
    }
  }

  _translationCache.set(cacheKey, result);
  return result;
}

// Helper function to access nested translations.
// Optional `params` substitutes `{key}` placeholders in the resolved string.
//   $t('reachesBond', { n: 87 })  →  EN: "→ Reaches Bond 87"
export function $t(path: string, params?: Record<string, string | number>): string {
  const raw = useTranslation(path);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
