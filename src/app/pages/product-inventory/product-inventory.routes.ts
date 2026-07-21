import { Routes } from '@angular/router';
import { InventoryProductsComponent } from './inventory-items/inventory-products/inventory-products.component';
import { InventoryResourcesComponent } from './inventory-resources/inventory-resources.component';
import { InventoryServicesComponent } from './inventory-services/inventory-services.component';
import { ProductInventoryPaths } from './product-inventory.paths';

const { segments } = ProductInventoryPaths;

export const productInventoryRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: segments.products },
  { path: segments.products, component: InventoryProductsComponent },
  { path: segments.services, component: InventoryServicesComponent },
  { path: segments.resources, component: InventoryResourcesComponent },
];
