import { IconName } from '@fortawesome/fontawesome-svg-core';

export interface SideNavItem {
  /** i18n key, resolved via `| translate` in the template. */
  label: string;
  /** Required unless `onClick` is set instead. */
  routerLink?: string | string[];
  /** Alternative to `routerLink` for a non-navigational item — e.g.
   * user-profile's "payment dashboard" / "LEAR" buttons, which fetch a URL
   * and open it in a new tab. Renders as a <button> instead of an <a>, and
   * never gets an active state (there's no route for it to match). */
  onClick?: () => void;
  /** Resolved via `findButtonIcon` in popular-icons.ts — same registry app-button uses. */
  icon?: IconName;
  /** Passed to [routerLinkActiveOptions] — defaults to {exact: false}. Ignored for `onClick` items. */
  exact?: boolean;
  dataCy?: string;
}

export interface SideNavSection {
  /** Optional i18n key for a small uppercase divider label above this group of items. */
  label?: string;
  /** Turns the label into a toggle that shows/hides the items. Needs `label`; defaults to false (always shown). */
  collapsible?: boolean;
  /** Initial state of a `collapsible` section: true starts it collapsed, unless the current page is one of its items.
   * Defaults to false (expanded). */
  defaultCollapsed?: boolean;
  items: SideNavItem[];
}
