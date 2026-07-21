import { Routes } from '@angular/router';
import { BillingInfoComponent } from './profile-sections/billing-info/billing-info.component';
import { ProfileGeneralComponent } from './profile-sections/profile-general/profile-general.component';
import { ProviderRevenueSharingComponent } from './profile-sections/provider-revenue-sharing/provider-revenue-sharing.component';
import { UserProfilePaths } from './user-profile.paths';

const { segments } = UserProfilePaths;

export const userProfileRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.general },
  { path: segments.general, component: ProfileGeneralComponent },
  { path: segments.billing, component: BillingInfoComponent },
  { path: segments.revenue, component: ProviderRevenueSharingComponent },
];
