// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, nextTick, type App } from 'vue';
import { CHANGELOG, type ChangelogEntry } from '@/lib/constants/changelog';
import { currentLanguage } from '@/lib/stores/localizationStore';
import { studentDataStore } from '@/lib/stores/studentStore';
import { $t } from '@/locales';
import WhatsNewModal from '../WhatsNewModal.vue';

vi.mock('@/lib/constants/changelog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/constants/changelog')>();
  return { ...actual, CHANGELOG: [] as ChangelogEntry[] };
});

const previewEntry = {
  id: 'planned-preview-test',
  date: '2026-01-02',
  title: { en: 'Preview release', jp: 'プレビュー更新', kr: '미리보기 업데이트' },
  summary: { en: 'Example release summary.', jp: '更新内容の例。', kr: '업데이트 내용 예시.' },
  plannedStudent: {
    portraitUrl: '/test-student.webp',
    name: { en: 'Example student', jp: 'サンプル生徒', kr: '예시 학생' },
  },
} satisfies ChangelogEntry;

const textEntry = {
  id: 'text-release-test',
  date: '2026-01-01',
  title: { en: 'Text release', jp: '通常の更新', kr: '일반 업데이트' },
  summary: {
    en: 'A release without a preview.',
    jp: 'プレビューなしの更新。',
    kr: '미리보기 없는 업데이트.',
  },
} satisfies ChangelogEntry;

let app: App;
let root: HTMLElement;

function mountModal() {
  root = document.createElement('div');
  app = createApp(WhatsNewModal);
  app.mount(root);
}

beforeEach(() => {
  currentLanguage.value = 'en';
  CHANGELOG.splice(0, CHANGELOG.length, previewEntry, textEntry);
});

afterEach(() => {
  app?.unmount();
  currentLanguage.value = 'en';
  CHANGELOG.length = 0;
});

describe("What's New planned-student preview", () => {
  it('shows a release with a read-only card instead of a screenshot', () => {
    mountModal();
    const latest = root.querySelector('.entry--latest')!;
    expect(latest.querySelector('h3')?.textContent).toBe(previewEntry.title.en);
    expect(latest.querySelector('.entry-summary')?.textContent).toBe(previewEntry.summary.en);
    const preview = latest.querySelector('.planned-student-preview')!;
    expect(preview.classList.contains('selection-grid-card--planned')).toBe(true);
    expect(preview.querySelector('.label-text')?.textContent).toBe(
      previewEntry.plannedStudent.name.en,
    );
    expect(preview.querySelector('.planned-badge')?.textContent).toBe('Planned');
    const image = preview.querySelector('img')!;
    expect(image.getAttribute('src')).toBe(previewEntry.plannedStudent.portraitUrl);
    expect(image.classList.contains('img--unowned')).toBe(true);
    expect(preview.querySelector('a, button, input, [tabindex], .pin-icon')).toBeNull();
    expect(latest.querySelector('.entry-highlights')).toBeNull();
    expect(root.querySelector('.previous-list')).toBeNull();
  });

  it('updates the example name, badge, and release copy with the language', async () => {
    mountModal();
    for (const language of ['jp', 'kr'] as const) {
      currentLanguage.value = language;
      await nextTick();
      expect(root.querySelector('.entry-title')?.textContent).toBe(previewEntry.title[language]);
      expect(root.querySelector('.planned-student-preview .label-text')?.textContent).toBe(
        previewEntry.plannedStudent.name[language],
      );
      expect(root.querySelector('.planned-badge')?.textContent).toBe($t('ownership.planned'));
    }
  });

  it('keeps previous-entry previews out of the DOM until history is expanded', async () => {
    CHANGELOG.push({ ...previewEntry, id: 'previous-preview-test' });
    mountModal();
    expect(root.querySelectorAll('.planned-student-preview')).toHaveLength(1);
    root.querySelector<HTMLButtonElement>('.previous-toggle')!.click();
    await nextTick();
    expect(root.querySelectorAll('.planned-student-preview')).toHaveLength(2);
    expect(root.querySelector('.previous-list .card-img img')?.getAttribute('loading')).toBe(
      'lazy',
    );
  });

  it('keeps the preview available in history after a newer text-only release is added', async () => {
    CHANGELOG.unshift({ ...textEntry, id: 'newer-release-test', date: '2026-01-03' });
    mountModal();
    expect(root.querySelector('.entry--latest .entry-title')?.textContent).toBe(textEntry.title.en);
    expect(root.querySelector('.planned-student-preview')).toBeNull();
    root.querySelector<HTMLButtonElement>('.previous-toggle')!.click();
    await nextTick();
    expect(root.querySelectorAll('.previous-list .planned-student-preview')).toHaveLength(1);
    expect(
      root.querySelector('.previous-list .planned-student-preview .label-text')?.textContent,
    ).toBe(previewEntry.plannedStudent.name.en);
  });

  it('does not read or change the roster when the example is clicked', async () => {
    const originalStore = studentDataStore.value;
    try {
      studentDataStore.value = { 10153: { studentId: 10153, isOwned: true, planEnabled: false } };
      const before = JSON.stringify(studentDataStore.value);
      mountModal();
      root.querySelector<HTMLElement>('.planned-student-preview')!.click();
      await nextTick();
      expect(root.querySelector('.planned-badge')?.textContent).toBe('Planned');
      expect(JSON.stringify(studentDataStore.value)).toBe(before);
    } finally {
      studentDataStore.value = originalStore;
    }
  });
});
