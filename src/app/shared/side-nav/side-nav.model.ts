import { IconName } from '@fortawesome/fontawesome-svg-core';

export interface SideNavItem {
  /** i18n key, resolved via `| translate` in the template. */
  label: string;
  routerLink: string | string[];
  /** Resolved via `findButtonIcon` in popular-icons.ts — same registry app-button uses. */
  icon?: IconName;
  /** Live count badge. Omit (not 0) to hide the badge entirely — the caller
   * computes this however it needs to (one bulk call, several parallel calls,
   * or nothing), the component never fetches anything itself. */
  count?: number;
  /** Passed to [routerLinkActiveOptions] — defaults to {exact: false}. */
  exact?: boolean;
  dataCy?: string;
}

export interface SideNavSection {
  /** Optional i18n key for a small uppercase divider label above this group of items. */
  label?: string;
  items: SideNavItem[];
}
