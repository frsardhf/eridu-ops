import { describe, expect, it } from 'vitest';
import { isUpcomingOnServer } from '../studentAvailabilityUtils';

describe('regional student availability', () => {
  it('uses the server release flag independently of ownership or language', () => {
    const student = { IsReleased: [true, false, false] };
    expect(isUpcomingOnServer(student, 'jp')).toBe(false);
    expect(isUpcomingOnServer(student, 'global')).toBe(true);
    expect(isUpcomingOnServer(student, 'cn')).toBe(true);
    expect(isUpcomingOnServer({ IsReleased: [true, true, false] }, 'global')).toBe(false);
  });

  it('does not label unknown release metadata as upcoming', () => {
    expect(isUpcomingOnServer({}, 'global')).toBe(false);
    expect(isUpcomingOnServer({ IsReleased: [true] }, 'global')).toBe(false);
  });
});
