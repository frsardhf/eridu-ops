import { afterEach, describe, expect, it, vi } from 'vitest';
import { submitFeedbackSubmission } from '../feedbackService';

describe('submitFeedbackSubmission', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the bounded anonymous payload to the feedback endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    const payload = {
      category: 'suggestion' as const,
      message: 'Add a compact view.',
      page: '/students',
      locale: 'en' as const,
      website: '',
    };
    await submitFeedbackSubmission(payload);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/feedback\/submissions$/);
    expect(init).toMatchObject({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('throws when the API rejects the submission', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      submitFeedbackSubmission({
        category: 'other',
        message: 'Hello',
        page: '/',
        locale: 'jp',
        website: '',
      }),
    ).rejects.toThrow('Feedback API returned 429');
  });
});
