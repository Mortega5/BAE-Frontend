import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { ADMIN_SECTION_ORDER, AdminSection, adminSectionUrl, canManageCategories, canOpenAdminSection } from './admin.access';
import { AdminPaths } from './admin.paths';
import { AnalyticsConfigComponent } from './analytics-config/analytics-config.component';
import { CategoriesComponent } from './categories/categories.component';
import { CreateCategoryComponent } from './categories/create-category/create-category.component';
import { UpdateCategoryComponent } from './categories/update-category/update-category.component';
import { DefaultCatalogComponent } from './default-catalog/default-catalog.component';
import { EmailComponent } from './email/email.component';
import { FeaturesConfigComponent } from './features-config/features-config.component';
import { SearchConfigComponent } from './search-config/search-config.component';
import { SearchFiltersConfigComponent } from './search-filters-config/search-filters-config.component';
import { VerificationComponent } from './verification/verification.component';

const { segments } = AdminPaths;

/** /admin lands on the first section the session can open (e.g. a certifier only gets verification). */
const adminLandingGuard: CanActivateFn = () => {
  const auth = inject(AuthGuard);
  const section = ADMIN_SECTION_ORDER.find(s => canOpenAdminSection(auth, s));
  return inject(Router).parseUrl(section ? adminSectionUrl(section) : '/dashboard');
};

/** A section the session can't open bounces back to /admin, which lands on an allowed one. */
const adminSectionGuard = (section: AdminSection): CanActivateFn => () =>
  canOpenAdminSection(inject(AuthGuard), section) || inject(Router).parseUrl(AdminPaths.root());

/** Create/update pages are write-only views: a session that can't write lands back on the list. */
const manageCategoriesGuard: CanActivateFn = () =>
  canManageCategories(inject(AuthGuard)) || inject(Router).parseUrl(AdminPaths.categories.list());

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [adminLandingGuard], children: [] },
  {
    path: segments.categories,
    canActivate: [adminSectionGuard('categories')],
    children: [
      { path: '', component: CategoriesComponent },
      { path: segments.new, component: CreateCategoryComponent, canActivate: [manageCategoriesGuard] },
      { path: segments.id, component: UpdateCategoryComponent, canActivate: [manageCategoriesGuard] },
    ],
  },
  { path: segments.verification, component: VerificationComponent, canActivate: [adminSectionGuard('verification')] },
  { path: segments.email, component: EmailComponent, canActivate: [adminSectionGuard('email')] },
  { path: segments.searchFilters, component: SearchFiltersConfigComponent, canActivate: [adminSectionGuard('searchFilters')] },
  { path: segments.search, component: SearchConfigComponent, canActivate: [adminSectionGuard('search')] },
  { path: segments.defaultCatalog, component: DefaultCatalogComponent, canActivate: [adminSectionGuard('defaultCatalog')] },
  { path: segments.analytics, component: AnalyticsConfigComponent, canActivate: [adminSectionGuard('analytics')] },
  { path: segments.features, component: FeaturesConfigComponent, canActivate: [adminSectionGuard('features')] },
];
