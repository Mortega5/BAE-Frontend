/**
 * Single source of truth for the user workspace ("dashboard") routes. The public
 * landing page lives at '/', not here. Seller offerings are mounted under
 * `offerings`; their own paths are in seller-offerings.paths.ts.
 */
const rootSegment = 'dashboard';
const root = `/${rootSegment}`;

const segments = {
  overview: 'overview',
  offerings: 'offerings',
  productOrders: 'product-orders',
  inventory: 'product-inventory',
  analytics: 'analytics',
  quotes: 'quote-list',
  tenders: 'tenders',
} as const;

export const DashboardPaths = {
  rootSegment,
  root: () => root,
  segments,
  overview: () => `${root}/${segments.overview}`,
  offerings: () => `${root}/${segments.offerings}`,
  productOrders: () => `${root}/${segments.productOrders}`,
  inventory: () => `${root}/${segments.inventory}`,
  analytics: () => `${root}/${segments.analytics}`,
  quotes: () => `${root}/${segments.quotes}`,
  tenders: () => `${root}/${segments.tenders}`,
} as const;
