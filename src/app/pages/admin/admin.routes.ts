import { Routes } from '@angular/router';
import { AdminPaths } from './admin.paths';
import { AnalyticsConfigComponent } from './analytics-config/analytics-config.component';
import { CategoriesComponent } from './categories/categories.component';
import { CreateCategoryComponent } from './categories/create-category/create-category.component';
import { UpdateCategoryComponent } from './categories/update-category/update-category.component';
import { DefaultCatalogComponent } from './default-catalog/default-catalog.component';
import { EmailComponent } from './email/email.component';
import { FeaturesConfigComponent } from './features-config/features-config.component';
import { OperatorRevenueSharingComponent } from './operator-revenue-sharing/operator-revenue-sharing.component';
import { SearchFiltersConfigComponent } from './search-filters-config/search-filters-config.component';
import { VerificationComponent } from './verification/verification.component';

const { segments } = AdminPaths;

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.categories },
  {
    path: segments.categories,
    children: [
      { path: '', component: CategoriesComponent },
      { path: segments.new, component: CreateCategoryComponent },
      { path: segments.id, component: UpdateCategoryComponent },
    ],
  },
  { path: segments.verification, component: VerificationComponent },
  { path: segments.revenue, component: OperatorRevenueSharingComponent },
  { path: segments.email, component: EmailComponent },
  { path: segments.searchFilters, component: SearchFiltersConfigComponent },
  { path: segments.defaultCatalog, component: DefaultCatalogComponent },
  { path: segments.analytics, component: AnalyticsConfigComponent },
  { path: segments.features, component: FeaturesConfigComponent },
];
