import { Component, AfterViewInit } from '@angular/core';
import { initFlowbite } from 'flowbite';
import { ProductInventoryPaths } from './product-inventory.paths';

@Component({
  selector: 'app-product-inventory',
  templateUrl: './product-inventory.component.html',
  styleUrl: './product-inventory.component.css'
})
export class ProductInventoryComponent implements AfterViewInit {
  readonly paths = ProductInventoryPaths;

  ngAfterViewInit() {
    initFlowbite();
  }
}
