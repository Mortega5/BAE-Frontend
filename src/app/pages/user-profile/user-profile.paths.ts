/**
 * Single source of truth for every user-profile route. Both
 * user-profile.routes.ts and every component that navigates here import from
 * this file instead of hardcoding path strings.
 */
const rootSegment = 'profile';
const root = `/${rootSegment}`;

const segments = {
  general: 'general',
  billing: 'billing',
  revenue: 'revenue',
} as const;

export const UserProfilePaths = {
  rootSegment,
  root: () => root,
  segments,
  general: () => `${root}/${segments.general}`,
  billing: () => `${root}/${segments.billing}`,
  revenue: () => `${root}/${segments.revenue}`,
} as const;
