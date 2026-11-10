import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutDomeComponent } from "src/app/pages/about-dome/about-dome.component";
import { BlogEntryDetailComponent } from "src/app/pages/dome-blog/blog-entry-detail/blog-entry-detail.component";
import { DomeBlogComponent } from "src/app/pages/dome-blog/dome-blog.component";
import { EntryFormComponent } from "src/app/pages/dome-blog/entry-form/entry-form.component";
import { FaqComponent } from "src/app/offerings/faq/faq.component";
import { AuthGuard } from './guard/auth.guard';
import { AdminComponent } from "./pages/admin/admin.component";
import { AdminPaths } from "./pages/admin/admin.paths";
import { adminRoutes } from "./pages/admin/admin.routes";
import { loginTokenRedirectGuard } from './guard/login-token-redirect.guard';
import { CatalogsComponent } from "./pages/catalogs/catalogs.component";
import { CheckoutComponent } from "./pages/checkout/checkout.component";
import { ContactUsFormComponent } from "./pages/contact-us/contact-us-form.component";
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { DashboardPaths } from './pages/dashboard/dashboard.paths';
import { dashboardRoutes } from './pages/dashboard/dashboard.routes';
import { LandingComponent } from './pages/landing/landing.component';
import { OrganizationDetailsComponent } from "./pages/organization-details/organization-details.component";
import { ProductDetailsComponent } from "./pages/product-details/product-details.component";
import { SearchComponent } from "./pages/search/search.component";
import { UserProfileComponent } from "./pages/user-profile/user-profile.component";
import { unsavedChangesGuard } from "./guard/unsaved-changes.guard";
import { UserProfilePaths } from "./pages/user-profile/user-profile.paths";
import { userProfileRoutes } from "./pages/user-profile/user-profile.routes";



/** Redirects `/<oldSegment>`, `/<oldSegment>/:section` and `/<oldSegment>/:section/:id` to the same place under the dashboard. */
function legacyRedirects(newSegment: string, oldSegment: string = newSegment): Routes {
  const target = `${DashboardPaths.root()}/${newSegment}`;
  return [
    { path: oldSegment, redirectTo: target, pathMatch: 'full' },
    { path: `${oldSegment}/:section`, redirectTo: `${target}/:section`, pathMatch: 'full' },
    { path: `${oldSegment}/:section/:id`, redirectTo: `${target}/:section/:id`, pathMatch: 'full' },
  ];
}

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingComponent
  },
  {
    path: DashboardPaths.rootSegment,
    component: DashboardComponent,
    canActivate: [loginTokenRedirectGuard, AuthGuard], data: { roles: [] },
    children: dashboardRoutes,
  },
  // Everything the user owns moved under the dashboard; keep the old URLs working
  ...legacyRedirects(DashboardPaths.segments.offerings, 'my-offerings'),
  ...legacyRedirects(DashboardPaths.segments.productOrders),
  ...legacyRedirects(DashboardPaths.segments.inventory),
  ...legacyRedirects(DashboardPaths.segments.analytics),
  ...legacyRedirects(DashboardPaths.segments.quotes),
  ...legacyRedirects(DashboardPaths.segments.tenders),
  {
    path: 'about',
    component: AboutDomeComponent
  },
  {
    path: 'search',
    component: SearchComponent
  },
  {
    path: 'search/:id',
    component: ProductDetailsComponent
  },
  {
    path: 'org-details/:id',
    component: OrganizationDetailsComponent,
    data: { mode: 'organization' }
  },
  {
    path: 'search/catalogue/:id',
    component: OrganizationDetailsComponent,
    data: { mode: 'catalog' }
  },
  {
    path: 'catalogues',
    component: CatalogsComponent
  },
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: 'checkout/:id',
    component: CheckoutComponent,
    canActivate: [AuthGuard], data: { roles: [] }
  },
  {
    path: UserProfilePaths.rootSegment,
    component: UserProfileComponent,
    canActivate: [AuthGuard], data: { roles: [] },
    children: userProfileRoutes,
  },
  {
    path: AdminPaths.rootSegment,
    component: AdminComponent,
    canActivate: [AuthGuard], data: { roles: ['admin', 'certifier'] },
    children: adminRoutes,
  },
  {
    path: 'contact-us',
    component: ContactUsFormComponent
  },
  {
    path: 'blog',
    component: DomeBlogComponent,
    data: { contentType: 'blog' }
  },
  {
    path: 'blog/:slugOrId',
    component: BlogEntryDetailComponent,
    data: { contentType: 'blog' }
  },
  {
    path: 'news',
    component: DomeBlogComponent,
    data: { contentType: 'news' }
  },
  {
    path: 'news/:slugOrId',
    component: BlogEntryDetailComponent,
    data: { contentType: 'news' }
  },
  {
    path: 'faq',
    component: FaqComponent
  },
  {
    path: 'blog-entry',
    component: EntryFormComponent,
    canDeactivate: [unsavedChangesGuard], canActivate: [AuthGuard], data: { roles: ['admin'] }
  },
  {
    path: 'blog-entry/:id',
    component: EntryFormComponent,
    canDeactivate: [unsavedChangesGuard], canActivate: [AuthGuard], data: { roles: ['admin'] }
  },

  {
    path: 'browse',
    loadComponent: () => import('./pages/browse/browse.component').then(c => c.BrowseComponent),
  },
  {
    path: 'redsys-payment',
    loadComponent: () => import('./pages/redsys-payment/redsys-payment.component').then(c => c.RedsysPaymentComponent),
  },

  {
    path: 'landing-page',
    children: [{
      path: 'customers',
      loadComponent: () => import('./pages/landing-pages/customers/landing-page-customers.component').then(c => c.LandingPageCustomersComponent),
    },
    {
      path: 'providers',
      loadComponent: () => import('./pages/landing-pages/providers/landing-page-providers.component').then(c => c.LandingPageProvidersComponent),
    }]
  },

  { path: '**', redirectTo: '', pathMatch: 'full' },
]

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
