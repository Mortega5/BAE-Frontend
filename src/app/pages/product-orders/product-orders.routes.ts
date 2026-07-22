import { Routes } from '@angular/router';
import { ProductOrdersPaths } from './product-orders.paths';
import { InvoicesInfoComponent } from './sections/invoices-info/invoices-info.component';
import { OrderInfoComponent } from './sections/order-info/order-info.component';

const { segments } = ProductOrdersPaths;

export const productOrdersRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.orders },
  { path: segments.orders, component: OrderInfoComponent },
  { path: segments.invoice, component: InvoicesInfoComponent },
];
