import { FormRecord, db } from '@/consumables/db/database';
import { buildDefaultFormData } from '@/consumables/services/studentFormService';
import { StudentProps } from '@/types/student';
import { DEFAULT_SKILL_LEVELS, DEFAULT_POTENTIAL_LEVELS } from '@/types/upgrade';

export type AvailabilityFilter = 'fest' | 'unique' | 'regular' | 'event';

export interface BulkFormPatch {
  bondLevel: number | null;
  characterLevel: number | null;
  characterLevelTarget: number | null;
  skillEx: number | null;
  skillExTarget: number | null;
  skillPublic: number | null;
  skillPublicTarget: number | null;
  skillPassive: number | null;
  skillPassiveTarget: number | null;
  skillExtraPassive: number | null;
  skillExtraPassiveTarget: number | null;
  equipmentTierSlot1: number | null;
  equipmentTargetSlot1: number | null;
  equipmentTierSlot2: number | null;
  equipmentTargetSlot2: number | null;
  equipmentTierSlot3: number | null;
  equipmentTargetSlot3: number | null;
  gradeLevel: number | null;
  potentialLevel: number | null;
}

const BULK_WRITE_CHUNK_SIZE = 200;

function hasAnyQuantity(data?: Record<string, number>): boolean {
  if (!data) return false;
  return Object.values(data).some(value => Number(value) > 0);
}

function isDifferentPair(
  value: { current?: number; target?: number } | undefined,
  expectedCurrent: number,
  expectedTarget: number
): boolean {
  const current = value?.current ?? expectedCurrent;
  const target = value?.target ?? expectedTarget;
  return current !== expectedCurrent || target !== expectedTarget;
}

export function classifyStudentAvailability(student: StudentProps): AvailabilityFilter {
  const flags = Array.isArray(student.IsLimited) ? student.IsLimited : [];
  const value = Number(flags[0] ?? 0);

  switch (value) {
    case 3:
      return 'fest';
    case 1:
      return 'unique';
    case 2:
      return 'event';
    case 0:
    default:
      return 'regular';
  }
}

function isNonDefaultPersistedForm(
  student: StudentProps,
  form: FormRecord | undefined
): boolean {
  if (!form) return false;

  const defaultForm = buildDefaultFormData(student);
  const starGrade = student.StarGrade ?? 1;

  if ((form.bondDetailData?.currentBond ?? 1) !== (defaultForm.bondDetailData?.currentBond ?? 1)) {
    return true;
  }

  if (isDifferentPair(form.characterLevels, 1, 1)) {
    return true;
  }

  if (isDifferentPair(form.skillLevels?.Ex, DEFAULT_SKILL_LEVELS.Ex.current, DEFAULT_SKILL_LEVELS.Ex.target)) return true;
  if (isDifferentPair(form.skillLevels?.Public, DEFAULT_SKILL_LEVELS.Public.current, DEFAULT_SKILL_LEVELS.Public.target)) return true;
  if (isDifferentPair(form.skillLevels?.Passive, DEFAULT_SKILL_LEVELS.Passive.current, DEFAULT_SKILL_LEVELS.Passive.target)) return true;
  if (isDifferentPair(form.skillLevels?.ExtraPassive, DEFAULT_SKILL_LEVELS.ExtraPassive.current, DEFAULT_SKILL_LEVELS.ExtraPassive.target)) return true;

  if (isDifferentPair(form.potentialLevels?.attack, DEFAULT_POTENTIAL_LEVELS.attack.current, DEFAULT_POTENTIAL_LEVELS.attack.target)) return true;
  if (isDifferentPair(form.potentialLevels?.maxhp, DEFAULT_POTENTIAL_LEVELS.maxhp.current, DEFAULT_POTENTIAL_LEVELS.maxhp.target)) return true;
  if (isDifferentPair(form.potentialLevels?.healpower, DEFAULT_POTENTIAL_LEVELS.healpower.current, DEFAULT_POTENTIAL_LEVELS.healpower.target)) return true;

  if (isDifferentPair(form.gradeLevels, starGrade, starGrade)) {
    return true;
  }

  const gradeInfo = form.gradeInfos;
  if ((gradeInfo?.owned ?? 0) !== 0 || (gradeInfo?.price ?? 1) !== 1 || (gradeInfo?.purchasable ?? 20) !== 20) {
    return true;
  }

  const equipmentLevels = form.equipmentLevels ?? {};
  for (const level of Object.values(equipmentLevels)) {
    if (isDifferentPair(level, 1, 1)) {
      return true;
    }
  }

  if (hasAnyQuantity(form.giftFormData) || hasAnyQuantity(form.boxFormData) || hasAnyQuantity(form.nonFavorGiftsMap)) {
    return true;
  }

  const exclusiveGear = form.exclusiveGearLevel;
  if ((exclusiveGear?.current ?? 0) > 0 || (exclusiveGear?.target ?? 0) > 0) {
    return true;
  }

  return false;
}

export async function getBulkFilterData(
  students: StudentProps[]
): Promise<{ nonDefaultIds: Set<number>; formData: Record<number, FormRecord> }> {
  const studentMap = new Map<number, StudentProps>(students.map(s => [s.Id, s]));
  const forms = await db.forms.toArray();
  const nonDefaultIds = new Set<number>();
  const formData: Record<number, FormRecord> = {};

  forms.forEach(form => {
    formData[form.studentId] = form;
    const student = studentMap.get(form.studentId);
    if (student && isNonDefaultPersistedForm(student, form)) {
      nonDefaultIds.add(form.studentId);
    }
  });

  return { nonDefaultIds, formData };
}

function applyPatchToForm(
  student: StudentProps,
  base: FormRecord,
  patch: BulkFormPatch
): FormRecord {
  const next: FormRecord = {
    ...base,
    studentId: student.Id,
    bondDetailData: base.bondDetailData ? { ...base.bondDetailData } : undefined,
    characterLevels: base.characterLevels ? { ...base.characterLevels } : undefined,
    skillLevels: base.skillLevels
      ? {
          Ex: { ...base.skillLevels.Ex },
          Public: { ...base.skillLevels.Public },
          Passive: { ...base.skillLevels.Passive },
          ExtraPassive: { ...base.skillLevels.ExtraPassive }
        }
      : undefined,
    potentialLevels: base.potentialLevels
      ? {
          attack: { ...base.potentialLevels.attack },
          maxhp: { ...base.potentialLevels.maxhp },
          healpower: { ...base.potentialLevels.healpower }
        }
      : undefined,
    equipmentLevels: base.equipmentLevels
      ? Object.fromEntries(
          Object.entries(base.equipmentLevels).map(([type, level]) => [type, { ...level }])
        )
      : undefined,
    gradeLevels: base.gradeLevels ? { ...base.gradeLevels } : undefined
  };

  if (patch.bondLevel !== null) {
    next.bondDetailData = {
      currentBond: patch.bondLevel
    };
  }

  if (patch.characterLevel !== null) {
    const target = patch.characterLevelTarget ?? patch.characterLevel;
    next.characterLevels = { current: patch.characterLevel, target };
  }

  const skillLevels = next.skillLevels ?? {
    Ex: { ...DEFAULT_SKILL_LEVELS.Ex },
    Public: { ...DEFAULT_SKILL_LEVELS.Public },
    Passive: { ...DEFAULT_SKILL_LEVELS.Passive },
    ExtraPassive: { ...DEFAULT_SKILL_LEVELS.ExtraPassive }
  };

  if (patch.skillEx !== null) {
    const target = patch.skillExTarget ?? patch.skillEx;
    skillLevels.Ex = { current: patch.skillEx, target };
  }
  if (patch.skillPublic !== null) {
    const target = patch.skillPublicTarget ?? patch.skillPublic;
    skillLevels.Public = { current: patch.skillPublic, target };
  }
  if (patch.skillPassive !== null) {
    const target = patch.skillPassiveTarget ?? patch.skillPassive;
    skillLevels.Passive = { current: patch.skillPassive, target };
  }
  if (patch.skillExtraPassive !== null) {
    const target = patch.skillExtraPassiveTarget ?? patch.skillExtraPassive;
    skillLevels.ExtraPassive = { current: patch.skillExtraPassive, target };
  }
  next.skillLevels = skillLevels;

  if (patch.potentialLevel !== null) {
    next.potentialLevels = {
      attack: { current: patch.potentialLevel, target: patch.potentialLevel },
      maxhp: { current: patch.potentialLevel, target: patch.potentialLevel },
      healpower: { current: patch.potentialLevel, target: patch.potentialLevel }
    };
  }

  // Equipment: per-slot using student.Equipment array indices
  const equipmentTypes = Array.isArray(student.Equipment) ? student.Equipment : [];
  const slotPatches = [
    { current: patch.equipmentTierSlot1, target: patch.equipmentTargetSlot1 },
    { current: patch.equipmentTierSlot2, target: patch.equipmentTargetSlot2 },
    { current: patch.equipmentTierSlot3, target: patch.equipmentTargetSlot3 },
  ];
  const equipmentLevels = next.equipmentLevels ?? {};
  slotPatches.forEach((slot, index) => {
    if (slot.current !== null && equipmentTypes[index]) {
      equipmentLevels[equipmentTypes[index]] = {
        current: slot.current,
        target: slot.target ?? slot.current
      };
    }
  });
  next.equipmentLevels = equipmentLevels;

  if (patch.gradeLevel !== null) {
    next.gradeLevels = {
      current: patch.gradeLevel,
      target: patch.gradeLevel
    };
  }

  return next;
}

export async function applyBulkStudentFormPatch(
  students: StudentProps[],
  selectedIds: number[],
  patch: BulkFormPatch
): Promise<Record<number, FormRecord>> {
  const uniqueIds = Array.from(new Set(selectedIds));
  if (uniqueIds.length === 0) return {};

  const studentsById = new Map<number, StudentProps>(students.map(student => [student.Id, student]));
  const existingForms = await db.forms.bulkGet(uniqueIds);

  const updatedRows: FormRecord[] = [];
  const updatedMap: Record<number, FormRecord> = {};

  uniqueIds.forEach((studentId, index) => {
    const student = studentsById.get(studentId);
    if (!student) return;

    const base = existingForms[index] ?? buildDefaultFormData(student);
    const next = applyPatchToForm(student, base, patch);
    updatedRows.push(next);
    updatedMap[studentId] = next;
  });

  if (updatedRows.length === 0) return {};

  await db.transaction('rw', db.forms, async () => {
    for (let i = 0; i < updatedRows.length; i += BULK_WRITE_CHUNK_SIZE) {
      await db.forms.bulkPut(updatedRows.slice(i, i + BULK_WRITE_CHUNK_SIZE));
    }
  });

  return updatedMap;
}
