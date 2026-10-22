import { Routes } from '@angular/router';
import { TenderDetailComponent } from './pages/tender-detail/tender-detail.component';
import { TenderListComponent } from './pages/tender-list/tender-list.component';
import { TendersPaths } from './tenders.paths';

export const tendersRoutes: Routes = [
  { path: '', component: TenderListComponent },
  { path: TendersPaths.segments.id, component: TenderDetailComponent },
];
