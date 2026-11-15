import { computed, ref, shallowRef } from 'vue';
import {
  PULL_RECAP_PITY_MARKS,
  type PullRecapDraft,
  type PullRecapPityMark,
  type PullRecapResult,
  type PullRecapResultKind,
  type PullRecapResultSection,
} from '@/types/pullRecap';
import { useStudentData } from './useStudentData';
import { filterSecondaryStudents } from '../constants/linkedStudents';
import { getItemIconUrl, getStudentIconUrl } from '../utils/iconUtils';
import { getSettings, updateSetting } from '../utils/settingsStorage';
import { studentMatchesQuery } from '../utils/sortUtils';

export const MAX_PULL_RECAP_TITLE_LENGTH = 80;

function emptyDraft(): PullRecapDraft {
  return { version: 1, title: '', pullCount: null, results: [] };
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function comparePullOrder(a: PullRecapResult, b: PullRecapResult): number {
  if (a.pullNumber === b.pullNumber) return 0;
  return (a.pullNumber ?? Infinity) - (b.pullNumber ?? Infinity);
}

function readDraft(): PullRecapDraft {
  const stored = getSettings().sparkDraft;
  if (stored?.version !== 1 || !Array.isArray(stored.results)) return emptyDraft();

  const results: PullRecapResult[] = [];
  const newStudents = new Set<number>();
  for (const entry of stored.results) {
    if (!entry || !isPositiveInteger(entry.studentId)) continue;
    const { studentId, kind } = entry;
    if (kind !== 'new' && kind !== 'dupe') continue;
    if (kind === 'new') {
      if (newStudents.has(studentId)) continue;
      newStudents.add(studentId);
    }
    results.push({
      id: results.length + 1,
      studentId,
      kind,
      pullNumber: isPositiveInteger(entry.pullNumber) ? entry.pullNumber : undefined,
      pityMark: PULL_RECAP_PITY_MARKS.find((mark) => mark === entry.pityMark),
    });
  }

  return {
    version: 1,
    title:
      typeof stored.title === 'string' ? stored.title.slice(0, MAX_PULL_RECAP_TITLE_LENGTH) : '',
    pullCount: isPositiveInteger(stored.pullCount) ? stored.pullCount : null,
    results,
  };
}

export function usePullRecapDraft() {
  const { studentData, isLoading, loadError } = useStudentData();
  const draft = shallowRef(readDraft());
  let nextId = draft.value.results.length + 1;
  const search = ref('');
  const kind = ref<PullRecapResultKind>('new');

  const catalog = computed(() =>
    filterSecondaryStudents(Object.values(studentData.value))
      .filter((student) => student.StarGrade === 3)
      .sort((a, b) => a.Name.localeCompare(b.Name) || a.Id - b.Id),
  );
  const catalogIds = computed(() => new Set(catalog.value.map((student) => student.Id)));
  const resultsByKind = computed(() => ({
    new: draft.value.results.filter((entry) => entry.kind === 'new').sort(comparePullOrder),
    dupe: draft.value.results.filter((entry) => entry.kind === 'dupe').sort(comparePullOrder),
  }));
  const newStudentIds = computed(
    () => new Set(resultsByKind.value.new.map((entry) => entry.studentId)),
  );

  const candidates = computed(() =>
    catalog.value
      .filter((student) => studentMatchesQuery(student, search.value))
      .map((student) => ({
        id: student.Id,
        name: student.Name,
        portrait: getStudentIconUrl(student.Id),
        alreadyNew: kind.value === 'new' && newStudentIds.value.has(student.Id),
      })),
  );
  const sections = computed<PullRecapResultSection[]>(() =>
    (['new', 'dupe'] as const).map((sectionKind) => ({
      kind: sectionKind,
      cards: resultsByKind.value[sectionKind].map((entry) => {
        const student = studentData.value[entry.studentId];
        const elephIcon = sectionKind === 'dupe' ? student?.ElephIcon : undefined;
        return {
          ...entry,
          name: student?.Name,
          portrait: getStudentIconUrl(entry.studentId),
          elephArtwork: elephIcon ? getItemIconUrl(elephIcon, 'item') : undefined,
        };
      }),
    })),
  );

  function save(next: PullRecapDraft) {
    draft.value = next;
    updateSetting('sparkDraft', next);
  }

  const title = computed({
    get: () => draft.value.title,
    set: (value: string) =>
      save({ ...draft.value, title: value.slice(0, MAX_PULL_RECAP_TITLE_LENGTH) }),
  });
  const pullCount = computed(() => draft.value.pullCount);
  const resultRate = computed(() =>
    pullCount.value === null ? null : draft.value.results.length / pullCount.value,
  );
  const hasResults = computed(() => draft.value.results.length > 0);
  const hasDraft = computed(() => hasResults.value || Boolean(title.value || pullCount.value));

  function setPullCount(value: number) {
    const count = isPositiveInteger(value) ? value : null;
    if (count !== pullCount.value) save({ ...draft.value, pullCount: count });
  }

  function addResult(studentId: number) {
    if (!catalogIds.value.has(studentId)) return;
    if (kind.value === 'new' && newStudentIds.value.has(studentId)) return;

    const id = nextId++;
    const result: PullRecapResult = {
      id,
      studentId,
      kind: kind.value,
    };
    save({ ...draft.value, results: [...draft.value.results, result] });
  }

  function updateResult(
    id: number,
    changes: Partial<Pick<PullRecapResult, 'pullNumber' | 'pityMark'>>,
  ) {
    save({
      ...draft.value,
      results: draft.value.results.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    });
  }

  function setPullNumber(id: number, pullNumber: number | undefined) {
    if (pullNumber !== undefined && !isPositiveInteger(pullNumber)) return;
    updateResult(id, { pullNumber });
  }

  function setPityMark(id: number, pityMark: PullRecapPityMark | undefined) {
    updateResult(id, { pityMark });
  }

  function removeResult(id: number) {
    save({ ...draft.value, results: draft.value.results.filter((entry) => entry.id !== id) });
  }

  function clearDraft() {
    save(emptyDraft());
  }

  return {
    isLoading,
    loadError,
    search,
    kind,
    candidates,
    sections,
    title,
    pullCount,
    resultRate,
    hasResults,
    hasDraft,
    setPullCount,
    addResult,
    setPullNumber,
    setPityMark,
    removeResult,
    clearDraft,
  };
}
