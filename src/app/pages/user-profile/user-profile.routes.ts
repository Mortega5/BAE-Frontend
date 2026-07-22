import { Routes } from '@angular/router';
import { BillingInfoComponent } from './profile-sections/billing-info/billing-info.component';
import { ProfileGeneralComponent } from './profile-sections/profile-general/profile-general.component';
import { ProviderRevenueSharingComponent } from './profile-sections/provider-revenue-sharing/provider-revenue-sharing.component';

export const userProfileRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'general' },
  { path: 'general', component: ProfileGeneralComponent },
  { path: 'billing', component: BillingInfoComponent },
  { path: 'revenue', component: ProviderRevenueSharingComponent },
];
