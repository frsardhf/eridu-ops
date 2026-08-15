import { getActivityReport, trackAnalytics } from '@/lib/services/analyticsService';
import { resolveAnalyticsRoute } from '@/lib/utils/analyticsUtils';
import type { AnalyticsEventInput } from '@/types/analytics';
import { useRoute } from 'vue-router';

type CurrentRouteEvent = Omit<AnalyticsEventInput, 'route'>;

export function useAnalytics() {
  const route = useRoute();

  function track(event: CurrentRouteEvent): void {
    const analyticsRoute = resolveAnalyticsRoute(route.name);
    if (analyticsRoute) trackAnalytics({ ...event, route: analyticsRoute });
  }

  return {
    track,
    getActivityReport,
  };
}
