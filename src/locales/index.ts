import { computed } from 'vue';
import { currentLanguage, Language } from '../consumables/stores/localizationStore';

// Translation strings for each supported language
export const translations = {
  en: {
    // Navbar
    students: "Students",
    searchStudents: "Search students...",
    sort: {
      id: "ID",
      name: "Name",
      default: "Default",
      bond: "Bond",
      level: "Level",
      grade: "Grade",
      method: "Sorting Method"
    },
    direction: {
      ascending: "Ascending",
      descending: "Descending"
    },
    data: "Data",
    exportData: "Export Data",
    importData: "Import Data",
    app: "App",
    contact: "Contact",
    credits: "Credits",
    
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
    equipments: "Equipments",
    summary: "Summary",
    
    // Bond component
    currentBond: "Current Bond",
    expToNextLevel: "XP to next level",
    totalExp: "Total EXP",
    
    // Gift options
    giftOptions: "Gift Options",
    convertGiftBox: "Convert Box",
    autoFillGifts: "Auto-Fill",
    resetGifts: "Reset",
    undoChanges: "Undo",
    convertGiftBoxTooltip: "Convert materials into selector boxes. Each selector box costs 1 fusion keystone and 2 SR gift materials.",
    autoFillGiftsTooltip: "Auto-fill all owned gifts from your Items inventory. This will update gift quantities while keeping your selector box and fusion keystone settings unchanged.",
    resetGiftsTooltip: "Reset all gift quantities to zero.",
    undoChangesTooltip: "Undo changes and revert to previous gift quantities.",

    // Upgrade component - Skills
    skills: "Skills",
    maxAllSkills: "Max All Skills",
    maxTargetSkills: "Max Target Skills",
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
    characterLevel: "Character Level",
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
    material: "Material",
    unknownResource: "Unknown Resource",
    unknown: "Unknown",
    
    // Mode toggle
    showMissing: "Show Missing",
    showNeeded: "Show Needed",
    missing: "Missing",
    
    // Resource summary component
    itemsNeeded: "Items Needed",
    missingItems: "Missing Items",
    equipmentNeeded: "Equipment Needed",
    missingEquipment: "Missing Equipment",
    owned: "Owned",
    needed: "Needed",
    remaining: "Remaining",
    elephsOwned: "Elephs Owned",
    elephsNeeded: "Elephs Needed",
    price: "Eligma Price",
    purchasable: "Purchasable",
    noUpgradeNeeded: "No upgrade needed",
    
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
    currentEquipment: "Current",
    targetEquipment: "Target",
    setMinLevel: "Set to minimum level",
    setMaxLevel: "Set to maximum level",
    decreaseLevel: "Decrease level",
    increaseLevel: "Increase level",
    
    // Weapon Grade component
    exclusiveWeapon: "Exclusive Weapon",
    currentGrade: "Current",
    targetGrade: "Target",
    maxGrade: "MAX",
    
    // Info tab
    exclusiveGear: "Exclusive Gear",
    comingSoon: "Coming Soon",
    atk: "ATK",
    def: "DEF",
    school: "School",
    club: "Club",

    // Inventory modal
    inventory: "Inventory",
    studentDetails: "Student Details",

    // Buttons and actions
    reset: "Reset",
    save: "Save",
    close: "Close",
    update: "Update",
    confirm: "Confirm",
    cancel: "Cancel"
  },
  jp: {
    // Navbar
    students: "生徒",
    searchStudents: "生徒を検索...",
    sort: {
      id: "ID",
      name: "名前",
      default: "デフォルト",
      bond: "絆",
      level: "レベル",
      grade: "星級",
      method: "ソート方法"
    },
    direction: {
      ascending: "昇順",
      descending: "降順"
    },
    data: "データ",
    exportData: "データエクスポート",
    importData: "データインポート",
    app: "アプリ",
    contact: "お問い合わせ",
    credits: "クレジット",
    
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
    equipments: "装備",
    summary: "要約",

    // Bond component
    currentBond: "現在の絆",
    expToNextLevel: "次のレベルまで",
    totalExp: "総経験値",
    
    // Gift options
    giftOptions: "ギフト設定",
    convertGiftBox: "選択ボックス変換",
    autoFillGifts: "自動設定",
    resetGifts: "リセット",
    undoChanges: "元に戻す",
    convertGiftBoxTooltip: "素材をセレクターボックスに変換します。セレクターボックス1つにつき、融合キーストーン1つとSRギフト素材2つが必要です。",
    autoFillGiftsTooltip: "所持アイテムからギフトを自動的に設定します。セレクターボックスと融合キーストーンの設定は変更されません。",
    resetGiftsTooltip: "ギフトの数量をゼロにリセットします。",
    undoChangesTooltip: "ギフトの変更を取り消し、以前のギフト数量に戻します。",

    // Upgrade component - Skills
    skills: "スキル",
    maxAllSkills: "全てのスキルを最大化",
    maxTargetSkills: "目標スキルを最大化",
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
    characterLevel: "キャラクターレベル",
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
    material: "素材",
    unknownResource: "不明な素材",
    unknown: "不明",
    
    // Mode toggle
    showMissing: "不足アイテムを表示",
    showNeeded: "必要アイテムを表示",
    missing: "不足",
    
    // Resource summary component
    itemsNeeded: "全体の必要アイテム",
    missingItems: "不足アイテム",
    equipmentNeeded: "全体の必要装備",
    missingEquipment: "不足装備",
    owned: "所持",
    needed: "必要",
    remaining: "残り",
    elephsOwned: "所持エレフ",
    elephsNeeded: "必要エレフ",
    price: "エリグマ価格",
    purchasable: "購入可能数",
    noUpgradeNeeded: "アップグレード不要",
    
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
    comingSoon: "準備中",
    atk: "ATK",
    def: "DEF",
    school: "学園",
    club: "部活",

    // Inventory modal
    inventory: "所持品",
    studentDetails: "生徒詳細",

    // Buttons and actions
    reset: "リセット",
    save: "保存",
    close: "閉じる",
    update: "更新",
    confirm: "確認",
    cancel: "キャンセル"
  }
};

// Create a computed ref that returns the translations for the current language
export const t = computed(() => {
  return translations[currentLanguage.value];
});

// Function to get a specific translation using a path
export function useTranslation(path: string, language?: Language): string {
  const lang = language || currentLanguage.value;
  const parts = path.split('.');
  let result: any = translations[lang];
  
  for (const part of parts) {
    if (result && result[part] !== undefined) {
      result = result[part];
    } else {
      console.warn(`Translation missing for path: ${path} in language: ${lang}`);
      // Try to get the English equivalent as fallback
      if (lang !== 'en') {
        return useTranslation(path, 'en');
      }
      return path;
    }
  }
  
  return result;
}

// Helper function to access nested translations
export function $t(path: string): string {
  return useTranslation(path);
} 