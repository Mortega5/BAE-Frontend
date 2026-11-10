import { Routes } from '@angular/router';
import { QuoteListComponent } from 'src/app/features/quotes/pages/quote-list/quote-list.component';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { quoteGuardGuard } from 'src/app/guard/quote-guard.guard';
import { tenderGuardGuard } from 'src/app/guard/tender-guard.guard';
import { AnalyticsComponent } from '../analytics/analytics.component';
import { analyticsRoutes } from '../analytics/analytics.routes';
import { ProductInvDetailComponent } from '../product-inventory/inventory-items/product-inv-detail/product-inv-detail.component';
import { ProductInventoryComponent } from '../product-inventory/product-inventory.component';
import { productInventoryRoutes } from '../product-inventory/product-inventory.routes';
import { ProductOrdersComponent } from '../product-orders/product-orders.component';
import { productOrdersRoutes } from '../product-orders/product-orders.routes';
import { sellerOfferingsRoutes } from '../seller-offerings/seller-offerrings.routes';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { DashboardPaths } from './dashboard.paths';

const { segments } = DashboardPaths;

export const dashboardRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.overview },
  { path: segments.overview, component: DashboardOverviewComponent },
  {
    path: segments.offerings,
    canActivate: [AuthGuard], data: { roles: ['seller'] },
    children: sellerOfferingsRoutes,
  },
  {
    path: segments.productOrders,
    component: ProductOrdersComponent,
    canActivate: [AuthGuard], data: { roles: [] },
    children: productOrdersRoutes,
  },
  {
    path: segments.inventory,
    component: ProductInventoryComponent,
    canActivate: [AuthGuard], data: { roles: [] },
    children: [
      ...productInventoryRoutes,
      { path: ':id', component: ProductInvDetailComponent },
    ],
  },
  {
    path: segments.analytics,
    component: AnalyticsComponent,
    canActivate: [AuthGuard], data: { roles: [] },
    children: analyticsRoutes,
  },
  {
    path: segments.quotes,
    component: QuoteListComponent,
    canActivate: [AuthGuard, quoteGuardGuard], data: { roles: [] },
  },
  {
    path: segments.tenders,
    loadChildren: () => import('src/app/features/tenders/tenders.module').then(m => m.TendersModule),
    canActivate: [AuthGuard, tenderGuardGuard],
    data: { roles: [] },
  },
];
