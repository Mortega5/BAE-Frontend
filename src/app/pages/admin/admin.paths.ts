/**
 * Single source of truth for every admin route. Both admin.routes.ts and
 * every component that navigates here import from this file instead of
 * hardcoding path strings.
 */
const rootSegment = 'admin';
const root = `/${rootSegment}`;

const segments = {
  analytics: 'analytics',
  categories: 'categories',
  verification: 'verification',
  revenue: 'revenue',
  email: 'email',
  searchFilters: 'search-filters',
  defaultCatalog: 'default-catalog',
  new: 'new',
  id: ':id',
  features: 'features'
} as const;

function group(segment: string) {
  const base = `${root}/${segment}`;
  return {
    segment,
    list: () => base,
    new: () => `${base}/${segments.new}`,
    edit: (id: string) => `${base}/${id}`,
  };
}

export const AdminPaths = {
  rootSegment,
  root: () => root,
  segments,
  categories: group(segments.categories),
  verification: () => `${root}/${segments.verification}`,
  revenue: () => `${root}/${segments.revenue}`,
  email: () => `${root}/${segments.email}`,
  searchFilters: () => `${root}/${segments.searchFilters}`,
  analytics: () => `${root}/${segments.analytics}`,
  features: () => `${root}/${segments.features}`,
  defaultCatalog: () => `${root}/${segments.defaultCatalog}`,
} as const;
