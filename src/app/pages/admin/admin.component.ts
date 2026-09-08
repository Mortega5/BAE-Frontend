import { Component } from '@angular/core';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { AdminPaths } from './admin.paths';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent {
  readonly paths = AdminPaths;

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
