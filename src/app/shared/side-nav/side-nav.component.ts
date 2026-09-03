import { DOCUMENT, NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, HostListener, Inject, Input, OnDestroy, Renderer2 } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { SideNavSection } from './side-nav.model';

/** Shared sidebar-nav + content shell, consolidating the near-identical
 * "desktop sidebar list + mobile off-canvas drawer + router-outlet" layout
 * duplicated across seller-offerings, product-orders, product-inventory,
 * admin and usage-specs. Adopt incrementally, same approach as
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

  protected mobileMenuOpen = false;
  /** Shown next to the label of every `onClick` item — those open an
   * external URL in a new tab rather than navigating within the app. */
  protected readonly externalLinkIcon = faArrowUpRightFromSquare;

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
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

  protected resolvedIcon(name?: string) {
    return name ? findButtonIcon(name) : undefined;
  }
}
