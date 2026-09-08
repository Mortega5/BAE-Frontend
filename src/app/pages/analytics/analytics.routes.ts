import { Routes } from '@angular/router';
import { AnalyticsPaths } from './analytics.paths';
import { AnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';

const { segments } = AnalyticsPaths;

export const analyticsRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.businessInsights },
  { path: segments.businessInsights, component: AnalyticsDashboardComponent, data: { tab: 'businessInsights' } },
  { path: segments.usageMonitor, component: AnalyticsDashboardComponent, data: { tab: 'usageMonitor' } },
];
