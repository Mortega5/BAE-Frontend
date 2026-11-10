import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ProductInventoryPaths } from './product-inventory.paths';

/** Inventory page: one tab per kind (products, services, resources) over the routed list. */
@Component({
  selector: 'app-product-inventory',
  templateUrl: './product-inventory.component.html',
  styleUrl: './product-inventory.component.css'
})
export class ProductInventoryComponent implements OnDestroy {
  readonly paths = ProductInventoryPaths;
  readonly segments = ProductInventoryPaths.segments;

  activeTab: string = this.segments.products;
  /** The detail page of an item (`product-inventory/:id`) has no tabs. */
  showTabs = true;

  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.syncWithUrl());
    this.syncWithUrl();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(tab: string) {
    this.router.navigateByUrl(`${this.paths.root()}/${tab}`);
  }

  private syncWithUrl() {
    const path = this.router.url.split('?')[0].replace(/\/$/, '');
    const tab = Object.values(this.segments).find(segment => path === `${this.paths.root()}/${segment}`);
    this.showTabs = !!tab;
    if (tab) this.activeTab = tab;
  }
}
