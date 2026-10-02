import { buildApiUrl } from './apiService';
import type { FeedbackSubmissionPayload } from '@/types/feedback';

export async function submitFeedbackSubmission(payload: FeedbackSubmissionPayload): Promise<void> {
  const response = await fetch(buildApiUrl('/feedback/submissions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Feedback API returned ${response.status}`);
  }
}
