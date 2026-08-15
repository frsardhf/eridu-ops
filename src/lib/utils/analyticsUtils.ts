import type {
  AnalyticsDevice,
  AnalyticsEventInput,
  AnalyticsEventPayload,
  AnalyticsRoute,
} from '@/types/analytics';

const ROUTE_BY_NAME: Record<string, AnalyticsRoute> = {
  Landing: 'landing',
  Students: 'students',
  Bonds: 'bonds',
  Crafting: 'crafting',
  Hall: 'hall',
  Chibi3d: 'chibi3d',
};

export function resolveAnalyticsRoute(routeName: unknown): AnalyticsRoute | null {
  return typeof routeName === 'string' ? (ROUTE_BY_NAME[routeName] ?? null) : null;
}

export function resolveDeviceClass(width: number): AnalyticsDevice {
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

export function analyticsEventKey(event: AnalyticsEventInput): string {
  return [event.name, event.route, event.feature ?? '', event.action ?? ''].join('|');
}

export function mergeAnalyticsEvent(
  current: AnalyticsEventPayload | undefined,
  next: AnalyticsEventPayload,
): AnalyticsEventPayload {
  if (!current) return next;
  return { ...current, count: Math.min(1000, current.count + next.count) };
}
