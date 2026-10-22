import { Component, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { EventMessageService } from 'src/app/services/event-message.service';
import { SideNavItem, SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { ADMIN_SECTION_ORDER, AdminSection, adminSectionUrl, canManageCategories, canOpenAdminSection } from './admin.access';
import { AdminPaths } from './admin.paths';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnDestroy {
  readonly paths = AdminPaths;

  isListView = true;

  sections: SideNavSection[] = [];

  private destroy$ = new Subject<void>();

  constructor(private router: Router, private auth: AuthGuard, private eventMessage: EventMessageService) {
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.updateIsListView());
    this.updateIsListView();

    this.sections = this.buildSections();
    // Switching session (personal <-> org) changes the active roles without a navigation,
    // so the route guards don't re-run: rebuild the nav and leave a section that's no longer allowed.
    this.eventMessage.messages$
      .pipe(
        filter(ev => ev.type === 'ChangedSession'),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.sections = this.buildSections();
        if (!this.canOpenCurrentSection()) {
          this.router.navigateByUrl(this.paths.root());
        } else if (this.onForbiddenCategoryWrite()) {
          this.router.navigateByUrl(this.paths.categories.list());
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateIsListView() {
    const path = this.router.url.split('?')[0];
    this.isListView = new RegExp(`^${this.paths.root()}/[a-zA-Z-]+/?$`).test(path);
  }

  private canOpenCurrentSection(): boolean {
    const path = this.router.url.split('?')[0];
    const current = ADMIN_SECTION_ORDER.find(section => path.startsWith(adminSectionUrl(section)));
    return !current || canOpenAdminSection(this.auth, current);
  }

  /** On a category create/update page in a session that can no longer write categories. */
  private onForbiddenCategoryWrite(): boolean {
    const path = this.router.url.split('?')[0];
    return path.startsWith(`${this.paths.categories.list()}/`) && !canManageCategories(this.auth);
  }

  /** Side-nav sections, minus the items (and then empty groups) the active session can't open. */
  private buildSections(): SideNavSection[] {
    const item = (section: AdminSection, label: string, dataCy?: string): SideNavItem[] =>
      canOpenAdminSection(this.auth, section)
        ? [{ label, routerLink: adminSectionUrl(section), ...(dataCy ? { dataCy } : {}) }]
        : [];

    const sections: SideNavSection[] = [
      {
        label: 'ADMIN._group_catalog',
        items: [
          ...item('defaultCatalog', 'ADMIN._defaultCatalog', 'adminDefaultCatalogSection'),
          ...item('categories', 'ADMIN._categories', 'adminCategoriesSection'),
        ],
      },
      {
        label: 'ADMIN._group_business',
        items: [
          ...item('verification', 'ADMIN._verification'),
        ],
      },
      {
        label: 'ADMIN._group_config',
        items: [
          ...item('email', 'ADMIN._email'),
          ...item('analytics', 'ADMIN._analytics', 'adminAnalyticsSection'),
          ...item('searchFilters', 'ADMIN._searchFilters', 'adminSearchFiltersSection'),
          ...item('features', 'ADMIN._features', 'adminFeaturesSection'),
        ],
      },
    ];

    return sections.filter(section => section.items.length > 0);
  }
}
