// @vitest-environment jsdom
import { ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentProps } from '@/types/student';
import { useStudentData } from '../useStudentData';
import { usePullRecapDraft } from '../usePullRecapDraft';
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../../utils/settingsStorage';

vi.mock('../useStudentData', () => ({ useStudentData: vi.fn() }));

const studentData = ref<Record<string, StudentProps>>({});

function student(Id: number, Name: string, StarGrade = 3): StudentProps {
  return { Id, Name, StarGrade } as StudentProps;
}

beforeEach(() => {
  saveSettings({ ...DEFAULT_SETTINGS });
  studentData.value = {
    1: { ...student(1, 'Hina'), ElephIcon: 'item_icon_secretstone_hina' },
    2: student(2, 'Eimi', 2),
    10098: student(10098, 'Hoshino (Battle)'),
    10099: student(10099, 'Hoshino (Battle), alternate style'),
  };
  vi.mocked(useStudentData).mockReturnValue({
    studentData,
    isLoading: ref(false),
    loadError: ref(false),
  } as ReturnType<typeof useStudentData>);
});

describe('Pull Recap draft', () => {
  it('searches primary 3-star students and does not change other preferences', () => {
    const recap = usePullRecapDraft();
    expect(recap.candidates.value.map(({ id }) => id)).toEqual([1, 10098]);
    expect(recap.candidates.value[0].portrait).toContain('/student/icon/1.webp');
    recap.search.value = '  HOSHINO ';
    expect(recap.candidates.value.map(({ id }) => id)).toEqual([10098]);
    recap.addResult(2);
    recap.addResult(10099);
    expect(recap.hasResults.value).toBe(false);
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('allows one New card and separate dupe pulls for the same student', () => {
    const recap = usePullRecapDraft();
    recap.addResult(1);
    recap.addResult(1);
    expect(recap.candidates.value[0]?.alreadyNew).toBe(true);
    recap.kind.value = 'dupe';
    expect(recap.candidates.value[0]?.alreadyNew).toBe(false);
    recap.addResult(1);
    recap.addResult(1);

    const [newSection, dupeSection] = recap.sections.value;
    expect(newSection.cards.map(({ studentId }) => studentId)).toEqual([1]);
    expect(dupeSection.cards.map(({ studentId }) => studentId)).toEqual([1, 1]);
    expect(newSection.cards[0].elephArtwork).toBeUndefined();
    expect(newSection.cards[0].portrait).toBe(recap.candidates.value[0].portrait);
    expect(dupeSection.cards[0].elephArtwork).toContain(
      '/item/icon/item_icon_secretstone_hina.webp',
    );
  });

  it('preserves legacy pull numbers and pity marks without retaining Eleph amounts', () => {
    const results = [
      {
        id: 1,
        studentId: 1,
        kind: 'new' as const,
        eleph: 100,
        pityMark: 'fiftyFifty' as const,
        pullNumber: 88,
      },
      {
        id: 2,
        studentId: 1,
        kind: 'dupe' as const,
        eleph: 200,
        pityMark: 'hardPity' as const,
        pullNumber: 133,
      },
    ];
    saveSettings({
      ...DEFAULT_SETTINGS,
      sparkDraft: { version: 1, title: 'Fest recruitment', pullCount: 200, results },
    });

    const restored = usePullRecapDraft();
    expect(restored.sections.value[0].cards[0]).toMatchObject({
      kind: 'new',
      pullNumber: 88,
      pityMark: 'fiftyFifty',
    });
    const [dupe] = restored.sections.value[1].cards;
    expect(dupe).toMatchObject({ kind: 'dupe', pullNumber: 133 });
    expect(dupe.portrait).toBe(restored.sections.value[0].cards[0].portrait);
    expect(restored.resultRate.value).toBe(0.01);
    restored.setPullNumber(dupe.id, 134);
    expect(getSettings().sparkDraft?.results).toEqual([
      { id: 1, studentId: 1, kind: 'new', pullNumber: 88, pityMark: 'fiftyFifty' },
      { id: 2, studentId: 1, kind: 'dupe', pullNumber: 134, pityMark: 'hardPity' },
    ]);
  });

  it('saves and clears a 50:50 loss without changing the pull number', () => {
    const recap = usePullRecapDraft();
    recap.addResult(1);
    const { id } = recap.sections.value[0].cards[0];
    recap.setPullNumber(id, 133);
    recap.setPityMark(id, 'fiftyFiftyLost');

    const restored = usePullRecapDraft();
    const [card] = restored.sections.value[0].cards;
    expect(card).toMatchObject({ pullNumber: 133, pityMark: 'fiftyFiftyLost' });
    restored.setPityMark(card.id, undefined);
    expect(usePullRecapDraft().sections.value[0].cards[0].pityMark).toBeUndefined();
    expect(restored.sections.value[0].cards[0].pullNumber).toBe(133);
  });

  it('calculates the rate from all recorded results when a pull count is set', () => {
    const recap = usePullRecapDraft();
    expect(recap.resultRate.value).toBeNull();
    recap.setPullCount(200);
    expect(recap.resultRate.value).toBe(0);
    recap.addResult(1);
    recap.kind.value = 'dupe';
    recap.addResult(1);
    recap.addResult(1);
    expect(recap.resultRate.value).toBe(0.015);
    recap.setPullCount(0);
    expect(recap.resultRate.value).toBeNull();
  });

  it('saves and clears an absolute pull number without changing the total', () => {
    const recap = usePullRecapDraft();
    recap.setPullCount(200);
    recap.addResult(1);
    const { id } = recap.sections.value[0].cards[0];
    recap.setPullNumber(id, 163);
    for (const pullNumber of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      recap.setPullNumber(id, pullNumber);
    }

    const restored = usePullRecapDraft();
    const card = restored.sections.value[0].cards[0];
    expect(card.pullNumber).toBe(163);
    expect(restored.pullCount.value).toBe(200);
    expect(restored.resultRate.value).toBe(0.005);

    restored.setPullNumber(card.id, undefined);
    expect(usePullRecapDraft().sections.value[0].cards[0].pullNumber).toBeUndefined();
  });

  it('sorts each section by pull number, preserving add order for ties and unnumbered cards', () => {
    saveSettings({
      ...DEFAULT_SETTINGS,
      sparkDraft: {
        version: 1,
        title: '',
        pullCount: 200,
        results: [
          { id: 1, studentId: 1, kind: 'new', pullNumber: 133 },
          { id: 2, studentId: 10098, kind: 'new', pullNumber: 42 },
          { id: 3, studentId: 1, kind: 'dupe' },
          { id: 4, studentId: 1, kind: 'dupe', pullNumber: 133 },
          { id: 5, studentId: 1, kind: 'dupe', pullNumber: 9 },
          { id: 6, studentId: 1, kind: 'dupe', pullNumber: 42 },
          { id: 7, studentId: 1, kind: 'dupe', pullNumber: 42 },
          { id: 8, studentId: 1, kind: 'dupe' },
        ],
      },
    });
    const recap = usePullRecapDraft();
    const visibleIds = () => recap.sections.value.map(({ cards }) => cards.map(({ id }) => id));
    expect(visibleIds()).toEqual([
      [2, 1],
      [5, 6, 7, 4, 3, 8],
    ]);

    recap.setPullNumber(8, 1);
    expect(visibleIds()).toEqual([
      [2, 1],
      [8, 5, 6, 7, 4, 3],
    ]);

    recap.setPullNumber(6, undefined);
    expect(visibleIds()).toEqual([
      [2, 1],
      [8, 5, 7, 4, 3, 6],
    ]);
    expect(getSettings().sparkDraft?.results.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('restores a local draft, resolves names from the current catalog and clears just the draft', () => {
    const recap = usePullRecapDraft();
    recap.title.value = 'Fest recruitment';
    recap.setPullCount(200);
    recap.kind.value = 'dupe';
    recap.addResult(1);
    recap.addResult(1);
    recap.removeResult(recap.sections.value[1].cards[0].id);

    const stored = JSON.parse(localStorage.getItem('eridu-ops-settings')!);
    expect(stored.sparkDraft).toMatchObject({ title: 'Fest recruitment', pullCount: 200 });
    expect(stored.sparkDraft.results).toHaveLength(1);
    expect(stored.sparkDraft.results[0]).not.toHaveProperty('name');
    studentData.value = { 1: student(1, 'ヒナ') };
    const restored = usePullRecapDraft();
    expect(restored.sections.value[1].cards[0]).toMatchObject({ name: 'ヒナ', kind: 'dupe' });
    expect(restored.sections.value[1].cards[0].elephArtwork).toBeUndefined();
    restored.clearDraft();
    expect(restored.hasDraft.value).toBe(false);
    expect(getSettings()).toMatchObject({ language: 'en', sparkDraft: { results: [] } });
  });
});
