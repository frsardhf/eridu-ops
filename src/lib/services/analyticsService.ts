import { currentLanguage } from '@/lib/stores/localizationStore';
import {
  analyticsEventKey,
  mergeAnalyticsEvent,
  resolveAnalyticsRoute,
  resolveDeviceClass,
} from '@/lib/utils/analyticsUtils';
import type {
  ActivityReport,
  AnalyticsBatchPayload,
  AnalyticsEventInput,
  AnalyticsEventPayload,
} from '@/types/analytics';
import {
  ANALYTICS_ACTIONS,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_FEATURES,
  ANALYTICS_ROUTES,
} from '@/types/analytics';
import type { Router } from 'vue-router';

const EVENT_ENDPOINT = '/api/events';
const ACTIVITY_ENDPOINT = '/api/activity';
const FLUSH_DELAY_MS = 5000;
const MAX_BATCH_SIZE = 20;
const SESSION_KEY = 'eridu-analytics-session';

const pending = new Map<string, AnalyticsEventPayload>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;
let fallbackSessionId = '';

function analyticsEnabled(): boolean {
  return import.meta.env.PROD && window.location.hostname === 'eriduops.com';
}

function sessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const next = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    if (!fallbackSessionId) {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      fallbackSessionId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
    return fallbackSessionId;
  }
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAnalytics();
  }, FLUSH_DELAY_MS);
}

function takeBatch(): AnalyticsEventPayload[] {
  const events = Array.from(pending.entries()).slice(0, MAX_BATCH_SIZE);
  for (const [key] of events) pending.delete(key);
  return events.map(([, event]) => event);
}

function sendBatch(events: AnalyticsEventPayload[], beacon = false): void {
  if (!events.length) return;
  const payload: AnalyticsBatchPayload = { session: sessionId(), events };
  const body = JSON.stringify(payload);

  if (beacon && navigator.sendBeacon) {
    const queued = navigator.sendBeacon(
      EVENT_ENDPOINT,
      new Blob([body], { type: 'application/json' }),
    );
    if (queued) return;
  }

  void fetch(EVENT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'omit',
    keepalive: true,
  }).catch(() => {});
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value);
}

function parseEventRow(value: unknown) {
  if (!isRecord(value)) return null;
  if (!isOneOf(value.name, ANALYTICS_EVENT_NAMES)) return null;
  if (!isOneOf(value.route, ANALYTICS_ROUTES)) return null;

  const feature = isOneOf(value.feature, ANALYTICS_FEATURES) ? value.feature : undefined;
  const action = isOneOf(value.action, ANALYTICS_ACTIONS) ? value.action : undefined;
  const locale = isOneOf(value.locale, ['en', 'jp', 'kr'] as const) ? value.locale : undefined;
  const device = isOneOf(value.device, ['desktop', 'tablet', 'mobile'] as const)
    ? value.device
    : undefined;

  return {
    name: value.name,
    route: value.route,
    feature,
    action,
    locale,
    device,
    timestamp: typeof value.timestamp === 'string' ? value.timestamp : undefined,
    count: Number(value.count ?? 0),
  };
}

function parseActivityReport(value: unknown, days: number): ActivityReport {
  if (!isRecord(value) || !isRecord(value.summary)) throw new Error('Invalid activity report');
  const daily = Array.isArray(value.daily) ? value.daily : [];
  const top = Array.isArray(value.top) ? value.top : [];
  const recent = Array.isArray(value.recent) ? value.recent : [];

  return {
    days,
    generatedAt:
      typeof value.generatedAt === 'string' ? value.generatedAt : new Date().toISOString(),
    summary: {
      events: Number(value.summary.events ?? 0),
      sessions: Number(value.summary.sessions ?? 0),
      completed: Number(value.summary.completed ?? 0),
      failed: Number(value.summary.failed ?? 0),
    },
    daily: daily
      .filter(isRecord)
      .map((row) => ({
        day: typeof row.day === 'string' ? row.day : '',
        events: Number(row.events ?? 0),
        sessions: Number(row.sessions ?? 0),
      }))
      .filter((row) => row.day !== ''),
    top: top.map(parseEventRow).filter((row) => row !== null),
    recent: recent.map(parseEventRow).filter((row) => row !== null),
  };
}

export function trackAnalytics(event: AnalyticsEventInput): void {
  if (!analyticsEnabled()) return;

  const payload: AnalyticsEventPayload = {
    ...event,
    locale: currentLanguage.value,
    device: resolveDeviceClass(window.innerWidth),
    count: 1,
  };
  const key = analyticsEventKey(event);
  pending.set(key, mergeAnalyticsEvent(pending.get(key), payload));
  scheduleFlush();
}

export function flushAnalytics(beacon = false): void {
  if (!analyticsEnabled()) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  while (pending.size) sendBatch(takeBatch(), beacon);
}

export function installAnalytics(router: Router): void {
  if (installed) return;
  installed = true;

  router.afterEach((to, _from, failure) => {
    if (failure) return;
    const route = resolveAnalyticsRoute(to.name);
    if (route) trackAnalytics({ name: 'page_view', route });
  });

  window.addEventListener('pagehide', () => flushAnalytics(true));
}

function createMockActivityReport(days: number): ActivityReport {
  const today = new Date();
  const daily = Array.from({ length: Math.min(days, 14) }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (Math.min(days, 14) - index - 1));
    return {
      day: date.toISOString().slice(0, 10),
      events: 18 + ((index * 13) % 37),
      sessions: 4 + ((index * 5) % 11),
    };
  });

  return {
    days,
    generatedAt: new Date().toISOString(),
    summary: { events: 486, sessions: 93, completed: 74, failed: 6 },
    daily,
    top: [
      { name: 'page_view', route: 'students', count: 142 },
      {
        name: 'plan_action',
        route: 'crafting',
        feature: 'crafting_plan',
        action: 'adjusted',
        count: 81,
      },
      {
        name: 'feature_opened',
        route: 'bonds',
        feature: 'bond_planner',
        action: 'opened',
        count: 63,
      },
    ],
    recent: [
      {
        timestamp: new Date().toISOString(),
        name: 'workflow_completed',
        route: 'students',
        feature: 'inventory_scanner',
        action: 'applied',
        locale: 'en',
        device: 'desktop',
        count: 1,
      },
      {
        timestamp: new Date(Date.now() - 180000).toISOString(),
        name: 'plan_action',
        route: 'crafting',
        feature: 'crafting_plan',
        action: 'adjusted',
        locale: 'jp',
        device: 'mobile',
        count: 4,
      },
    ],
  };
}

export async function getActivityReport(days: number): Promise<ActivityReport> {
  if (import.meta.env.DEV) return createMockActivityReport(days);

  const response = await fetch(`${ACTIVITY_ENDPOINT}?days=${days}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Activity API returned ${response.status}`);
  const raw: unknown = await response.json();
  return parseActivityReport(raw, days);
}
