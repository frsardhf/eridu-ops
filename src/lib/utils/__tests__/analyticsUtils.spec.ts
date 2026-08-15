import { describe, expect, it } from 'vitest';
import {
  analyticsEventKey,
  mergeAnalyticsEvent,
  resolveAnalyticsRoute,
  resolveDeviceClass,
} from '../analyticsUtils';

describe('analyticsUtils', () => {
  it('maps public route names while excluding private or unknown routes', () => {
    expect(resolveAnalyticsRoute('Crafting')).toBe('crafting');
    expect(resolveAnalyticsRoute('Activity')).toBeNull();
    expect(resolveAnalyticsRoute(undefined)).toBeNull();
  });

  it('classifies devices from bounded viewport ranges', () => {
    expect(resolveDeviceClass(390)).toBe('mobile');
    expect(resolveDeviceClass(800)).toBe('tablet');
    expect(resolveDeviceClass(1440)).toBe('desktop');
  });

  it('aggregates identical event dimensions', () => {
    const input = {
      name: 'plan_action' as const,
      route: 'crafting' as const,
      feature: 'crafting_plan' as const,
      action: 'adjusted' as const,
    };
    const payload = { ...input, locale: 'en' as const, device: 'desktop' as const, count: 1 };

    expect(analyticsEventKey(input)).toBe('plan_action|crafting|crafting_plan|adjusted');
    expect(mergeAnalyticsEvent(payload, { ...payload, count: 3 }).count).toBe(4);
    expect(mergeAnalyticsEvent({ ...payload, count: 999 }, { ...payload, count: 3 }).count).toBe(
      1000,
    );
  });
});
