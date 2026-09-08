import {Component, Input} from '@angular/core';
import {FaIconComponent} from '@fortawesome/angular-fontawesome';
import {faAddressCard} from "@fortawesome/sharp-solid-svg-icons";
import {faCloud} from "@fortawesome/pro-solid-svg-icons";
import {components} from "../../models/product-catalog";
type Category = components["schemas"]["Category"];

export type BadgeStatus = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** Maps the TMF `lifecycleStatus` vocabulary (Active/Launched/Retired/Obsolete —
 * see LIFECYCLE_STATUSES in form-field.model.ts) to a bae-badge status color,
 * for the many admin/catalog tables that show it. */
export function lifecycleStatusBadgeVariant(status: string): BadgeStatus {
  switch (status) {
    case 'Active': return 'info';
    case 'Launched': return 'success';
    case 'Retired': return 'warning';
    case 'Obsolete': return 'danger';
    default: return 'neutral';
  }
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
