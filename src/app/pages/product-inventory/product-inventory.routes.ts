import { Routes } from '@angular/router';
import { InventoryProductsComponent } from './inventory-items/inventory-products/inventory-products.component';
import { InventoryResourcesComponent } from './inventory-resources/inventory-resources.component';
import { InventoryServicesComponent } from './inventory-services/inventory-services.component';

export const productInventoryRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  { path: 'products', component: InventoryProductsComponent },
  { path: 'services', component: InventoryServicesComponent },
  { path: 'resources', component: InventoryResourcesComponent },
];
