import { FormRecord, db } from '@/consumables/db/database';
import { buildDefaultFormData } from '@/consumables/services/studentFormService';
import { StudentProps } from '@/types/student';

export type AvailabilityFilter = 'fest' | 'unique' | 'regular' | 'event';

export interface BulkFormPatch {
  bondLevel: number | null;
  characterLevel: number | null;
  skillEx: number | null;
  skillPublic: number | null;
  skillPassive: number | null;
  skillExtraPassive: number | null;
  equipmentTier: number | null;
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

export function isNonDefaultPersistedForm(
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

  const skillDefaults = {
    Ex: { current: 1, target: 1 },
    Public: { current: 1, target: 1 },
    Passive: { current: 1, target: 1 },
    ExtraPassive: { current: 1, target: 1 }
  };
  if (isDifferentPair(form.skillLevels?.Ex, skillDefaults.Ex.current, skillDefaults.Ex.target)) return true;
  if (isDifferentPair(form.skillLevels?.Public, skillDefaults.Public.current, skillDefaults.Public.target)) return true;
  if (isDifferentPair(form.skillLevels?.Passive, skillDefaults.Passive.current, skillDefaults.Passive.target)) return true;
  if (isDifferentPair(form.skillLevels?.ExtraPassive, skillDefaults.ExtraPassive.current, skillDefaults.ExtraPassive.target)) return true;

  if (isDifferentPair(form.potentialLevels?.attack, 0, 0)) return true;
  if (isDifferentPair(form.potentialLevels?.maxhp, 0, 0)) return true;
  if (isDifferentPair(form.potentialLevels?.healpower, 0, 0)) return true;

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

export async function getNonDefaultPersistedFormStudentIds(
  students: StudentProps[]
): Promise<Set<number>> {
  const studentMap = new Map<number, StudentProps>(students.map(student => [student.Id, student]));
  const forms = await db.forms.toArray();
  const nonDefaultIds = new Set<number>();

  forms.forEach(form => {
    const student = studentMap.get(form.studentId);
    if (!student) return;
    if (isNonDefaultPersistedForm(student, form)) {
      nonDefaultIds.add(form.studentId);
    }
  });

  return nonDefaultIds;
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
    next.characterLevels = {
      current: patch.characterLevel,
      target: patch.characterLevel
    };
  }

  const skillLevels = next.skillLevels ?? {
    Ex: { current: 1, target: 1 },
    Public: { current: 1, target: 1 },
    Passive: { current: 1, target: 1 },
    ExtraPassive: { current: 1, target: 1 }
  };

  if (patch.skillEx !== null) {
    skillLevels.Ex = { current: patch.skillEx, target: patch.skillEx };
  }
  if (patch.skillPublic !== null) {
    skillLevels.Public = { current: patch.skillPublic, target: patch.skillPublic };
  }
  if (patch.skillPassive !== null) {
    skillLevels.Passive = { current: patch.skillPassive, target: patch.skillPassive };
  }
  if (patch.skillExtraPassive !== null) {
    skillLevels.ExtraPassive = { current: patch.skillExtraPassive, target: patch.skillExtraPassive };
  }
  next.skillLevels = skillLevels;

  if (patch.potentialLevel !== null) {
    next.potentialLevels = {
      attack: { current: patch.potentialLevel, target: patch.potentialLevel },
      maxhp: { current: patch.potentialLevel, target: patch.potentialLevel },
      healpower: { current: patch.potentialLevel, target: patch.potentialLevel }
    };
  }

  if (patch.equipmentTier !== null) {
    const equipmentLevels = next.equipmentLevels ?? {};
    const equipmentTypes = Array.isArray(student.Equipment) ? student.Equipment : [];
    equipmentTypes.forEach(type => {
      equipmentLevels[type] = {
        current: patch.equipmentTier as number,
        target: patch.equipmentTier as number
      };
    });
    next.equipmentLevels = equipmentLevels;
  }

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
