import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { AdminPaths } from './admin.paths';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnDestroy {
  readonly paths = AdminPaths;

  isListView = true;

  private destroy$ = new Subject<void>();

  constructor(private router: Router) {
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.updateIsListView());
    this.updateIsListView();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateIsListView() {
    const path = this.router.url.split('?')[0];
    this.isListView = /^\/admin\/[a-zA-Z-]+\/?$/.test(path);
  }

  readonly sections: SideNavSection[] = [
    {
      label: 'ADMIN._group_catalog',
      items: [
        { label: 'ADMIN._defaultCatalog', routerLink: this.paths.defaultCatalog(), dataCy: 'adminDefaultCatalogSection' },
        { label: 'ADMIN._categories', routerLink: this.paths.categories.list(), dataCy: 'adminCategoriesSection' },
      ],
    },
    {
      label: 'ADMIN._group_business',
      items: [
        { label: 'ADMIN._verification', routerLink: this.paths.verification() },
        { label: 'ADMIN._revenue', routerLink: this.paths.revenue() },
      ],
    },
    {
      label: 'ADMIN._group_config',
      items: [
        { label: 'ADMIN._email', routerLink: this.paths.email() },
        { label: 'ADMIN._analytics', routerLink: this.paths.analytics(), dataCy: 'adminAnalyticsSection' },
        { label: 'ADMIN._searchFilters', routerLink: this.paths.searchFilters(), dataCy: 'adminSearchFiltersSection' },
        { label: 'ADMIN._features', routerLink: this.paths.features(), dataCy: 'adminFeaturesSection' },
      ],
    },
  ];
}
