/**
 * Single source of truth for every tenders route. Both tenders.routes.ts and
 * every component that navigates here import from this file instead of
 * hardcoding path strings.
 */
const rootSegment = 'tenders';
const root = `/${rootSegment}`;

const segments = {
  id: ':id',
} as const;

export const TendersPaths = {
  rootSegment,
  root: () => root,
  segments,
  /** Tender ids are URNs: encoded so the colons stay inside one path segment. */
  detail: (id: string) => `${root}/${encodeURIComponent(id)}`,
} as const;
