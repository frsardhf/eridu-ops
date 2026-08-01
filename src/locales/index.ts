import { currentLanguage, Language } from '../lib/stores/localizationStore';

// The English tree is the canonical shape. `jp` and `kr` are annotated with
// TranslationTree (derived from `en` below), so a missing or misnamed key fails
// typecheck instead of silently falling back to English at runtime. `kr` is
// authored in full; new keys must be added to all three blocks.
const en = {
  // Chibi 3D.
  chibi: {
    home: 'Home',
    hint: 'Click anywhere to send the Chibi walking there.',
    idle: 'Idle',
    itemRail: 'Items',
    recoveryItem: 'Recovery item',
    dragItemHint: 'Drag onto the Chibi',
    landingLink: 'Visit the Chibi Room',
    wandering: 'Wandering',
    wanderingHint: 'Let the Chibi choose where to walk.',
    wanderingActiveHint: 'Wandering automatically. Click anywhere to choose a destination.',
    wanderingPausedInspect: 'Wandering is paused during Inspect.',
    wanderingPausedMotion: 'Wandering is unavailable while reduced motion is enabled.',
    orbitHintMouse: 'left-drag to rotate · right-drag to pan · wheel to zoom',
    orbitHintTouch: 'one finger to rotate · two fingers to pan or zoom',
  },

  // Landing
  landingSubtitle: 'Blue Archive Student Companion',
  studentsDesc: 'Track bond levels, skill upgrades, gear progression, and material costs.',
  bondsDesc: 'Gift planning and bond progress tracker for your students.',
  craftingDesc: 'Plan fodder crafts from surplus materials and track each session’s progress.',
  bond100Desc: 'See who across the player base has reached Bond 100 with each student.',
  navigation: 'Navigation',
  landingDisclaimerBefore:
    'Eridu Ops is an unofficial fan project, not affiliated with Nexon, Nexon Games, or Yostar. Game data and images are provided via ',
  landingDisclaimerAfter:
    '; all artwork, information, and assets remain the property of their respective owners.',

  // Bond100 page
  bond100: {
    nav: 'Hall',
    title: 'Bond 100 Hall',
    subtitle: "Who's reached Bond 100 across Global servers.",
    aboutTitle: 'About these counts',
    aboutInfo: 'About Bond 100 Hall',
    aboutCount: 'Each number is how many players have reached Bond 100 with that student.',
    aboutSources:
      'Counts come from a daily snapshot of public in-game ranking data via arona.icu. Only a player name and server are shown.',
    aboutDelay:
      'Newly added or refreshed players can take a day or two to appear, the wall is a daily snapshot and arona updates on its own schedule.',
    demoDataNote: 'Preview data. Live counts coming soon.',
    summaryUnavailable: 'Bond 100 Hall is unavailable right now.',
    entriesUnavailable: "Couldn't load entries for this student.",
    atBond100: 'at Bond 100',
    updatedToday: 'Updated today',
    updatedYesterday: 'Updated yesterday',
    updatedDaysAgo: 'Updated {days} days ago',
    studentsRepresented: 'Students',
    server: 'Server',
    allServers: 'All servers',
    school: 'School',
    allSchools: 'All schools',
    hideEmpty: 'Hide empty',
    hideEmptyAria: 'Show only students with Bond 100',
    sort: 'Sort',
    stats: {
      aria: 'Hall stats',
      title: 'Hall summary',
      byServer: 'By server',
      bySchool: 'By school',
      topStudents: 'Most reached',
      coverage: 'Coverage',
      ofStudents: 'of {total} students',
      updated: 'Last updated',
      empty: 'No Bond 100 data yet.',
    },
    sortModes: {
      default: 'Default',
      name: 'Name',
      bond100: 'Count',
      recent: 'Recent',
    },
    viewToggleAria: 'Hall view',
    viewWall: 'Wall',
    viewPlayers: 'Players',
    players: {
      searchPlaceholder: 'Search players...',
      allCounts: 'All',
      allStudents: 'All students',
      countFilterAria: 'Filter by Bond 100 count',
      studentFilterAria: 'Filter by student',
      playerCount: '{n} players',
      noPlayers: 'No players match these filters.',
      showMore: 'Show more',
    },
    searchPlaceholder: 'Search students...',
    noStudents: 'No students match these filters.',
    submit: 'Add Bond 100',
    requestRemoval: 'Request removal',
    entriesTitle: '{name} · Bond 100 Hall',
    entriesKicker: 'Hall entries',
    noEntries: 'No entries yet.',
    searchEntries: 'Search senseis...',
    noEntriesSearch: 'No senseis match your search.',
    form: {
      back: 'Back',
      cancel: 'Cancel',
      send: 'Submit',
      sending: 'Submitting…',
      name: 'In-game name',
      friendCode: 'Friend code',
      assistHint:
        "Put the students you want listed in a support/assist slot first. Only assisted students are visible to arona, and your account is pulled from arona, so you'll appear in the next update.",
      guidelinesBody:
        'To remove your entry: open the arona.icu page below, enter your server and friend code, then press the "Remove share" button. It updates here on the next sync.',
      proof: 'Proof URL',
      contact: 'Contact',
      reason: 'Reason',
      reasonPrivacy: "I don't want to be listed",
      reasonIncorrect: "This entry is wrong or isn't me",
      reasonOther: 'Other',
      whichListing: 'Which listing is yours?',
      optional: 'optional',
      selectPlaceholder: 'Select…',
      privacyNote:
        'Friend code is used only to verify your entry and prevent duplicates, and is never published or stored as-is. Contact and proof are seen only by moderators.',
      submittedTitle: 'Submitted',
      submittedBody:
        "Thanks! You'll appear on the Hall after the next sync. This can take a day or two, depending on arona's update schedule.",
      removalSubmittedBody: "Thanks! We'll review your removal request shortly.",
      error: "Couldn't submit right now. Please try again later.",
      fallbackTitle: 'Add yourself on arona.icu',
      fallbackBody:
        "We couldn't submit that right now (today's quota may be reached). You can add yourself directly on arona.icu instead. You'll show up on the next Hall update:",
      fallbackSteps: 'Select your server, enter your friend code, then press the Refresh button.',
      tryAgain: 'Try again',
    },
    serverRegions: {
      global_na: 'Global NA',
      global_asia: 'Global Asia',
      global_eu: 'Global EU',
      global_kr: 'Global KR',
      global_tw: 'Global TW/HK',
    },
  },

  // BondsPage
  otherGifts: 'Other gifts',
  favoredGifts: 'Favorite Gifts',
  exp: 'EXP',
  total: 'Total',
  totalSr: 'Total SR',
  totalSsr: 'Total SSR',
  addStudent: 'Add student',
  noTrackedStudents: 'No tracked students yet. Add a student to start planning bonds and gifts.',
  layoutTabs: 'Tabs',
  layoutCards: 'Cards',
  suggestedStudents: 'Suggested',
  alreadyTracked: 'Tracking',
  bondMaxed: 'Bond maxed',
  allOwnedStudents: 'All owned',
  untrack: 'Untrack',
  untrackTooltip: 'Your gift allocations are preserved. Re-add anytime from the picker.',
  hideEditor: 'Hide',
  showEditor: 'Show',
  planGifts: 'Plan gifts for this student',
  hideGiftGrid: 'Hide gift grid',
  showSummary: 'Show summary',
  hideSummary: 'Hide summary',
  yellowStones: 'Yellow stones',
  conversion: 'Conversion',
  consumed: 'Consumed',

  // BondsPage: Other EXP sources panel
  otherExpSources: 'Other EXP',
  otherExpTooltip: 'Plan cafe taps and add bonus EXP from lessons',
  cafeTaps: 'Cafe taps',
  tapsPerDay: 'Taps / day',
  startDate: 'Start date',
  endDate: 'End date',
  targetDate: 'Target date',
  day: 'day',
  days: 'days',
  inclusiveAbbr: 'incl',
  exclusiveAbbr: 'excl',
  includeTodayTooltip: 'Toggle whether the target date counts as a day',
  bonusExp: 'Bonus EXP',
  bonusExpTooltip: 'EXP from lessons',
  manualExp: 'Amount',
  lessonRates: 'Lesson rates',
  areaRank: 'Area rank',
  expPerLesson: 'EXP',
  bonusChance: '2× EXP chance',
  clear: 'Clear',
  clearAll: 'Clear all',
  done: 'Done',
  projection: 'Projection',
  reachesBondN: '→ Bond {n}',
  reachesBondMax: '→ Bond 100',

  // Data load failure banner
  dataLoadError: 'Could not load student data from SchaleDB. Check your connection and try again.',
  retry: 'Retry',

  // Navbar
  students: 'Students',
  bonds: 'Bonds',
  searchStudents: 'Search students...',
  search: 'Search...',
  noResults: 'No matches.',
  sort: {
    id: 'ID',
    name: 'Name',
    default: 'Default',
    bond: 'Bond',
    level: 'Level',
    grade: 'Grade',
    equipment: 'Equipment',
    skill: 'Skills',
    potential: 'Potential',
    school: 'School',
    club: 'Club',
    pinned: 'Pinned',
    pinnedHint: 'Sorting is paused while Pinned view is on.',
    method: 'Sorting Method',
    sectionInfo: 'Student Info',
    sectionProgress: 'Progression',
  },
  direction: {
    ascending: 'Ascending',
    descending: 'Descending',
  },
  overlays: {
    title: 'Show on cards',
    selectAll: 'Select all',
    level: 'Level',
    grade: 'Grade',
    equipment: 'Equipment',
    skills: 'Skills',
    potential: 'Potential',
  },
  data: 'Data',
  exportData: 'Export Data',
  importData: 'Import Data',
  app: 'App',
  contact: 'Contact',
  credits: 'Credits',
  whatsNew: "What's New",
  whatsNewLatest: 'Latest update',
  previousUpdates: 'Previous updates',
  noPreviousUpdates: 'No previous updates yet.',

  // Import modal
  importErrorFileType: 'Please select a .txt file',
  importingData: 'Importing data...',
  importSuccessful: 'Import successful! Reloading page...',
  importFailed: 'Import failed. Please try again.',
  importFileFormatError: 'Import failed. Please check your file format.',
  dragDropFile: 'Drag & drop your export file here',
  or: 'or',
  browseFiles: 'Browse Files',
  importInstructions: 'Import your previously exported data to restore your progress and settings.',
  importWarning: 'Note: This will replace your current data and reload the page.',
  importFromFile: 'From File',
  importFromText: 'From Text',
  pasteImportData: 'Paste justin163 data',
  import: 'Import',
  importEmptyText: 'Please paste data',

  // Student modal tabs
  info: 'Info',
  bond: 'Bond',
  upgrade: 'Skills',
  gear: 'Weapons',
  items: 'Items',
  equipment: 'Equipment',
  summary: 'Summary',

  // Bond component
  currentBond: 'Current Bond',
  editBondLevel: 'Click to edit bond level',
  openInBondsPage: 'Open in Bonds page',
  returnToStudent: 'Return to student',
  expToNextLevel: 'XP to next level',
  totalExp: 'Total EXP',

  // Gift options
  giftOptions: 'Gift Options',
  convertGiftBox: 'Convert Box',
  syncGifts: 'Sync Gifts',
  resetGifts: 'Reset',
  undoChanges: 'Undo',
  redoChanges: 'Redo',
  convertGiftBoxTooltip:
    'Convert SR gift materials into selector boxes. Each box costs 1 fusion keystone and 2 SR gift materials. Requires at least 1 fusion keystone and 2 SR gift materials.',
  syncGiftsTooltip:
    'Fill gift quantities from your current inventory, reserving amounts already allocated to other students.',
  resetGiftsTooltip: 'Reset all gift quantities to zero.',
  undoChangesTooltip: 'Undo changes and revert to previous gift quantities.',
  redoChangesTooltip: 'Redo previously undone changes.',
  manualStepperWarning:
    'Manual changes will clear per-gift tracking. Use Sync Gifts to restore it.',
  // Sync Gifts mode dialog
  syncGiftsModeTitle: 'Sync Gifts Mode',
  syncGiftsModeGreedy: 'Fill All Available',
  syncGiftsModeGreedyDesc:
    "Fills all owned gifts regardless of other students' gear upgrade needs.",
  syncGiftsModeAware: 'Reserve Gear Needs First',
  syncGiftsModeAwareDesc:
    "Reserves gifts needed for other students' exclusive gear upgrades before filling.",
  // Convert material selection dialog
  convertMaterialTitle: 'Select Conversion Materials',
  convertMaterialDesc: 'Select which gifts to use as materials ({needed} needed):',
  convertMaterialSelected: '{current} / {needed} selected',
  convertMaterialConfirm: 'Convert',
  convertMaterialInventoryNote:
    'Does not deduct from your owned counts. Update them after converting in-game.',

  // Upgrade component - Skills
  skills: 'Skills',
  maxAll: 'Max All',
  maxTarget: 'Max Target',
  max: 'MAX',
  cost: 'Cost',
  level: 'Level',
  current: 'Current',
  target: 'Target',
  skillToggle: {
    normal: 'Switch to normal EX skill',
    enhanced: 'Switch to enhanced EX skill',
  },

  // Upgrade component - Levels
  characterLevel: 'Level',
  currentLevel: 'Current Level',
  targetLevel: 'Target Level',
  xpRequired: 'XP Required',
  maxLevel: 'MAX LEVEL',
  maxBond: 'MAX BOND',

  // Upgrade component - Potential/Talent
  talent: 'Talent',
  clickTo: 'click to',
  collapse: 'collapse',
  expand: 'expand',
  attack: 'ATK',
  maxHp: 'Max HP',
  healPower: 'Healing',

  // Upgrade/Gear component - Materials
  totalMaterialsNeeded: 'Total Materials Needed',
  noMaterialsNeeded: 'No resources needed for upgrades',
  allMaterialsAvailable: 'You have all the materials you need! ✓',
  noResourcesNeeded: 'No resources needed',
  noPendingUpgrades: 'No pending upgrades.',
  noMaterialsToConsume: 'No materials to consume.',
  confirmApplyUpgrade: 'Confirm Apply Upgrade',
  progression: 'Progression',
  applyUpgrade: 'Apply Upgrade',
  material: 'Material',
  unknownResource: 'Unknown Resource',
  unknown: 'Unknown',

  // Mode toggle
  showMissing: 'Show Missing',
  showNeeded: 'Show Needed',
  missing: 'Missing',
  leftover: 'Leftover',
  used: 'Used',
  notEnough: 'Not enough',
  activityReport: 'Activity Report',
  equipmentXp: 'Equipment XP',

  // Resource summary component
  itemsNeeded: 'Items Needed',
  missingItems: 'Missing Items',
  equipmentNeeded: 'Equipment Needed',
  missingEquipment: 'Missing Equipment',
  gifts: 'Gifts',
  giftsNeeded: 'Gifts Needed',
  missingGifts: 'Missing Gifts',
  owned: 'Owned',
  needed: 'Needed',
  remaining: 'Remaining',
  elephsOwned: 'Elephs Owned',
  elephsNeeded: 'Elephs Needed',
  price: 'Eligma Price',
  purchasable: 'Purchasable',
  noUpgradeNeeded: 'No upgrade needed',
  noLeftoverResources: 'No leftover resources',
  perStudentView: 'Per Student',
  aggregateView: 'Aggregate',

  // Equipment types and gear component
  equipmentTypes: {
    Hat: 'Hat',
    Gloves: 'Gloves',
    Shoes: 'Shoes',
    Bag: 'Bag',
    Badge: 'Badge',
    Hairpin: 'Hairpin',
    Charm: 'Amulet',
    Watch: 'Wristwatch',
    Necklace: 'Necklace',
  },
  tier: 'T',
  gears: 'Gears',
  currentEquipment: 'Current',
  targetEquipment: 'Target',
  setMinLevel: 'Set to minimum level',
  setMaxLevel: 'Set to maximum level',
  decreaseLevel: 'Decrease level',
  increaseLevel: 'Increase level',

  // Weapon Grade component
  exclusiveWeapon: 'Ex Weapon',
  currentGrade: 'Current',
  targetGrade: 'Target',
  maxGrade: 'MAX',

  // Info tab
  exclusiveGear: 'Exclusive Gear',
  empty: 'EMPTY',
  bondRequired: 'Bond > 15 Required',
  locked: 'Locked',
  atk: 'ATK',
  def: 'DEF',
  school: 'School',
  club: 'Club',

  // Linked students
  switchStyle: 'Switch Style',

  // Inventory modal
  inventory: 'Inventory',
  studentDetails: 'Student Details',

  // Buttons and actions
  reset: 'Reset',
  save: 'Save',
  loading: 'Loading',
  close: 'Close',
  update: 'Update',
  confirm: 'Confirm',
  cancel: 'Cancel',
  apply: 'Apply',
  selectAll: 'Select All',

  // Navigation
  previous: 'Previous',
  next: 'Next',

  // Tools rail
  tools: 'Tools',

  // Contact modal
  contactModal: {
    body: 'If you have any inquiries or want to report bugs, you can contact me on Discord or Twitter:',
  },

  // Credits modal
  creditsModal: {
    dataSources: 'Data Sources',
    dataSourcesBody: 'The data used in this application is sourced from:',
    translationsHeader: 'Translations',
    translationsBody:
      'English translations of skills are provided by Lonqie and are used with permission. Please note that translations in other languages may be contributed by other translators and are not free to use in other projects without explicit permission.',
    acknowledgements: 'Acknowledgements',
    acknowledgementsBody:
      'Special thanks to the SchaleDB team and Lonqie for their incredible work in maintaining comprehensive Blue Archive data resources that make applications like this possible.',
    acknowledgementsArona:
      'Special thanks to 本心 (benx1n) for granting access to the arona.icu API, which powers the Bond 100 community counts on the Hall.',
    disclaimerHeader: 'Disclaimer',
    disclaimerBody:
      'Blue Archive and all related game assets and data are © NEXON Games / Yostar. This is a non-commercial fan project for personal and educational use only; not for sale or redistribution. Not affiliated with or endorsed by NEXON.',
  },

  // Ownership (recruited / not recruited)
  ownership: {
    recruited: 'Recruited',
    notRecruited: 'Not Recruited',
    markRecruited: 'Mark Recruited',
    markNotRecruited: 'Mark Not Recruited',
    ownershipFilter: 'Recruitment',
    filterAll: 'All',
    filterOwned: 'Recruited',
    filterUnowned: 'Not Recruited',
  },

  // Deck Builder modal
  deckBuilder: {
    title: 'Deck Builder',
    presetName: 'Preset name',
    removeTeam: 'Remove team',
    copyTeamToPreset: 'Copy team to preset',
    dragToReorder: 'Drag to reorder team',
    selectStriker: 'Select Striker',
    selectSpecial: 'Select Special',
    filterByName: 'Filter by name...',
    assistLimitReached: 'Assist limit reached (1/1): students already used as assist are hidden',
    noStudentsAvailable: 'No students available for this slot',
    addTeam: '+ Add Team',
    exportImage: 'Export Image',
    exporting: 'Exporting…',
    copiedTo: 'Copied to',
    removeStudent: 'Remove student',
  },

  // Inventory screenshot parser modal
  scanInventory: 'Scan Inventory',
  inventoryScreenshot: 'Inventory Screenshot',
  selectInventoryType: 'What are you scanning?',
  uploadScreenshot: 'Upload Screenshot',
  dragDropScreenshot: 'Select or drop up to 3 screenshots',
  parsingScreenshot: 'Parsing screenshot…',
  parseFailed: 'Parse failed. Is the parser service running?',
  parseResults: 'Review Results',
  applyInventory: 'Apply',
  reupload: 'Re-upload',
  confidence: 'Confidence',
  lowConfidenceWarning: 'Low-confidence items may be incorrect. Check before applying.',
  noItemsDetected:
    'No items detected. Check that the parser service is running and the screenshot is correct.',

  // Inventory screenshot scanner: guide panel
  scanGuide: {
    beforeScanning: {
      title: 'Before scanning',
      sortOrder:
        'Set inventory sort to <strong>ascending or descending by Item ID</strong> (the game default). Name / usage / owned sort is not supported.',
      onePerScan:
        'Up to 3 screenshots per scan. Select or drop them together. Re-upload for more pages.',
      selectType:
        'Select the correct type: <strong>Items</strong> or <strong>Equipment</strong>. The grids differ.',
    },
    screenshots: {
      title: 'Screenshots',
      resolution:
        'Optimised for <strong>FHD (1920 × 1080)</strong>. Higher resolutions (2K / 4K) work fine. The parser locates the inventory panel by aspect ratio.',
      itemsTab:
        '<strong>Items</strong> tab detects: EXP materials, Artifacts, Blu-ray, Tech Notes, and Gifts (4 rows per page).',
      equipmentTab:
        '<strong>Equipment</strong> tab detects: T2+ equipment pieces (5 rows per page). T1 pieces and EXP equipment are excluded.',
    },
    reviewing: {
      title: 'Reviewing results',
      confidence:
        'Orange-highlighted cards indicate moderate confidence (50–80%). Inspect these first.',
      hoverControls:
        'Hover any card to reveal controls: <strong>✏</strong> change item · edit quantity field · <strong>×</strong> remove.',
      appliesDetected:
        'Applying only updates quantities for <strong>detected items</strong>. Undetected cells are left unchanged.',
    },
    examples: {
      title: 'Screenshot examples',
      correct: '✓ Correct',
      clipped: '✗ Clipped',
      clippedCaption: 'First row partially cut; grey padding must be visible on all sides',
    },
  },

  // Inventory screenshot scanner: modal UX strings (validation errors, loading tips, banners)
  scanModal: {
    errInvalidMime: 'Please select a PNG, JPG, or WebP image.',
    errDecodeFailed: 'Could not read image dimensions. Try a different file.',
    errNotLandscape:
      'Screenshot must be landscape (16:9). Yours looks like a phone capture ({width}×{height}).',
    errTooSmall:
      'Screenshot must be at least {minWidth}px wide (FHD or higher). Yours is {width}×{height}.',
    errBadAspect:
      'Screenshot must be 16:9 (e.g. 1920×1080). Yours is {width}×{height}, not a supported aspect ratio.',
    errTooMany: 'Up to {max} screenshots per scan. Please select fewer.',
    tipFast: 'Matching icons & reading quantities…',
    tipSlow:
      'Taking longer than usual, retrying the quantity reader. Unread quantities will be flagged for manual entry.',
    appliedOne: 'Applied 1 item. Upload another screenshot or close.',
    appliedMany: 'Applied {count} items. Upload another screenshot or close.',
    prepHintItems:
      "<strong>Before screenshotting:</strong> apply in-game filters so only EXP materials, Artifacts, Blu-ray, Tech Notes, and Gifts are visible. Other categories won't be detected.",
    prepHintEquipment:
      '<strong>Before screenshotting:</strong> scroll so the first row contains T2+ equipment. T1 pieces and EXP equipment are excluded.',
  },

  // Bulk Modify Students modal
  bulkModify: {
    title: 'Bulk Modify Students',
    studentSelection: 'Student Selection',
    selected: 'Selected',
    filters: {
      baseGrade: 'Base Grade',
      availability: 'Availability',
      charLevel: 'Char Level',
      formStatus: 'Form Status',
      unfilledOnly: 'Unfilled Only',
    },
    availability: {
      fest: 'Fest',
      unique: 'Unique',
      event: 'Event',
      regular: 'Regular',
    },
    selectAllFiltered: 'Select all filtered students',
    visible: 'Visible',
    formInputs: 'Form Inputs',
    setSeparateTargets: 'Set separate targets',
    formNote:
      'Leave empty to keep existing value. For students without form data, defaults are used.',
    fields: {
      bond: 'Bond',
      characterLevel: 'Character Level',
      skillEx: 'EX Skill',
      skillPublic: 'Basic Skill',
      skillPassive: 'Enhanced Skill',
      skillExtraPassive: 'Sub Skill',
      equipmentSlot1: 'Equipment Slot 1',
      equipmentSlot2: 'Equipment Slot 2',
      equipmentSlot3: 'Equipment Slot 3',
      gradeLevel: 'Grade Level',
      potentialLevel: 'Potential Level',
    },
    overwriteWarningPrefix: 'Warning: ',
    overwriteWarningSuffix:
      ' selected students already have non-default saved form data. Filled fields will replace those values.',
    applying: 'Applying...',
    apply: 'Apply Bulk Update',
  },

  // Bond Update tool
  bondUpdate: {
    title: 'Bond Update',
    placeholder: 'name bond\ns.name bond\n...',
    parse: 'Parse',
    flagged: 'Needs Resolution',
    skip: 'Skip',
    searchPlaceholder: 'Search student...',
    guideTitle: 'Format Guide',
    guideLine1: 'One student per line',
    guideLine2: 'Names are case-insensitive',
    guideLine3: 'Use prefix.name for variants; more letters disambiguate:',
    guideLine4: 'Unmatched names are flagged for manual pick',
    guideLineRomaji: 'Always use the romaji base name; works in all locales',
    guideLinePrefixes: 'Common prefixes (add letters to disambiguate: bu=Bunny, ba=Battle):',
    prefixTable:
      'b=Bunny/Battle (Armed)/Band · c=Cheerleader/Christmas/Camp/Casual/Cycling · d=Dress · g=Guide · i=Idol · m=Maid/Magical · n=New Year · o=Onsen · p=Pajama/Part-Timer · q=Qipao · s=Swimsuit · t=Track/Terror · u=Uniform',
  },

  // Crafting Fodder tool
  craftingFodder: {
    nav: 'Crafting',
    subtitle: 'Track a stable crafting session without changing the inventory behind your plan.',
    keepAtLeast: 'Keep at least',
    stage1Filter: 'Show in Stage 1',
    stage1: 'Stage 1 Fodder',
    stage2: 'Stage 2 Fodder (SR / SSR)',
    artifact: 'Artifact',
    bookItem: 'Tech Notes',
    cdItem: 'Blu-ray',
    noFodder: 'No materials assigned to this stage in the current full-craft plan',
    legend: 'Legend',
    legendCraft: 'Crafts',
    legendExcess: 'Excess',
    legendQty: 'Recyclable',
    craftsLeft: 'Crafts left',
    fodderLeft: 'Fodder left',
    finalExcess: 'Final excess',
    complete: 'Complete',
    recordOne: 'Record one craft',
    undoOne: 'Undo one craft',
    resetMaterial: 'Reset this material',
    openInventory: 'Open inventory',
    refreshPlan: 'Refresh plan',
    craftsRemaining: 'full crafts remaining',
    stage1Capacity: 'Stage 1 capacity',
    stage2Capacity: 'Stage 2 capacity',
    capacityHint:
      'Standalone maximum for this stage. Materials allowed in both stages are shared and cannot be spent twice.',
    craftsRecorded: 'full crafts recorded',
    hideComplete: 'Hide complete',
    resetProgress: 'Reset progress',
    refreshNotice:
      'Inventory or fodder rules changed. Your active session is unchanged until you refresh it.',
    planSettings: 'Plan settings',
    rulesHint: 'Changes apply when you refresh the plan.',
    searchPlaceholder: 'Search materials or ID...',
    materialType: 'Material type',
    allTypes: 'All',
    materialTypeSingular: 'material type',
    materialTypePlural: 'material types',
    possible: 'possible',
    assigned: 'assigned',
    noMatches: 'No materials match these filters',
    reset: 'Reset',
    resetRow: 'Reset this row',
  },

  equipmentFarming: {
    title: 'Equipment Farming',
    subtitle: 'Normal stages to farm for your missing Tier 2+ equipment.',
    dropEvent: 'Drop rate event',
    empty: 'No missing equipment. Every Tier 2+ piece you need is already covered.',
    runs: '≈{n} runs',
    stages: '{n} stages',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    missingTitle: 'Missing equipment',
  },

  // Student filter panel
  filter: {
    title: 'Filter',
    clearAll: 'Clear All',
    type: 'Type',
    rarity: 'Rarity',
    attackType: 'Attack',
    defenseType: 'Defense',
    academy: 'Academy',
    equipment: 'Equipment',
    availability: 'Availability',
    regular: 'Regular',
    limited: 'Limited',
    unique: 'Unique',
    fest: 'Fest',
    perm3star: 'Archived',
    other: 'Other',
  },
};

type TranslationTree = typeof en;

const jp: TranslationTree = {
  // Chibi 3D.
  chibi: {
    home: 'ホーム',
    hint: 'クリックした場所にリオが歩いていきます。',
    idle: '待機',
    itemRail: 'アイテム',
    recoveryItem: '回復アイテム',
    dragItemHint: 'ちびキャラにドラッグ',
    landingLink: 'ちびキャラルームへ',
    wandering: 'お散歩',
    wanderingHint: 'ちびキャラが自動で歩き回ります。',
    wanderingActiveHint: '自動で歩き回ります。クリックすると行き先を指定できます。',
    wanderingPausedInspect: 'インスペクト中はお散歩が一時停止します。',
    wanderingPausedMotion: 'モーション軽減が有効なため、お散歩は利用できません。',
    orbitHintMouse: '左ドラッグで回転 · 右ドラッグで移動 · ホイールでズーム',
    orbitHintTouch: '1本指で回転 · 2本指で移動またはズーム',
  },

  // Landing
  landingSubtitle: 'ブルーアーカイブ 生徒育成コンパニオン',
  studentsDesc: '絆レベル、スキル強化、装備の進捗、素材コストを追跡。',
  bondsDesc: 'ギフト計画と絆進捗の追跡。',
  craftingDesc: '余剰素材から素材クラフトを計画し、セッションごとの進捗を管理。',
  bond100Desc: 'プレイヤー間で誰がどの生徒と絆100に到達したかを確認。',
  navigation: 'ナビゲーション',
  landingDisclaimerBefore:
    'Eridu Opsは非公式のファン制作物であり、Nexon、Nexon Games、Yostarとは一切関係ありません。ゲームデータおよび画像は',
  landingDisclaimerAfter:
    '経由で提供されています。すべてのイラスト、情報、アセットの権利は各権利者に帰属します。',

  // Bond100 page
  bond100: {
    nav: '殿堂',
    title: '絆100 殿堂',
    subtitle: 'グローバル各サーバーで誰が絆100に到達したか。',
    aboutTitle: '件数について',
    aboutInfo: '絆100殿堂について',
    aboutCount: '各数値は、その生徒と絆100に到達したプレイヤーの人数です。',
    aboutSources:
      '件数は arona.icu 経由のゲーム内公開ランキングの日次スナップショットに基づいています。表示されるのはプレイヤー名とサーバーのみです。',
    aboutDelay:
      '新しく追加・更新されたプレイヤーは表示まで1〜2日かかることがあります。ウォールは日次スナップショットで、arona の更新タイミングにも依存します。',
    demoDataNote: 'プレビューデータ（実際の件数は近日公開）。',
    summaryUnavailable: '絆100殿堂は現在利用できません。',
    entriesUnavailable: 'この生徒のエントリーを読み込めませんでした。',
    atBond100: '人が絆100',
    updatedToday: '本日更新',
    updatedYesterday: '昨日更新',
    updatedDaysAgo: '{days}日前に更新',
    studentsRepresented: '生徒',
    server: 'サーバー',
    allServers: '全サーバー',
    school: '学園',
    allSchools: '全学園',
    hideEmpty: '0件を隠す',
    hideEmptyAria: '絆100の生徒のみ表示',
    sort: '並び替え',
    stats: {
      aria: '殿堂の統計',
      title: '殿堂サマリー',
      byServer: 'サーバー別',
      bySchool: '学園別',
      topStudents: '最多到達',
      coverage: '網羅率',
      ofStudents: '/ {total} 人中',
      updated: '最終更新',
      empty: '絆100のデータはまだありません。',
    },
    sortModes: {
      default: 'デフォルト',
      name: '名前',
      bond100: '件数',
      recent: '最近',
    },
    viewToggleAria: '殿堂の表示',
    viewWall: 'ウォール',
    viewPlayers: 'プレイヤー',
    players: {
      searchPlaceholder: 'プレイヤーを検索...',
      allCounts: 'すべて',
      allStudents: 'すべての生徒',
      countFilterAria: '絆100の数で絞り込む',
      studentFilterAria: '生徒で絞り込む',
      playerCount: '{n}人のプレイヤー',
      noPlayers: '条件に一致するプレイヤーはいません。',
      showMore: 'もっと見る',
    },
    searchPlaceholder: '生徒を検索...',
    noStudents: '条件に一致する生徒はいません。',
    submit: '絆100を追加',
    requestRemoval: '削除をリクエスト',
    entriesTitle: '{name} · 絆100殿堂',
    entriesKicker: '殿堂エントリー',
    noEntries: 'エントリーはまだありません。',
    searchEntries: '先生を検索...',
    noEntriesSearch: '一致する先生がいません。',
    form: {
      back: '戻る',
      cancel: 'キャンセル',
      send: '送信',
      sending: '送信中…',
      name: 'ゲーム内名',
      friendCode: 'フレンドコード',
      assistHint:
        '掲載したい学生を先にサポート（助っ人）枠に設定してください。arona は助っ人枠の学生しか取得できません。データは arona から取得されるため、次回の更新時に反映されます。',
      guidelinesBody:
        '掲載を削除するには：下の arona.icu のページを開き、サーバーとフレンドコードを入力して「共有を解除」ボタンを押してください。次回の更新時にこちらへ反映されます。',
      proof: '証明URL',
      contact: '連絡先',
      reason: '理由',
      reasonPrivacy: '掲載されたくない',
      reasonIncorrect: 'この掲載は誤り、または自分ではない',
      reasonOther: 'その他',
      whichListing: 'どの掲載があなたですか？',
      optional: '任意',
      selectPlaceholder: '選択…',
      privacyNote:
        'フレンドコードはエントリーの確認と重複防止のみに使用し、そのまま保存・公開することはありません。連絡先・証明はモデレーターのみが確認します。',
      submittedTitle: '送信しました',
      submittedBody:
        'ありがとうございます！次回の同期後に殿堂へ表示されます。arona の更新タイミングによっては1〜2日かかることがあります。',
      removalSubmittedBody: 'ありがとうございます！削除リクエストを確認します。',
      error: '現在送信できません。後でもう一度お試しください。',
      fallbackTitle: 'arona.icu で直接登録',
      fallbackBody:
        '今は送信できませんでした（本日の上限に達した可能性があります）。代わりに arona.icu で直接登録できます。次回の更新時に殿堂へ表示されます：',
      fallbackSteps:
        'サーバーを選び、フレンドコードを入力して、Refresh（更新）ボタンを押してください。',
      tryAgain: '再試行',
    },
    serverRegions: {
      global_na: 'Global NA',
      global_asia: 'Global Asia',
      global_eu: 'Global EU',
      global_kr: 'Global KR',
      global_tw: 'Global TW/HK',
    },
  },

  // BondsPage
  otherGifts: 'その他のギフト',
  favoredGifts: 'お気に入りの贈り物',
  exp: 'EXP',
  total: '合計',
  totalSr: 'SR合計',
  totalSsr: 'SSR合計',
  addStudent: '生徒を追加',
  noTrackedStudents: '追跡中の生徒はいません。生徒を追加して絆とギフトの計画を始めましょう。',
  layoutTabs: 'タブ',
  layoutCards: 'カード',
  suggestedStudents: 'おすすめ',
  alreadyTracked: '追跡中',
  bondMaxed: '絆MAX',
  allOwnedStudents: '所持生徒',
  untrack: '解除',
  untrackTooltip: 'ギフトの設定は保持されます。ピッカーからいつでも再追加できます。',
  hideEditor: '非表示',
  showEditor: '表示',
  planGifts: 'この生徒にギフトを計画する',
  hideGiftGrid: 'ギフトグリッドを隠す',
  showSummary: '概要を表示',
  hideSummary: '概要を隠す',
  yellowStones: '黄色の石',
  conversion: '変換',
  consumed: '消費',

  // BondsPage: Other EXP sources panel
  otherExpSources: 'その他EXP',
  otherExpTooltip: 'カフェタップとレッスンEXPを計画',
  cafeTaps: 'カフェタップ',
  tapsPerDay: 'タップ/日',
  startDate: '開始日',
  endDate: '終了日',
  targetDate: '目標日',
  day: '日',
  days: '日',
  inclusiveAbbr: '含む',
  exclusiveAbbr: '除く',
  includeTodayTooltip: '目標日を1日としてカウントするか切り替え',
  bonusExp: 'ボーナスEXP',
  bonusExpTooltip: 'レッスンからのEXP',
  manualExp: '数値',
  lessonRates: 'レッスン獲得量',
  areaRank: 'エリアランク',
  expPerLesson: 'EXP',
  bonusChance: '2倍EXP確率',
  clear: 'クリア',
  clearAll: '全てクリア',
  done: '完了',
  projection: '予測',
  reachesBondN: '→ 絆 {n}',
  reachesBondMax: '→ 絆 100',

  // Data load failure banner
  dataLoadError:
    'SchaleDBから生徒データを読み込めませんでした。接続を確認して、もう一度お試しください。',
  retry: '再試行',

  // Navbar
  students: '生徒',
  bonds: '絆',
  searchStudents: '生徒を検索...',
  search: '検索...',
  noResults: '該当する項目がありません。',
  sort: {
    id: 'ID',
    name: '名前',
    default: 'デフォルト',
    bond: '絆',
    level: 'レベル',
    grade: '星級',
    equipment: '装備',
    skill: 'スキル',
    potential: '潜在能力',
    school: '学園',
    club: '部活',
    pinned: 'ピン留め',
    pinnedHint: 'ピン留め表示中は並び替えが一時停止します。',
    method: 'ソート方法',
    sectionInfo: '生徒情報',
    sectionProgress: '育成状況',
  },
  direction: {
    ascending: '昇順',
    descending: '降順',
  },
  overlays: {
    title: 'カードに表示',
    selectAll: 'すべて選択',
    level: 'レベル',
    grade: '星級',
    equipment: '装備',
    skills: 'スキル',
    potential: '潜在能力',
  },
  data: 'データ',
  exportData: 'データエクスポート',
  importData: 'データインポート',
  app: 'アプリ',
  contact: 'お問い合わせ',
  credits: 'クレジット',
  whatsNew: '新着情報',
  whatsNewLatest: '最新のアップデート',
  previousUpdates: '過去のアップデート',
  noPreviousUpdates: '過去のアップデートはまだありません。',

  // Import modal
  importErrorFileType: '.txtファイルを選択してください',
  importingData: 'データをインポート中...',
  importSuccessful: 'インポート成功！ページを再読み込み中...',
  importFailed: 'インポートに失敗しました。もう一度お試しください。',
  importFileFormatError: 'インポートに失敗しました。ファイル形式を確認してください。',
  dragDropFile: 'エクスポートファイルをここにドラッグ＆ドロップ',
  or: 'または',
  browseFiles: 'ファイルを参照',
  importInstructions: '以前にエクスポートしたデータをインポートして、進捗と設定を復元します。',
  importWarning: '注意：これにより現在のデータが置き換えられ、ページが再読み込みされます。',
  importFromFile: 'ファイルから',
  importFromText: 'テキストから',
  pasteImportData: 'justin163データを貼り付け',
  import: 'インポート',
  importEmptyText: 'データを貼り付けてください',

  // Student modal tabs
  info: '情報',
  bond: '絆',
  upgrade: '育成',
  gear: '武器',
  items: 'アイテム',
  equipment: '装備',
  summary: '要約',

  // Bond component
  currentBond: '現在の絆',
  editBondLevel: 'クリックして絆レベルを編集',
  openInBondsPage: '絆ページで開く',
  returnToStudent: '生徒に戻る',
  expToNextLevel: '次のレベルまで',
  totalExp: '総経験値',

  // Gift options
  giftOptions: 'ギフト設定',
  convertGiftBox: '選択ボックス変換',
  syncGifts: 'ギフト同期',
  resetGifts: 'リセット',
  undoChanges: '元に戻す',
  redoChanges: 'やり直し',
  convertGiftBoxTooltip:
    'SRギフト素材をセレクターボックスに変換します。1ボックスにつき融合キーストーン1つとSRギフト素材2つが必要です。使用するには融合キーストーンとSRギフト素材がそれぞれ1つ以上必要です。',
  syncGiftsTooltip:
    '現在のインベントリからギフト数量を設定します。他のキャラクターに割り当て済みの数量は除外されます。',
  resetGiftsTooltip: 'ギフトの数量をゼロにリセットします。',
  undoChangesTooltip: 'ギフトの変更を取り消し、以前のギフト数量に戻します。',
  redoChangesTooltip: '取り消した変更をやり直します。',
  manualStepperWarning:
    '手動変更はギフト追跡をクリアします。ギフト同期を使用して復元してください。',
  // Sync Gifts mode dialog
  syncGiftsModeTitle: 'ギフト同期モード',
  syncGiftsModeGreedy: '全て利用可能分を設定',
  syncGiftsModeGreedyDesc: '他のキャラクターのギア強化に関係なく、全ての所持ギフトを設定します。',
  syncGiftsModeAware: 'ギア強化分を優先確保',
  syncGiftsModeAwareDesc: '他のキャラクターの専用ギア強化に必要なギフトを確保してから設定します。',
  // Convert material selection dialog
  convertMaterialTitle: '変換素材の選択',
  convertMaterialDesc: '素材として使用するギフトを選択してください（{needed}個必要）：',
  convertMaterialSelected: '{current} / {needed} 個選択済み',
  convertMaterialConfirm: '変換',
  convertMaterialInventoryNote:
    '所持数は変更されません。ゲーム内で変換を実行した後、所持数を更新してください。',

  // Upgrade component - Skills
  skills: 'スキル',
  maxAll: '全て最大化',
  maxTarget: '目標を最大化',
  max: '最大',
  cost: 'コスト',
  level: 'レベル',
  current: '現在',
  target: '目標',
  skillToggle: {
    normal: '通常のEXスキルに切り替え',
    enhanced: '強化EXスキルに切り替え',
  },

  // Upgrade component - Levels
  characterLevel: 'レベル',
  currentLevel: '現在のレベル',
  targetLevel: '目標のレベル',
  xpRequired: '必要な経験値',
  maxLevel: '最大レベル',
  maxBond: '最大絆',

  // Upgrade component - Potential/Talent
  talent: '能力',
  clickTo: 'クリックして',
  collapse: '折りたたむ',
  expand: '展開する',
  attack: '攻撃力',
  maxHp: '最大HP',
  healPower: '治癒力',

  // Upgrade/Gear component - Materials
  totalMaterialsNeeded: '必要な素材の合計',
  noMaterialsNeeded: 'アップグレードに必要な素材はありません',
  allMaterialsAvailable: '必要な素材はすべて揃っています! ✓',
  noResourcesNeeded: 'アップグレードに必要な素材はありません',
  noPendingUpgrades: '保留中のアップグレードはありません。',
  noMaterialsToConsume: '消費する素材はありません。',
  confirmApplyUpgrade: 'アップグレードの確認',
  progression: '育成状況',
  applyUpgrade: 'アップグレード適用',
  material: '素材',
  unknownResource: '不明な素材',
  unknown: '不明',

  // Mode toggle
  showMissing: '不足アイテムを表示',
  showNeeded: '必要アイテムを表示',
  missing: '不足',
  leftover: '余剰',
  used: '使用',
  notEnough: '不足素材',
  activityReport: '活動報告書',
  equipmentXp: '装備EXP',

  // Resource summary component
  itemsNeeded: '全体の必要アイテム',
  missingItems: '不足アイテム',
  equipmentNeeded: '全体の必要装備',
  missingEquipment: '不足装備',
  gifts: 'ギフト',
  giftsNeeded: '必要ギフト',
  missingGifts: '不足ギフト',
  owned: '所持',
  needed: '必要',
  remaining: '残り',
  elephsOwned: '所持エレフ',
  elephsNeeded: '必要エレフ',
  price: 'エリグマ価格',
  purchasable: '購入可能数',
  noUpgradeNeeded: 'アップグレード不要',
  noLeftoverResources: '余っている素材はありません',
  perStudentView: '生徒別',
  aggregateView: 'まとめ表示',

  // Equipment types and gear component
  equipmentTypes: {
    Hat: '帽子',
    Gloves: 'グローブ',
    Shoes: 'シューズ',
    Bag: 'バッグ',
    Badge: 'バッジ',
    Hairpin: 'ヘアピン',
    Charm: 'お守り',
    Watch: '腕時計',
    Necklace: 'ネックレス',
  },
  tier: 'T',
  gears: '装備',
  currentEquipment: '現在',
  targetEquipment: '目標',
  setMinLevel: '最小レベルに設定',
  setMaxLevel: '最大レベルに設定',
  decreaseLevel: 'レベルを下げる',
  increaseLevel: 'レベルを上げる',

  // Weapon Grade component
  exclusiveWeapon: '固有武器',
  currentGrade: '現在',
  targetGrade: '目標',
  maxGrade: '最大',

  // Info tab
  exclusiveGear: '固有装備',
  empty: '空欄',
  bondRequired: '絆Lv.15以上が必要',
  locked: '未解放',
  atk: 'ATK',
  def: 'DEF',
  school: '学園',
  club: '部活',

  // Linked students
  switchStyle: 'スタイル切替',

  // Inventory modal
  inventory: '所持品',
  studentDetails: '生徒詳細',

  // Buttons and actions
  reset: 'リセット',
  save: '保存',
  loading: '読み込み中',
  close: '閉じる',
  update: '更新',
  confirm: '確認',
  cancel: 'キャンセル',
  apply: '適用',
  selectAll: '全選択',

  // Navigation
  previous: '前へ',
  next: '次へ',

  // Tools rail
  tools: 'ツール',

  // Contact modal
  contactModal: {
    body: 'ご質問やバグの報告はDiscordまたはTwitterでお問い合わせください：',
  },

  // Credits modal
  creditsModal: {
    dataSources: 'データソース',
    dataSourcesBody: 'このアプリケーションで使用されているデータは以下を元にしています：',
    translationsHeader: '翻訳',
    translationsBody:
      'スキルの英語翻訳は Lonqie 氏によって提供され、許可を得て使用しています。他言語の翻訳は別の翻訳者によって提供される場合があり、明示的な許可なく他のプロジェクトで自由に使用することはできませんのでご注意ください。',
    acknowledgements: '謝辞',
    acknowledgementsBody:
      'このようなアプリを実現する包括的なブルーアーカイブのデータリソースを維持してくださっている SchaleDB チームと Lonqie 氏の素晴らしい取り組みに、心より感謝いたします。',
    acknowledgementsArona:
      '絆100殿堂の集計データを支える arona.icu API へのアクセスを許可してくださった本心 (benx1n) 氏に、心より感謝いたします。',
    disclaimerHeader: '免責事項',
    disclaimerBody:
      'ブルーアーカイブおよび関連するゲームアセット・データの著作権は © NEXON Games / Yostar に帰属します。本サイトは非営利のファンプロジェクトであり、個人的・教育的な利用のみを目的としています。販売・再配布は禁止です。NEXONとの提携・公認ではありません。',
  },

  // Ownership (recruited / not recruited)
  ownership: {
    recruited: '加入済み',
    notRecruited: '未加入',
    markRecruited: '加入済みにする',
    markNotRecruited: '未加入にする',
    ownershipFilter: '加入状態',
    filterAll: '全て',
    filterOwned: '加入済み',
    filterUnowned: '未加入',
  },

  // Deck Builder modal
  deckBuilder: {
    title: 'デッキビルダー',
    presetName: 'プリセット名',
    removeTeam: 'チームを削除',
    copyTeamToPreset: 'プリセットにコピー',
    dragToReorder: 'ドラッグして並び替え',
    selectStriker: 'ストライカーを選択',
    selectSpecial: 'スペシャルを選択',
    filterByName: '名前で絞り込み...',
    assistLimitReached: 'アシスト制限に達しました (1/1)。既にアシストとして使用中の生徒は非表示',
    noStudentsAvailable: 'このスロットに配置できる生徒はいません',
    addTeam: '+ チームを追加',
    exportImage: '画像をエクスポート',
    exporting: 'エクスポート中…',
    copiedTo: 'コピー先：',
    removeStudent: '生徒を削除',
  },

  // Inventory screenshot parser modal
  scanInventory: 'インベントリスキャン',
  inventoryScreenshot: 'インベントリスクリーンショット',
  selectInventoryType: '何をスキャンしますか？',
  uploadScreenshot: 'スクリーンショットをアップロード',
  dragDropScreenshot: '最大3枚のスクリーンショットを選択またはドロップ',
  parsingScreenshot: 'スクリーンショットを解析中…',
  parseFailed: '解析に失敗しました。パーサーサービスが起動しているか確認してください。',
  parseResults: '結果を確認',
  applyInventory: '適用',
  reupload: '再アップロード',
  confidence: '信頼度',
  lowConfidenceWarning: '信頼度の低いアイテムは誤認識の可能性があります。適用前にご確認ください。',
  noItemsDetected:
    'アイテムが検出されませんでした。パーサーサービスとスクリーンショットを確認してください。',

  // Inventory screenshot scanner: guide panel
  scanGuide: {
    beforeScanning: {
      title: 'スキャン前の準備',
      sortOrder:
        'インベントリの並び順を<strong>アイテムIDの昇順または降順</strong>（ゲーム標準）に設定してください。名前・使用回数・所持数による並び替えには対応していません。',
      onePerScan:
        '1回のスキャンにつき最大3枚。まとめて選択またはドロップしてください。追加ページは再アップロードで。',
      selectType:
        '正しい種類を選択してください：<strong>アイテム</strong>または<strong>装備</strong>。グリッドの構造が異なります。',
    },
    screenshots: {
      title: 'スクリーンショット',
      resolution:
        '<strong>FHD（1920 × 1080）</strong>に最適化されています。アスペクト比でインベントリパネルを検出するため、2K / 4K などの高解像度でも問題ありません。',
      itemsTab:
        '<strong>アイテム</strong>タブで検出されるもの：経験値素材、オーパーツ、戦術教育BD、技術ノート、贈り物（1ページ4行）。',
      equipmentTab:
        '<strong>装備</strong>タブで検出されるもの：T2以上の装備（1ページ5行）。T1装備および装備経験値アイテムは対象外です。',
    },
    reviewing: {
      title: '結果の確認',
      confidence:
        'オレンジ色のカードは中程度の信頼度（50〜80%）を示します。優先的に確認してください。',
      hoverControls:
        'カードにカーソルを合わせると操作ボタンが表示されます：<strong>✏</strong> アイテム変更 · 個数を編集 · <strong>×</strong> 削除。',
      appliesDetected:
        '適用は<strong>検出されたアイテム</strong>の個数のみを更新します。未検出のセルはそのまま残ります。',
    },
    examples: {
      title: 'スクリーンショットの例',
      correct: '✓ 正しい',
      clipped: '✗ 見切れ',
      clippedCaption: '1行目が途切れています。全ての辺にグレーの余白が必要です',
    },
  },

  // Inventory screenshot scanner: modal UX strings (validation errors, loading tips, banners)
  scanModal: {
    errInvalidMime: 'PNG、JPG、WebP のいずれかの画像を選択してください。',
    errDecodeFailed: '画像のサイズを読み取れませんでした。別のファイルをお試しください。',
    errNotLandscape:
      'スクリーンショットは横向き（16:9）にしてください。これはスマートフォンの縦画面のようです（{width}×{height}）。',
    errTooSmall:
      'スクリーンショットは{minWidth}px以上の幅が必要です（FHD以上）。現在は{width}×{height}です。',
    errBadAspect:
      'スクリーンショットは 16:9（例：1920×1080）にしてください。現在の{width}×{height}は対応していないアスペクト比です。',
    errTooMany: '1回のスキャンにつき最大{max}枚です。枚数を減らしてください。',
    tipFast: 'アイコン照合と個数読み取りを実行中…',
    tipSlow:
      '想定より時間がかかっています。個数リーダーを再試行中です。読み取れなかった個数は手動入力用にフラグ表示されます。',
    appliedOne:
      '1個のアイテムを適用しました。次のスクリーンショットをアップロード、または閉じてください。',
    appliedMany:
      '{count}個のアイテムを適用しました。次のスクリーンショットをアップロード、または閉じてください。',
    prepHintItems:
      '<strong>スクリーンショットを撮る前に：</strong>ゲーム内フィルターで経験値素材、オーパーツ、戦術教育BD、技術ノート、贈り物のみを表示してください。それ以外のカテゴリは検出されません。',
    prepHintEquipment:
      '<strong>スクリーンショットを撮る前に：</strong>1行目にT2以上の装備が表示されるようにスクロールしてください。T1装備および装備経験値アイテムは対象外です。',
  },

  // Bulk Modify Students modal
  bulkModify: {
    title: '生徒の一括変更',
    studentSelection: '生徒選択',
    selected: '選択済み',
    filters: {
      baseGrade: '初期星級',
      availability: '入手方法',
      charLevel: 'キャラLv',
      formStatus: '設定状態',
      unfilledOnly: '未設定のみ',
    },
    availability: {
      fest: 'フェス',
      unique: '固定',
      event: 'イベント',
      regular: '通常',
    },
    selectAllFiltered: 'フィルタした生徒を全選択',
    visible: '表示数',
    formInputs: '入力フォーム',
    setSeparateTargets: '目標を個別に設定',
    formNote: '空欄の項目は既存の値を保持します。データのない生徒にはデフォルト値が使用されます。',
    fields: {
      bond: '絆',
      characterLevel: 'キャラクターレベル',
      skillEx: 'EXスキル',
      skillPublic: 'ノーマルスキル',
      skillPassive: 'パッシブスキル',
      skillExtraPassive: 'サブスキル',
      equipmentSlot1: '装備スロット1',
      equipmentSlot2: '装備スロット2',
      equipmentSlot3: '装備スロット3',
      gradeLevel: '星級',
      potentialLevel: 'ポテンシャルレベル',
    },
    overwriteWarningPrefix: '警告：',
    overwriteWarningSuffix:
      '人の生徒にデフォルト以外の保存済みフォームデータがあります。入力されたフィールドはそれらの値を上書きします。',
    applying: '適用中...',
    apply: '一括変更を適用',
  },

  // Bond Update tool
  bondUpdate: {
    title: '絆更新',
    placeholder: 'name bond\ns.name bond\n...',
    parse: '解析',
    flagged: '要解決',
    skip: 'スキップ',
    searchPlaceholder: '生徒を検索...',
    guideTitle: 'フォーマットガイド',
    guideLine1: '1行につき1人',
    guideLine2: '名前は大文字・小文字を区別しません',
    guideLine3: 'バリアントはprefix.nameで指定。文字を追加すると絞り込めます:',
    guideLine4: 'マッチしない名前は手動で選択できます',
    guideLineRomaji: '名前は常にローマ字で入力してください（全言語で使用可能）',
    guideLinePrefixes:
      'よく使うプレフィックス（文字を追加すると絞り込めます: bu=バニー, ba=臨戦）:',
    prefixTable:
      'b=バニーガール/臨戦/バンド · c=応援団/クリスマス/キャンプ/私服/ライディング · d=ドレス · g=ガイド · i=アイドル · m=メイド/マジカル · n=正月 · o=温泉 · p=パジャマ/アルバイト · q=チーパオ · s=水着 · t=体操服/シロコ＊テラー · u=制服',
  },

  // Crafting Fodder tool
  craftingFodder: {
    nav: 'クラフト',
    subtitle: '現在の在庫を変更せず、固定されたクラフトセッションの進捗を管理します。',
    keepAtLeast: '最低限キープ',
    stage1Filter: 'ステージ1に表示',
    stage1: 'ステージ1素材',
    stage2: 'ステージ2素材 (SR / SSR)',
    artifact: 'オーパーツ',
    bookItem: '技術ノート',
    cdItem: '戦術教育BD',
    noFodder: '現在のフルクラフトプランでは、このステージに割り当てられた素材はありません',
    legend: '凡例',
    legendCraft: 'クラフト',
    legendExcess: '余剰',
    legendQty: 'リサイクル可能',
    craftsLeft: '残りクラフト',
    fodderLeft: '残り素材',
    finalExcess: '最終余剰',
    complete: '完了',
    recordOne: 'クラフトを1回記録',
    undoOne: 'クラフトを1回戻す',
    resetMaterial: 'この素材をリセット',
    openInventory: '在庫を開く',
    refreshPlan: 'プランを更新',
    craftsRemaining: '回フルクラフト可能',
    stage1Capacity: '回ステージ1投入可能',
    stage2Capacity: '回ステージ2投入可能',
    capacityHint:
      'このステージだけに使用した場合の最大投入数です。両ステージで使用できる素材は共有され、二重には使用できません。',
    craftsRecorded: '回フルクラフト記録済み',
    hideComplete: '完了を隠す',
    resetProgress: '進捗をリセット',
    refreshNotice:
      '在庫または素材ルールが変更されました。更新するまで現在のセッションは変わりません。',
    planSettings: 'プラン設定',
    rulesHint: '変更はプラン更新時に適用されます。',
    searchPlaceholder: '素材名またはIDを検索...',
    materialType: '素材タイプ',
    allTypes: 'すべて',
    materialTypeSingular: '素材種',
    materialTypePlural: '素材種',
    possible: '投入可能',
    assigned: '割り当て',
    noMatches: 'フィルターに一致する素材はありません',
    reset: 'リセット',
    resetRow: 'この行をリセット',
  },

  equipmentFarming: {
    title: '装備ファーム',
    subtitle: '不足しているTier2以上の装備を集めるための通常ステージ。',
    dropEvent: 'ドロップ率イベント',
    empty: '不足している装備はありません。必要なTier2以上はすべて充足しています。',
    runs: '≈{n}回',
    stages: '{n}ステージ',
    expandAll: 'すべて展開',
    collapseAll: 'すべて折りたたむ',
    missingTitle: '不足装備',
  },

  // Student filter panel
  filter: {
    title: 'フィルター',
    clearAll: '全クリア',
    type: 'タイプ',
    rarity: 'レアリティ',
    attackType: '攻撃',
    defenseType: '防御',
    academy: '学園',
    equipment: '装備',
    availability: '入手方法',
    regular: '通常',
    limited: '限定',
    unique: 'ユニーク',
    fest: 'フェス',
    perm3star: 'アーカイブ',
    other: 'その他',
  },
};

const kr: TranslationTree = {
  // Chibi 3D.
  chibi: {
    home: '홈',
    hint: '아무 곳이나 클릭하면 치비가 그곳으로 걸어갑니다.',
    idle: '대기',
    itemRail: '아이템',
    recoveryItem: '회복 아이템',
    dragItemHint: '치비에게 드래그',
    landingLink: '치비 룸으로 이동',
    wandering: '자동 산책',
    wanderingHint: '치비가 스스로 걸어 다니게 합니다.',
    wanderingActiveHint: '자동으로 돌아다닙니다. 클릭하여 목적지를 정할 수 있습니다.',
    wanderingPausedInspect: 'Inspect 중에는 자동 산책이 일시 중지됩니다.',
    wanderingPausedMotion: '동작 줄이기가 활성화되어 자동 산책을 사용할 수 없습니다.',
    orbitHintMouse: '왼쪽 드래그로 회전 · 오른쪽 드래그로 이동 · 휠로 확대/축소',
    orbitHintTouch: '한 손가락으로 회전 · 두 손가락으로 이동 또는 확대/축소',
  },

  // Landing
  landingSubtitle: '블루 아카이브 학생 육성 도우미',
  studentsDesc: '인연 레벨, 스킬 강화, 장비 진행도, 재료 비용을 관리하세요.',
  bondsDesc: '학생을 위한 선물 계획과 인연 진행도 추적.',
  craftingDesc: '잉여 재료로 재료 제작을 계획하고 세션별 진행도를 관리하세요.',
  bond100Desc: '각 학생과 인연 100을 달성한 플레이어를 확인하세요.',
  navigation: '탐색',
  landingDisclaimerBefore:
    'Eridu Ops는 비공식 팬 제작 프로젝트이며 Nexon, Nexon Games, Yostar와 관련이 없습니다. 게임 데이터와 이미지는 ',
  landingDisclaimerAfter:
    '를 통해 제공됩니다. 모든 일러스트, 정보, 리소스의 권리는 각 권리자에게 있습니다.',

  // Bond100 page
  bond100: {
    nav: '전당',
    title: '인연 100 전당',
    subtitle: '글로벌 각 서버에서 인연 100을 달성한 플레이어.',
    aboutTitle: '집계 정보',
    aboutInfo: '인연 100 전당 정보',
    aboutCount: '각 숫자는 해당 학생과 인연 100을 달성한 플레이어 수입니다.',
    aboutSources:
      '집계는 arona.icu를 통한 게임 내 공개 랭킹 데이터의 일일 스냅샷을 기반으로 합니다. 표시되는 것은 플레이어 이름과 서버뿐입니다.',
    aboutDelay:
      '새로 추가되거나 갱신된 플레이어는 표시되기까지 1~2일이 걸릴 수 있습니다. 전당은 일일 스냅샷이며 arona는 자체 일정으로 갱신됩니다.',
    demoDataNote: '미리보기 데이터입니다. 실시간 집계는 곧 제공됩니다.',
    summaryUnavailable: '인연 100 전당을 현재 이용할 수 없습니다.',
    entriesUnavailable: '이 학생의 항목을 불러오지 못했습니다.',
    atBond100: '명 인연 100',
    updatedToday: '오늘 갱신됨',
    updatedYesterday: '어제 갱신됨',
    updatedDaysAgo: '{days}일 전 갱신됨',
    studentsRepresented: '학생',
    server: '서버',
    allServers: '모든 서버',
    school: '학원',
    allSchools: '모든 학원',
    hideEmpty: '0명 숨기기',
    hideEmptyAria: '인연 100 학생만 표시',
    sort: '정렬',
    stats: {
      aria: '전당 통계',
      title: '전당 요약',
      byServer: '서버별',
      bySchool: '학원별',
      topStudents: '최다 달성',
      coverage: '달성률',
      ofStudents: '/ {total}명 중',
      updated: '마지막 갱신',
      empty: '아직 인연 100 데이터가 없습니다.',
    },
    sortModes: {
      default: '기본',
      name: '이름',
      bond100: '집계',
      recent: '최근',
    },
    viewToggleAria: '전당 보기',
    viewWall: '월',
    viewPlayers: '플레이어',
    players: {
      searchPlaceholder: '플레이어 검색...',
      allCounts: '전체',
      allStudents: '모든 학생',
      countFilterAria: '인연 100 수로 필터',
      studentFilterAria: '학생으로 필터',
      playerCount: '플레이어 {n}명',
      noPlayers: '조건에 맞는 플레이어가 없습니다.',
      showMore: '더 보기',
    },
    searchPlaceholder: '학생 검색...',
    noStudents: '조건에 맞는 학생이 없습니다.',
    submit: '인연 100 추가',
    requestRemoval: '삭제 요청',
    entriesTitle: '{name} · 인연 100 전당',
    entriesKicker: '전당 항목',
    noEntries: '아직 항목이 없습니다.',
    searchEntries: '선생님 검색...',
    noEntriesSearch: '일치하는 선생님이 없습니다.',
    form: {
      back: '뒤로',
      cancel: '취소',
      send: '제출',
      sending: '제출 중…',
      name: '게임 내 이름',
      friendCode: '친구 코드',
      assistHint:
        '표시하고 싶은 학생을 먼저 조력자 슬롯에 설정하세요. arona는 조력자 학생만 확인할 수 있으며, 계정 정보는 arona에서 가져오므로 다음 업데이트 시 반영됩니다.',
      guidelinesBody:
        '항목을 삭제하려면: 아래 arona.icu 페이지를 열고 서버와 친구 코드를 입력한 뒤 "공유 해제" 버튼을 누르세요. 다음 동기화 시 여기에 반영됩니다.',
      proof: '증빙 URL',
      contact: '연락처',
      reason: '사유',
      reasonPrivacy: '목록에 표시되고 싶지 않습니다',
      reasonIncorrect: '이 항목은 잘못되었거나 제가 아닙니다',
      reasonOther: '기타',
      whichListing: '어느 항목이 본인인가요?',
      optional: '선택',
      selectPlaceholder: '선택…',
      privacyNote:
        '친구 코드는 항목 확인과 중복 방지에만 사용되며, 그대로 공개되거나 저장되지 않습니다. 연락처와 증빙은 관리자만 확인합니다.',
      submittedTitle: '제출 완료',
      submittedBody:
        '감사합니다! 다음 동기화 후 전당에 표시됩니다. arona의 갱신 일정에 따라 1~2일이 걸릴 수 있습니다.',
      removalSubmittedBody: '감사합니다! 삭제 요청을 곧 검토하겠습니다.',
      error: '지금은 제출할 수 없습니다. 나중에 다시 시도해 주세요.',
      fallbackTitle: 'arona.icu에서 직접 등록',
      fallbackBody:
        '지금은 제출하지 못했습니다(오늘 할당량에 도달했을 수 있습니다). 대신 arona.icu에서 직접 등록할 수 있습니다. 다음 전당 갱신 시 표시됩니다:',
      fallbackSteps: '서버를 선택하고 친구 코드를 입력한 뒤 새로고침 버튼을 누르세요.',
      tryAgain: '다시 시도',
    },
    serverRegions: {
      global_na: 'Global NA',
      global_asia: 'Global Asia',
      global_eu: 'Global EU',
      global_kr: 'Global KR',
      global_tw: 'Global TW/HK',
    },
  },

  // BondsPage
  otherGifts: '기타 선물',
  favoredGifts: '좋아하는 선물',
  exp: 'EXP',
  total: '합계',
  totalSr: 'SR 합계',
  totalSsr: 'SSR 합계',
  addStudent: '학생 추가',
  noTrackedStudents: '추적 중인 학생이 없습니다. 학생을 추가하여 인연과 선물 계획을 시작하세요.',
  layoutTabs: '탭',
  layoutCards: '카드',
  suggestedStudents: '추천',
  alreadyTracked: '추적 중',
  bondMaxed: '인연 최대',
  allOwnedStudents: '보유 학생',
  untrack: '추적 해제',
  untrackTooltip: '선물 배분은 유지됩니다. 언제든지 목록에서 다시 추가할 수 있습니다.',
  hideEditor: '숨기기',
  showEditor: '표시',
  planGifts: '이 학생의 선물 계획하기',
  hideGiftGrid: '선물 그리드 숨기기',
  showSummary: '요약 표시',
  hideSummary: '요약 숨기기',
  yellowStones: '노란 돌',
  conversion: '변환',
  consumed: '소비',

  // BondsPage: Other EXP sources panel
  otherExpSources: '기타 EXP',
  otherExpTooltip: '카페 터치와 과외 EXP를 계획',
  cafeTaps: '카페 터치',
  tapsPerDay: '터치/일',
  startDate: '시작일',
  endDate: '종료일',
  targetDate: '목표일',
  day: '일',
  days: '일',
  inclusiveAbbr: '포함',
  exclusiveAbbr: '제외',
  includeTodayTooltip: '목표일을 하루로 계산할지 전환',
  bonusExp: '보너스 EXP',
  bonusExpTooltip: '과외로 얻는 EXP',
  manualExp: '수치',
  lessonRates: '과외 획득량',
  areaRank: '지역 랭크',
  expPerLesson: 'EXP',
  bonusChance: '2배 EXP 확률',
  clear: '지우기',
  clearAll: '전체 지우기',
  done: '완료',
  projection: '예측',
  reachesBondN: '→ 인연 {n}',
  reachesBondMax: '→ 인연 100',

  // Data load failure banner
  dataLoadError:
    'SchaleDB에서 학생 데이터를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.',
  retry: '다시 시도',

  // Navbar
  students: '학생',
  bonds: '인연',
  searchStudents: '학생 검색...',
  search: '검색...',
  noResults: '일치하는 항목이 없습니다.',
  sort: {
    id: 'ID',
    name: '이름',
    default: '기본',
    bond: '인연',
    level: '레벨',
    grade: '성급',
    equipment: '장비',
    skill: '스킬',
    potential: '잠재능력',
    school: '학원',
    club: '동아리',
    pinned: '고정',
    pinnedHint: '고정 보기 중에는 정렬이 일시 중지됩니다.',
    method: '정렬 방식',
    sectionInfo: '학생 정보',
    sectionProgress: '육성 현황',
  },
  direction: {
    ascending: '오름차순',
    descending: '내림차순',
  },
  overlays: {
    title: '카드에 표시',
    selectAll: '전체 선택',
    level: '레벨',
    grade: '성급',
    equipment: '장비',
    skills: '스킬',
    potential: '잠재능력',
  },
  data: '데이터',
  exportData: '데이터 내보내기',
  importData: '데이터 가져오기',
  app: '앱',
  contact: '문의',
  credits: '크레딧',
  whatsNew: '새 소식',
  whatsNewLatest: '최신 업데이트',
  previousUpdates: '이전 업데이트',
  noPreviousUpdates: '아직 이전 업데이트가 없습니다.',

  // Import modal
  importErrorFileType: '.txt 파일을 선택하세요',
  importingData: '데이터 가져오는 중...',
  importSuccessful: '가져오기 성공! 페이지를 새로고침하는 중...',
  importFailed: '가져오기에 실패했습니다. 다시 시도해 주세요.',
  importFileFormatError: '가져오기에 실패했습니다. 파일 형식을 확인해 주세요.',
  dragDropFile: '내보낸 파일을 여기로 드래그 앤 드롭',
  or: '또는',
  browseFiles: '파일 찾아보기',
  importInstructions: '이전에 내보낸 데이터를 가져와 진행 상황과 설정을 복원합니다.',
  importWarning: '주의: 현재 데이터를 대체하고 페이지를 새로고침합니다.',
  importFromFile: '파일에서',
  importFromText: '텍스트에서',
  pasteImportData: 'justin163 데이터 붙여넣기',
  import: '가져오기',
  importEmptyText: '데이터를 붙여넣어 주세요',

  // Student modal tabs
  info: '정보',
  bond: '인연',
  upgrade: '육성',
  gear: '무기',
  items: '아이템',
  equipment: '장비',
  summary: '요약',

  // Bond component
  currentBond: '현재 인연',
  editBondLevel: '클릭하여 인연 레벨 편집',
  openInBondsPage: '인연 페이지에서 열기',
  returnToStudent: '학생으로 돌아가기',
  expToNextLevel: '다음 레벨까지',
  totalExp: '총 경험치',

  // Gift options
  giftOptions: '선물 설정',
  convertGiftBox: '상자 변환',
  syncGifts: '선물 동기화',
  resetGifts: '초기화',
  undoChanges: '실행 취소',
  redoChanges: '다시 실행',
  convertGiftBoxTooltip:
    'SR 선물 재료를 선택 상자로 변환합니다. 상자 1개당 융합 키스톤 1개와 SR 선물 재료 2개가 필요합니다. 사용하려면 융합 키스톤 1개와 SR 선물 재료 2개 이상이 필요합니다.',
  syncGiftsTooltip:
    '현재 인벤토리에서 선물 수량을 채웁니다. 다른 학생에게 이미 배분된 수량은 제외합니다.',
  resetGiftsTooltip: '모든 선물 수량을 0으로 초기화합니다.',
  undoChangesTooltip: '변경을 취소하고 이전 선물 수량으로 되돌립니다.',
  redoChangesTooltip: '취소한 변경을 다시 실행합니다.',
  manualStepperWarning: '수동 변경은 선물별 추적을 초기화합니다. 선물 동기화로 복원하세요.',
  // Sync Gifts mode dialog
  syncGiftsModeTitle: '선물 동기화 모드',
  syncGiftsModeGreedy: '가능한 모두 채우기',
  syncGiftsModeGreedyDesc: '다른 학생의 장비 강화 필요량과 관계없이 보유한 모든 선물을 채웁니다.',
  syncGiftsModeAware: '장비 필요량 우선 확보',
  syncGiftsModeAwareDesc: '다른 학생의 전용 장비 강화에 필요한 선물을 먼저 확보한 뒤 채웁니다.',
  // Convert material selection dialog
  convertMaterialTitle: '변환 재료 선택',
  convertMaterialDesc: '재료로 사용할 선물을 선택하세요({needed}개 필요):',
  convertMaterialSelected: '{current} / {needed}개 선택됨',
  convertMaterialConfirm: '변환',
  convertMaterialInventoryNote:
    '보유 수량은 차감되지 않습니다. 게임 내에서 변환한 뒤 수량을 갱신하세요.',

  // Upgrade component - Skills
  skills: '스킬',
  maxAll: '전체 최대',
  maxTarget: '목표 최대',
  max: '최대',
  cost: '비용',
  level: '레벨',
  current: '현재',
  target: '목표',
  skillToggle: {
    normal: '일반 EX 스킬로 전환',
    enhanced: '강화 EX 스킬로 전환',
  },

  // Upgrade component - Levels
  characterLevel: '레벨',
  currentLevel: '현재 레벨',
  targetLevel: '목표 레벨',
  xpRequired: '필요 경험치',
  maxLevel: '최대 레벨',
  maxBond: '최대 인연',

  // Upgrade component - Potential/Talent
  talent: '능력',
  clickTo: '클릭하여',
  collapse: '접기',
  expand: '펼치기',
  attack: '공격력',
  maxHp: '최대 체력',
  healPower: '치유력',

  // Upgrade/Gear component - Materials
  totalMaterialsNeeded: '필요 재료 합계',
  noMaterialsNeeded: '강화에 필요한 재료가 없습니다',
  allMaterialsAvailable: '필요한 재료를 모두 보유하고 있습니다! ✓',
  noResourcesNeeded: '필요한 재료가 없습니다',
  noPendingUpgrades: '대기 중인 강화가 없습니다.',
  noMaterialsToConsume: '소비할 재료가 없습니다.',
  confirmApplyUpgrade: '강화 적용 확인',
  progression: '육성 현황',
  applyUpgrade: '강화 적용',
  material: '재료',
  unknownResource: '알 수 없는 재료',
  unknown: '알 수 없음',

  // Mode toggle
  showMissing: '부족분 표시',
  showNeeded: '필요량 표시',
  missing: '부족',
  leftover: '잉여',
  used: '사용',
  notEnough: '부족',
  activityReport: '활동보고서',
  equipmentXp: '장비 경험치',

  // Resource summary component
  itemsNeeded: '필요 아이템',
  missingItems: '부족 아이템',
  equipmentNeeded: '필요 장비',
  missingEquipment: '부족 장비',
  gifts: '선물',
  giftsNeeded: '필요 선물',
  missingGifts: '부족 선물',
  owned: '보유',
  needed: '필요',
  remaining: '남음',
  elephsOwned: '보유 엘레프',
  elephsNeeded: '필요 엘레프',
  price: '엘리그마 가격',
  purchasable: '구매 가능',
  noUpgradeNeeded: '강화 불필요',
  noLeftoverResources: '잉여 재료가 없습니다',
  perStudentView: '학생별',
  aggregateView: '전체',

  // Equipment types and gear component
  equipmentTypes: {
    Hat: '모자',
    Gloves: '장갑',
    Shoes: '신발',
    Bag: '가방',
    Badge: '배지',
    Hairpin: '헤어핀',
    Charm: '부적',
    Watch: '손목시계',
    Necklace: '목걸이',
  },
  tier: 'T',
  gears: '장비',
  currentEquipment: '현재',
  targetEquipment: '목표',
  setMinLevel: '최소 레벨로 설정',
  setMaxLevel: '최대 레벨로 설정',
  decreaseLevel: '레벨 낮추기',
  increaseLevel: '레벨 올리기',

  // Weapon Grade component
  exclusiveWeapon: '고유 무기',
  currentGrade: '현재',
  targetGrade: '목표',
  maxGrade: '최대',

  // Info tab
  exclusiveGear: '고유 장비',
  empty: '빈칸',
  bondRequired: '인연 15 이상 필요',
  locked: '미해금',
  atk: 'ATK',
  def: 'DEF',
  school: '학원',
  club: '동아리',

  // Linked students
  switchStyle: '스타일 전환',

  // Inventory modal
  inventory: '소지품',
  studentDetails: '학생 상세',

  // Buttons and actions
  reset: '초기화',
  save: '저장',
  loading: '불러오는 중',
  close: '닫기',
  update: '업데이트',
  confirm: '확인',
  cancel: '취소',
  apply: '적용',
  selectAll: '전체 선택',

  // Navigation
  previous: '이전',
  next: '다음',

  // Tools rail
  tools: '도구',

  // Contact modal
  contactModal: {
    body: '문의 사항이나 버그 제보는 Discord 또는 Twitter로 연락해 주세요:',
  },

  // Credits modal
  creditsModal: {
    dataSources: '데이터 출처',
    dataSourcesBody: '이 애플리케이션에서 사용하는 데이터의 출처는 다음과 같습니다:',
    translationsHeader: '번역',
    translationsBody:
      '스킬의 영어 번역은 Lonqie 님이 제공했으며 허가를 받아 사용합니다. 다른 언어의 번역은 다른 번역자가 제공했을 수 있으며, 명시적인 허가 없이는 다른 프로젝트에서 자유롭게 사용할 수 없습니다.',
    acknowledgements: '감사의 말',
    acknowledgementsBody:
      '이런 애플리케이션을 가능하게 하는 방대한 블루 아카이브 데이터를 관리해 주시는 SchaleDB 팀과 Lonqie 님의 훌륭한 노고에 진심으로 감사드립니다.',
    acknowledgementsArona:
      '인연 100 전당의 커뮤니티 집계를 지원하는 arona.icu API 접근을 허가해 주신 本心(benx1n) 님께 진심으로 감사드립니다.',
    disclaimerHeader: '면책 조항',
    disclaimerBody:
      '블루 아카이브 및 관련 게임 에셋과 데이터의 저작권은 © NEXON Games / Yostar에 있습니다. 본 사이트는 비영리 팬 프로젝트로 개인적·교육적 용도로만 사용됩니다. 판매 및 재배포는 금지됩니다. NEXON과 제휴하거나 승인받지 않았습니다.',
  },

  // Ownership (recruited / not recruited)
  ownership: {
    recruited: '영입됨',
    notRecruited: '미영입',
    markRecruited: '영입됨으로 표시',
    markNotRecruited: '미영입으로 표시',
    ownershipFilter: '영입 상태',
    filterAll: '전체',
    filterOwned: '영입됨',
    filterUnowned: '미영입',
  },

  // Deck Builder modal
  deckBuilder: {
    title: '덱 빌더',
    presetName: '프리셋 이름',
    removeTeam: '팀 제거',
    copyTeamToPreset: '프리셋에 복사',
    dragToReorder: '드래그하여 순서 변경',
    selectStriker: '스트라이커 선택',
    selectSpecial: '스페셜 선택',
    filterByName: '이름으로 필터...',
    assistLimitReached: '조력자 제한 도달 (1/1): 이미 조력자로 사용된 학생은 숨김',
    noStudentsAvailable: '이 슬롯에 배치할 수 있는 학생이 없습니다',
    addTeam: '+ 팀 추가',
    exportImage: '이미지 내보내기',
    exporting: '내보내는 중…',
    copiedTo: '복사 위치:',
    removeStudent: '학생 제거',
  },

  // Inventory screenshot parser modal
  scanInventory: '인벤토리 스캔',
  inventoryScreenshot: '인벤토리 스크린샷',
  selectInventoryType: '무엇을 스캔하시겠습니까?',
  uploadScreenshot: '스크린샷 업로드',
  dragDropScreenshot: '스크린샷을 최대 3장 선택 또는 드롭',
  parsingScreenshot: '스크린샷 분석 중…',
  parseFailed: '분석에 실패했습니다. 파서 서비스가 실행 중인지 확인하세요.',
  parseResults: '결과 검토',
  applyInventory: '적용',
  reupload: '다시 업로드',
  confidence: '신뢰도',
  lowConfidenceWarning: '신뢰도가 낮은 항목은 부정확할 수 있습니다. 적용 전에 확인하세요.',
  noItemsDetected:
    '감지된 항목이 없습니다. 파서 서비스가 실행 중이고 스크린샷이 올바른지 확인하세요.',

  // Inventory screenshot scanner: guide panel
  scanGuide: {
    beforeScanning: {
      title: '스캔 전 준비',
      sortOrder:
        '인벤토리 정렬을 <strong>아이템 ID 오름차순 또는 내림차순</strong>(게임 기본값)으로 설정하세요. 이름 / 사용량 / 보유 정렬은 지원하지 않습니다.',
      onePerScan:
        '한 번의 스캔에 최대 3장. 함께 선택하거나 드롭하세요. 추가 페이지는 다시 업로드하세요.',
      selectType:
        '올바른 유형을 선택하세요: <strong>아이템</strong> 또는 <strong>장비</strong>. 그리드가 다릅니다.',
    },
    screenshots: {
      title: '스크린샷',
      resolution:
        '<strong>FHD(1920 × 1080)</strong>에 최적화되어 있습니다. 2K / 4K 등 더 높은 해상도도 문제없습니다. 파서는 화면 비율로 인벤토리 패널을 찾습니다.',
      itemsTab:
        '<strong>아이템</strong> 탭 감지 대상: 경험치 재료, 오파츠, 전술 교육 BD, 기술 노트, 선물(페이지당 4행).',
      equipmentTab:
        '<strong>장비</strong> 탭 감지 대상: T2 이상 장비(페이지당 5행). T1 장비와 장비 경험치 아이템은 제외됩니다.',
    },
    reviewing: {
      title: '결과 검토',
      confidence: '주황색으로 강조된 카드는 중간 신뢰도(50~80%)를 나타냅니다. 먼저 확인하세요.',
      hoverControls:
        '카드에 마우스를 올리면 조작 버튼이 표시됩니다: <strong>✏</strong> 아이템 변경 · 수량 편집 · <strong>×</strong> 제거.',
      appliesDetected:
        '적용은 <strong>감지된 아이템</strong>의 수량만 갱신합니다. 감지되지 않은 칸은 그대로 유지됩니다.',
    },
    examples: {
      title: '스크린샷 예시',
      correct: '✓ 올바름',
      clipped: '✗ 잘림',
      clippedCaption: '첫 번째 행이 일부 잘렸습니다. 모든 가장자리에 회색 여백이 보여야 합니다',
    },
  },

  // Inventory screenshot scanner: modal UX strings (validation errors, loading tips, banners)
  scanModal: {
    errInvalidMime: 'PNG, JPG, WebP 이미지를 선택하세요.',
    errDecodeFailed: '이미지 크기를 읽을 수 없습니다. 다른 파일을 시도하세요.',
    errNotLandscape:
      '스크린샷은 가로 방향(16:9)이어야 합니다. 휴대폰 캡처처럼 보입니다({width}×{height}).',
    errTooSmall:
      '스크린샷은 너비가 최소 {minWidth}px 이상이어야 합니다(FHD 이상). 현재는 {width}×{height}입니다.',
    errBadAspect:
      '스크린샷은 16:9(예: 1920×1080)여야 합니다. 현재 {width}×{height}는 지원하지 않는 화면 비율입니다.',
    errTooMany: '한 번의 스캔에 최대 {max}장입니다. 더 적게 선택하세요.',
    tipFast: '아이콘 대조 및 수량 인식 중…',
    tipSlow:
      '평소보다 오래 걸리고 있습니다. 수량 인식을 재시도합니다. 인식하지 못한 수량은 수동 입력용으로 표시됩니다.',
    appliedOne: '아이템 1개를 적용했습니다. 다른 스크린샷을 업로드하거나 닫으세요.',
    appliedMany: '아이템 {count}개를 적용했습니다. 다른 스크린샷을 업로드하거나 닫으세요.',
    prepHintItems:
      '<strong>스크린샷 촬영 전:</strong> 게임 내 필터를 적용해 경험치 재료, 오파츠, 전술 교육 BD, 기술 노트, 선물만 보이도록 하세요. 다른 카테고리는 감지되지 않습니다.',
    prepHintEquipment:
      '<strong>스크린샷 촬영 전:</strong> 첫 번째 행에 T2 이상 장비가 오도록 스크롤하세요. T1 장비와 장비 경험치 아이템은 제외됩니다.',
  },

  // Bulk Modify Students modal
  bulkModify: {
    title: '학생 일괄 변경',
    studentSelection: '학생 선택',
    selected: '선택됨',
    filters: {
      baseGrade: '초기 성급',
      availability: '입수 방법',
      charLevel: '캐릭터 레벨',
      formStatus: '설정 상태',
      unfilledOnly: '미설정만',
    },
    availability: {
      fest: '페스',
      unique: '고정',
      event: '이벤트',
      regular: '일반',
    },
    selectAllFiltered: '필터된 학생 전체 선택',
    visible: '표시 수',
    formInputs: '입력 양식',
    setSeparateTargets: '목표를 개별 설정',
    formNote: '비워 두면 기존 값을 유지합니다. 데이터가 없는 학생은 기본값이 사용됩니다.',
    fields: {
      bond: '인연',
      characterLevel: '캐릭터 레벨',
      skillEx: 'EX 스킬',
      skillPublic: '기본 스킬',
      skillPassive: '강화 스킬',
      skillExtraPassive: '서브 스킬',
      equipmentSlot1: '장비 슬롯 1',
      equipmentSlot2: '장비 슬롯 2',
      equipmentSlot3: '장비 슬롯 3',
      gradeLevel: '성급',
      potentialLevel: '잠재능력 레벨',
    },
    overwriteWarningPrefix: '경고: ',
    overwriteWarningSuffix:
      '명의 학생에게 기본값이 아닌 저장된 양식 데이터가 있습니다. 입력한 필드는 해당 값을 덮어씁니다.',
    applying: '적용 중...',
    apply: '일괄 변경 적용',
  },

  // Bond Update tool
  bondUpdate: {
    title: '인연 업데이트',
    placeholder: 'name bond\ns.name bond\n...',
    parse: '분석',
    flagged: '해결 필요',
    skip: '건너뛰기',
    searchPlaceholder: '학생 검색...',
    guideTitle: '형식 안내',
    guideLine1: '한 줄에 학생 한 명',
    guideLine2: '이름은 대소문자를 구분하지 않습니다',
    guideLine3: '변형은 prefix.name으로 지정하며, 문자를 추가하면 구분됩니다:',
    guideLine4: '일치하지 않는 이름은 수동 선택용으로 표시됩니다',
    guideLineRomaji: '이름은 항상 로마자 기본 이름을 사용하세요(모든 언어에서 작동)',
    guideLinePrefixes: '자주 쓰는 접두사(문자를 추가해 구분: bu=버니, ba=임전):',
    prefixTable:
      'b=버니/임전/밴드 · c=치어리더/크리스마스/캠프/사복/사이클링 · d=드레스 · g=가이드 · i=아이돌 · m=메이드/마법소녀 · n=새해 · o=온천 · p=파자마/아르바이트 · q=치파오 · s=수영복 · t=체육복/테러 · u=교복',
  },

  // Crafting Fodder tool
  craftingFodder: {
    nav: '제작',
    subtitle: '계획의 기준이 되는 인벤토리를 변경하지 않고 고정된 제작 세션을 관리합니다.',
    keepAtLeast: '최소 보유량',
    stage1Filter: '1단계에 표시',
    stage1: '1단계 재료',
    stage2: '2단계 재료 (SR / SSR)',
    artifact: '오파츠',
    bookItem: '기술 노트',
    cdItem: '전술 교육 BD',
    noFodder: '현재 전체 제작 계획에서 이 단계에 배정된 재료가 없습니다',
    legend: '범례',
    legendCraft: '제작',
    legendExcess: '잉여',
    legendQty: '재활용 가능',
    craftsLeft: '남은 제작',
    fodderLeft: '남은 재료',
    finalExcess: '최종 잉여',
    complete: '완료',
    recordOne: '제작 1회 기록',
    undoOne: '제작 1회 되돌리기',
    resetMaterial: '이 재료 초기화',
    openInventory: '인벤토리 열기',
    refreshPlan: '계획 새로고침',
    craftsRemaining: '회 전체 제작 가능',
    stage1Capacity: '회 1단계 제출 가능',
    stage2Capacity: '회 2단계 제출 가능',
    capacityHint:
      '이 단계에만 사용했을 때의 최대 제출 수입니다. 두 단계에 모두 사용할 수 있는 재료는 공유되며 중복 사용할 수 없습니다.',
    craftsRecorded: '회 전체 제작 기록됨',
    hideComplete: '완료 숨기기',
    resetProgress: '진행도 초기화',
    refreshNotice:
      '인벤토리 또는 재료 규칙이 변경되었습니다. 새로고침하기 전까지 현재 세션은 유지됩니다.',
    planSettings: '계획 설정',
    rulesHint: '변경 사항은 계획을 새로고침할 때 적용됩니다.',
    searchPlaceholder: '재료 이름 또는 ID 검색...',
    materialType: '재료 유형',
    allTypes: '전체',
    materialTypeSingular: '개 재료 종류',
    materialTypePlural: '개 재료 종류',
    possible: '제출 가능',
    assigned: '배정',
    noMatches: '필터와 일치하는 재료가 없습니다',
    reset: '초기화',
    resetRow: '이 행 초기화',
  },

  equipmentFarming: {
    title: '장비 파밍',
    subtitle: '부족한 Tier 2 이상 장비를 파밍할 일반 스테이지.',
    dropEvent: '드롭률 이벤트',
    empty: '부족한 장비가 없습니다. 필요한 Tier 2 이상 장비가 모두 충족되었습니다.',
    runs: '≈{n}회',
    stages: '{n}개 스테이지',
    expandAll: '모두 펼치기',
    collapseAll: '모두 접기',
    missingTitle: '부족 장비',
  },

  // Student filter panel
  filter: {
    title: '필터',
    clearAll: '전체 지우기',
    type: '유형',
    rarity: '희귀도',
    attackType: '공격',
    defenseType: '방어',
    academy: '학원',
    equipment: '장비',
    availability: '입수 방법',
    regular: '일반',
    limited: '한정',
    unique: '유니크',
    fest: '페스',
    perm3star: '아카이브',
    other: '기타',
  },
};

const translations: Record<Language, TranslationTree> = { en, jp, kr };

// Resolved translation cache keyed by "lang:path".
// Keying on language means no invalidation is ever needed: switching language
// just uses a different key prefix, leaving old entries harmlessly stale.
const _translationCache = new Map<string, string>();

// Function to get a specific translation using a path (internal: $t wraps this)
function useTranslation(path: string, language?: Language): string {
  const lang = language || currentLanguage.value;
  const cacheKey = `${lang}:${path}`;

  const cached = _translationCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const parts = path.split('.');
  let result: unknown = translations[lang];

  for (const part of parts) {
    if (
      result &&
      typeof result === 'object' &&
      (result as Record<string, unknown>)[part] !== undefined
    ) {
      result = (result as Record<string, unknown>)[part];
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

  const value = result as string;
  _translationCache.set(cacheKey, value);
  return value;
}

// Helper function to access nested translations.
// Optional `params` substitutes `{key}` placeholders in the resolved string.
//   $t('reachesBond', { n: 87 })  ->  EN: "-> Reaches Bond 87"
export function $t(path: string, params?: Record<string, string | number>): string {
  const raw = useTranslation(path);
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}
