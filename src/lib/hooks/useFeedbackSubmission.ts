import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useNavbarSettings } from './useNavbarSettings';
import { submitFeedbackSubmission } from '@/lib/services/feedbackService';
import type { FeedbackCategory } from '@/types/feedback';

export const FEEDBACK_CATEGORIES = [
  'suggestion',
  'bug_report',
  'incorrect_data',
  'other',
] as const satisfies readonly FeedbackCategory[];

export const MAX_FEEDBACK_MESSAGE_LENGTH = 2000;

export function useFeedbackSubmission() {
  const route = useRoute();
  const { currentLanguage } = useNavbarSettings();
  const submitting = ref(false);
  const submitted = ref(false);
  const failed = ref(false);

  async function submit(
    category: FeedbackCategory,
    message: string,
    website: string,
  ): Promise<void> {
    if (submitting.value) return;

    submitting.value = true;
    failed.value = false;
    try {
      await submitFeedbackSubmission({
        category,
        message: message.trim(),
        page: route.path,
        locale: currentLanguage.value,
        website,
      });
      submitted.value = true;
    } catch {
      failed.value = true;
    } finally {
      submitting.value = false;
    }
  }

  return {
    failed,
    submit,
    submitted,
    submitting,
  };
}
