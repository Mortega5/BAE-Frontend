import { Component } from '@angular/core';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { ProductInventoryPaths } from './product-inventory.paths';

@Component({
  selector: 'app-product-inventory',
  templateUrl: './product-inventory.component.html',
  styleUrl: './product-inventory.component.css'
})
export class ProductInventoryComponent {
  readonly paths = ProductInventoryPaths;

  readonly sections: SideNavSection[] = [
    {
      items: [
        { label: 'PRODUCT_INVENTORY._products', routerLink: this.paths.products(), dataCy: 'inventoryProducts' },
        { label: 'PRODUCT_INVENTORY._services', routerLink: this.paths.services() },
        { label: 'PRODUCT_INVENTORY._resources', routerLink: this.paths.resources() },
      ],
    },
  ];
}
