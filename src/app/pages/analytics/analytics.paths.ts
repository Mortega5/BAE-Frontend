/**
 * Single source of truth for every analytics route. Both analytics.routes.ts
 * and every component that navigates here import from this file instead of
 * hardcoding path strings.
 */
const rootSegment = 'analytics';
const root = `/${rootSegment}`;

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
