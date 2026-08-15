export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'feature_opened',
  'workflow_completed',
  'workflow_failed',
  'setting_changed',
  'filter_changed',
  'plan_action',
  'export_completed',
] as const;

export const ANALYTICS_ROUTES = [
  'landing',
  'students',
  'bonds',
  'crafting',
  'hall',
  'chibi3d',
] as const;

export const ANALYTICS_FEATURES = [
  'navigation',
  'preferences',
  'inventory',
  'inventory_scanner',
  'data_transfer',
  'student_modal',
  'apply_upgrade',
  'bulk_modify',
  'bond_update',
  'deck_builder',
  'equipment_farming',
  'bond_planner',
  'crafting_plan',
  'hall_entries',
  'hall_submission',
  'hall_export',
  'chibi_room',
] as const;

export const ANALYTICS_ACTIONS = [
  'opened',
  'changed',
  'refreshed',
  'reset',
  'adjusted',
  'tracked',
  'untracked',
  'converted',
  'synced',
  'applied',
  'submitted',
  'selected',
  'played',
  'imported',
  'exported',
  'scanned',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];
export type AnalyticsRoute = (typeof ANALYTICS_ROUTES)[number];
export type AnalyticsFeature = (typeof ANALYTICS_FEATURES)[number];
export type AnalyticsAction = (typeof ANALYTICS_ACTIONS)[number];
export type AnalyticsLocale = 'en' | 'jp' | 'kr';
export type AnalyticsDevice = 'desktop' | 'tablet' | 'mobile';

export interface AnalyticsEventInput {
  name: AnalyticsEventName;
  route: AnalyticsRoute;
  feature?: AnalyticsFeature;
  action?: AnalyticsAction;
}

export interface AnalyticsEventPayload extends AnalyticsEventInput {
  locale: AnalyticsLocale;
  device: AnalyticsDevice;
  count: number;
}

export interface AnalyticsBatchPayload {
  session: string;
  events: AnalyticsEventPayload[];
}

export interface ActivitySummary {
  events: number;
  sessions: number;
  completed: number;
  failed: number;
}

export interface ActivityDailyPoint {
  day: string;
  events: number;
  sessions: number;
}

export interface ActivityEventRow {
  timestamp?: string;
  name: AnalyticsEventName;
  route: AnalyticsRoute;
  feature?: AnalyticsFeature;
  action?: AnalyticsAction;
  locale?: AnalyticsLocale;
  device?: AnalyticsDevice;
  count: number;
}

export interface ActivityReport {
  days: number;
  generatedAt: string;
  summary: ActivitySummary;
  daily: ActivityDailyPoint[];
  top: ActivityEventRow[];
  recent: ActivityEventRow[];
}
