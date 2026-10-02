export type FeedbackCategory = 'suggestion' | 'bug_report' | 'incorrect_data' | 'other';

export interface FeedbackSubmissionPayload {
  category: FeedbackCategory;
  message: string;
  page: string;
  locale: 'en' | 'jp' | 'kr';
  website: string;
}
