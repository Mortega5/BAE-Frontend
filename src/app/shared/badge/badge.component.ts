import {Component, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faAddressCard} from "@fortawesome/sharp-solid-svg-icons";
import {faCloud} from "@fortawesome/pro-solid-svg-icons";
import {components} from "../../models/product-catalog";
type Category = components["schemas"]["Category"];

export type BadgeStatus = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** Maps the TMF `lifecycleStatus` vocabulary (Active/Launched/Retired/Obsolete —
 * see LIFECYCLE_STATUSES in form-field.model.ts) to a bae-badge status color,
 * for the many admin/catalog tables that show it. Obsolete shares Retired's
 * color since they now share the same display label ("Deleted") — see
 * lifecycleStatusLabel below. */
export function lifecycleStatusBadgeVariant(status: string): BadgeStatus {
  switch (status) {
    case 'Active': return 'info';
    case 'Launched': return 'success';
    case 'Retired':
    case 'Obsolete':
      return 'warning';
    default: return 'neutral';
  }
}

const LIFECYCLE_STATUS_LABELS: Record<string, string> = {
  Active: 'LIFECYCLE_STATUS._draft',
  Launched: 'LIFECYCLE_STATUS._published',
  Retired: 'LIFECYCLE_STATUS._deleted',
  Obsolete: 'LIFECYCLE_STATUS._deleted',
};

/** i18n key for the user-facing word for a `lifecycleStatus` wire value — the
 * backend vocabulary (Active/Launched/Retired/Obsolete) never changes, but
 * nobody outside engineering should see those words: Active reads as "Draft",
 * Launched as "Published", and Retired/Obsolete both as "Deleted" (Obsolete is
 * a legacy value old records may still carry; it's no longer offered as a
 * pickable target — see buildLifecycleStatusOptions). Always pipe the result
 * through `| translate`. */
export function lifecycleStatusLabel(status: string): string {
  return LIFECYCLE_STATUS_LABELS[status] ?? status;
}

/** Expands a selected lifecycleStatus filter value into every wire value it
 * should match — 'Retired' also pulls in the legacy 'Obsolete' value, since
 * both are shown as a single "Deleted" checkbox in filter UIs (there's no
 * separate 'Obsolete' filter option any more). */
export function expandLifecycleStatusFilter(values: string[]): string[] {
  return values.flatMap(value => value === 'Retired' ? ['Retired', 'Obsolete'] : [value]);
}

/** Maps the resource operational-status vocabulary (standby/available/suspended/unknown —
 * see RESOURCE_STATUS_TYPES in software.model.ts) to a bae-badge status color. */
export function resourceStatusBadgeVariant(status: string): BadgeStatus {
  switch (status) {
    case 'standby': return 'info';
    case 'available': return 'success';
    case 'suspended': return 'warning';
    case 'unknown': return 'danger';
    default: return 'neutral';
  }
}

/** Maps a TMF product order's `state` to a bae-badge status color. */
export function orderStateBadgeVariant(state: string): BadgeStatus {
  switch (state) {
    case 'inProgress':
    case 'acknowledged':
      return 'info';
    case 'completed':
      return 'success';
    case 'partial':
    case 'pending':
      return 'warning';
    case 'failed':
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** Maps a product order item's `action` (add/modify/delete) to a bae-badge status color. */
export function orderItemActionBadgeVariant(action: string): BadgeStatus {
  switch (action) {
    case 'add': return 'info';
    case 'delete': return 'danger';
    case 'modify': return 'warning';
    default: return 'neutral';
  }
}

@Component({
  selector: 'bae-badge',
  standalone: true,
  imports: [FaIconComponent],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.css'
})
export class BadgeComponent {
  @Input() category:Category = {name:'Default'}
  /** 'tag' (default) keeps the existing icon + solid-color pill used for categories.
   * 'status' renders a colored dot + label instead — for state indicators (active,
   * suspended...) that shouldn't compete visually with actual category tags.
   * 'plain' is a neutral pill with just colored text — for metadata (version...)
   * that isn't a state but still wants a semantic color when it needs one. */
  @Input() variant: 'tag' | 'status' | 'plain' = 'tag';
  @Input() status: BadgeStatus = 'neutral';
  @Input() label = '';
    protected readonly faAddressCard = faAddressCard;
  protected readonly faCloud = faCloud;
}
