import { DOCUMENT, NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, HostListener, Inject, Input, OnDestroy, Renderer2 } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowUpRightFromSquare, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { SideNavItem, SideNavSection } from './side-nav.model';

/** Shared sidebar-nav + content shell, consolidating the near-identical
 * "desktop sidebar list + mobile off-canvas drawer + router-outlet" layout
 * duplicated across seller-offerings, product-orders, product-inventory,
 * and admin. Adopt incrementally, same approach as
 * app-button/app-card. The page's own content (typically a <router-outlet>)
 * is projected in, not owned by this component. */
@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, RouterLinkActive, FaIconComponent, TranslateModule],
  templateUrl: './side-nav.component.html',
})
export class SideNavComponent implements OnDestroy {
  @Input() sections: SideNavSection[] = [];
  /** i18n key for the heading shown above the desktop list and inside the
   * mobile drawer (omit for no heading). */
  @Input() title?: string;
  /** i18n key for the hamburger button's accessible label (falls back to a
   * generic "Menu" when omitted). */
  @Input() mobileLabel?: string;
  /** Hides the desktop sidebar list (and its heading), leaving the mobile
   * hamburger/drawer untouched — my-offerings collapses to a single,
   * full-width column while creating/editing an item but keeps the mobile
   * nav reachable throughout. Defaults to true (always shown). */
  @Input() showDesktopSidebar = true;
  /** Names this menu in the browser's storage, where the sections the user folded are kept for the next visit. Give
   * every menu its own, and keep it even if the title changes. Falls back to the title; with neither, the folds are
   * not kept. */
  @Input() storageKey?: string;

  protected mobileMenuOpen = false;
  /** Shown next to the label of every `onClick` item — those open an
   * external URL in a new tab rather than navigating within the app. */
  protected readonly externalLinkIcon = faArrowUpRightFromSquare;
  protected readonly chevronIcon = faChevronDown;
  /** What the user toggled in this visit, by section label. */
  private readonly collapsedByUser = new Map<string, boolean>();
  /** What the user left collapsed in earlier visits, by section label; read once, when first needed. */
  private savedCollapsed?: Record<string, boolean>;

  constructor(
    private localStorage: LocalStorageService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  @HostListener('document:keydown.escape')
  protected onEscape() {
    this.closeMobileMenu();
  }

  /** Guards against a body-scroll-lock leak if this instance is torn down
   * (e.g. the page it's on is navigated away from) while the drawer is open. */
  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'overflow-hidden');
  }

  protected openMobileMenu() {
    this.mobileMenuOpen = true;
    this.renderer.addClass(this.document.body, 'overflow-hidden');
  }

  protected closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.renderer.removeClass(this.document.body, 'overflow-hidden');
  }

  protected isCollapsed(section: SideNavSection): boolean {
    if (!section.collapsible || !section.label) return false;
    const byUser = this.collapsedByUser.get(section.label);
    if (byUser !== undefined) return byUser;
    // Without a choice of the user in this visit, the one of the last visit stands, then the section's own default.
    // Either way, a section that starts collapsed opens on its own while the page being shown is one of its items
    const initial = this.saved()[section.label] ?? section.defaultCollapsed ?? false;
    return initial && !section.items.some(item => this.isItemActive(item));
  }

  /** Same match the item's `routerLinkActive` does, for items that are not rendered while their section is collapsed. */
  private isItemActive(item: SideNavItem): boolean {
    if (!item.routerLink) return false;
    const tree = this.router.createUrlTree(Array.isArray(item.routerLink) ? item.routerLink : [item.routerLink], { relativeTo: this.route });
    return this.router.isActive(tree, { paths: item.exact ? 'exact' : 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' });
  }

  protected toggleSection(section: SideNavSection) {
    const collapsed = !this.isCollapsed(section);
    this.collapsedByUser.set(section.label!, collapsed);
    this.saved()[section.label!] = collapsed;
    this.persist();
  }

  /** Each menu keeps its own folds, told apart by its key (or title); none for a menu with neither, so unnamed menus
   * never share them. */
  private get storageName(): string | null {
    const name = this.storageKey ?? this.title;
    return name ? `side_nav_collapsed:${name}` : null;
  }

  private saved(): Record<string, boolean> {
    if (!this.savedCollapsed) {
      try {
        const name = this.storageName;
        this.savedCollapsed = (name && (this.localStorage.getObject(name) as Record<string, boolean>)) || {};
      } catch {
        this.savedCollapsed = {};
      }
    }
    return this.savedCollapsed;
  }

  /** The storage may be unavailable (private window, blocked site data): the folds then last only the visit. */
  private persist(): void {
    const name = this.storageName;
    if (!name) return;
    try {
      this.localStorage.setObject(name, this.saved());
    } catch { /* kept in memory only */ }
  }

  protected resolvedIcon(name?: string) {
    return name ? findButtonIcon(name) : undefined;
  }
}
