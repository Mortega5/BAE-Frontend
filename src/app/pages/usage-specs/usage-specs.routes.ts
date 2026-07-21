import { Routes } from '@angular/router';
import { CreateUsageSpecComponent } from './usage-sections/create-usage-spec/create-usage-spec.component';
import { UpdateUsageSpecComponent } from './usage-sections/update-usage-spec/update-usage-spec.component';
import { UsageListComponent } from './usage-sections/usage-list/usage-list.component';
import { UsageSpecsPaths } from './usage-specs.paths';

const { segments } = UsageSpecsPaths;

export const usageSpecsRoutes: Routes = [
  { path: '', component: UsageListComponent },
  { path: segments.new, component: CreateUsageSpecComponent },
  { path: segments.id, component: UpdateUsageSpecComponent },
];
