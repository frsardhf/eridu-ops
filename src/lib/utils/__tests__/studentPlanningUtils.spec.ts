import { describe, expect, it } from 'vitest';
import { isUpgradePlanActive } from '../studentPlanningUtils';

describe('upgrade planning eligibility', () => {
  it('preserves implicit ownership for existing records', () => {
    expect(isUpgradePlanActive(undefined)).toBe(true);
    expect(isUpgradePlanActive({})).toBe(true);
    expect(isUpgradePlanActive({ planEnabled: false })).toBe(true);
  });

  it('requires explicit planning for unowned students', () => {
    expect(isUpgradePlanActive({ isOwned: false })).toBe(false);
    expect(isUpgradePlanActive({ isOwned: false, planEnabled: false })).toBe(false);
    expect(isUpgradePlanActive({ isOwned: false, planEnabled: true })).toBe(true);
  });

  it('includes recruited students regardless of the future-planning preference', () => {
    expect(isUpgradePlanActive({ isOwned: true, planEnabled: true })).toBe(true);
    expect(isUpgradePlanActive({ isOwned: true, planEnabled: false })).toBe(true);
  });
});
