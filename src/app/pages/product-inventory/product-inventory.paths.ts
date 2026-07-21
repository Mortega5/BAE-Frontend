/**
 * Single source of truth for every product-inventory route. Both
 * product-inventory.routes.ts and every component that navigates here import
 * from this file instead of hardcoding path strings.
 */
const rootSegment = 'product-inventory';
const root = `/${rootSegment}`;

const segments = {
  products: 'products',
  services: 'services',
  resources: 'resources',
} as const;

export const ProductInventoryPaths = {
  rootSegment,
  root: () => root,
  segments,
  products: () => `${root}/${segments.products}`,
  services: () => `${root}/${segments.services}`,
  resources: () => `${root}/${segments.resources}`,
  /** The separate `product-inventory/:id` detail route (ProductInvDetailComponent). */
  detail: (id: string) => `${root}/${id}`,
} as const;
