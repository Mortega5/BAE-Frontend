/**
 * Single source of truth for every analytics route. Both analytics.routes.ts
 * and every component that navigates here import from this file instead of
 * hardcoding path strings.
 */
import { DashboardPaths } from '../dashboard/dashboard.paths';

const rootSegment = DashboardPaths.segments.analytics;
const root = DashboardPaths.analytics();

const segments = {
  businessInsights: 'business-insights',
  usageMonitor: 'usage-monitor',
} as const;

export const AnalyticsPaths = {
  rootSegment,
  root: () => root,
  segments,
  businessInsights: () => `${root}/${segments.businessInsights}`,
  usageMonitor: () => `${root}/${segments.usageMonitor}`,
} as const;
