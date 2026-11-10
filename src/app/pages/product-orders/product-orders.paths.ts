/**
 * Single source of truth for every product-orders route. Both
 * product-orders.routes.ts and every component that navigates here import
 * from this file instead of hardcoding path strings.
 */
import { DashboardPaths } from '../dashboard/dashboard.paths';

const rootSegment = DashboardPaths.segments.productOrders;
const root = DashboardPaths.productOrders();

const segments = {
  orders: 'orders',
  invoice: 'invoice',
} as const;

export const ProductOrdersPaths = {
  rootSegment,
  root: () => root,
  segments,
  orders: () => `${root}/${segments.orders}`,
  invoice: () => `${root}/${segments.invoice}`,
} as const;
