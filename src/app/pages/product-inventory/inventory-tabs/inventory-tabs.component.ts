import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TabDirective } from 'src/app/shared/tabs/tab.directive';
import { TabsComponent } from 'src/app/shared/tabs/tabs.component';
import { ProductInventoryPaths } from '../product-inventory.paths';

/** The tabs of the inventory (products, services, resources), to put inside the card of each list. They share the
 * width of the card and open the routed list of the chosen kind. */
@Component({
  selector: 'app-inventory-tabs',
  standalone: true,
  imports: [TabsComponent, TabDirective, TranslateModule],
  template: `
    <app-tabs [activeTab]="active" (activeTabChange)="onTabChange($event)" [fullWidth]="true">
      <ng-template appTab="PRODUCT_INVENTORY._products" [tabId]="segments.products" dataCy="inventoryProducts"></ng-template>
      <ng-template appTab="PRODUCT_INVENTORY._services" [tabId]="segments.services"></ng-template>
      <ng-template appTab="PRODUCT_INVENTORY._resources" [tabId]="segments.resources"></ng-template>
    </app-tabs>
  `,
})
export class InventoryTabsComponent {
  /** The segment of the list the tabs are in. */
  @Input() active: string = ProductInventoryPaths.segments.products;

  readonly segments = ProductInventoryPaths.segments;

  constructor(private router: Router) {}

  onTabChange(tab: string) {
    this.router.navigateByUrl(`${ProductInventoryPaths.root()}/${tab}`);
  }
}
