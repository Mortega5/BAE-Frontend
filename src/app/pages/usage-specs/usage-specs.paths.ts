/**
 * Single source of truth for every usage-spec route. Both
 * usage-specs.routes.ts and every component that navigates here import from
 * this file instead of hardcoding path strings.
 */
const rootSegment = 'usage-spec';
const root = `/${rootSegment}`;

const segments = {
  new: 'new',
  id: ':id',
} as const;

export const UsageSpecsPaths = {
  rootSegment,
  root: () => root,
  segments,
  list: () => root,
  new: () => `${root}/${segments.new}`,
  edit: (id: string) => `${root}/${id}`,
} as const;
