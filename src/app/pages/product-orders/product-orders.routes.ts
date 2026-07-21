import { Routes } from '@angular/router';
import { InvoicesInfoComponent } from './sections/invoices-info/invoices-info.component';
import { OrderInfoComponent } from './sections/order-info/order-info.component';

export const productOrdersRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  { path: 'orders', component: OrderInfoComponent },
  { path: 'invoice', component: InvoicesInfoComponent },
];
