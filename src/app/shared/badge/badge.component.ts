import {Component, Input} from '@angular/core';
import { CommonModule } from '@angular/common';
import {faAddressCard} from "@fortawesome/sharp-solid-svg-icons";
import {faCloud} from "@fortawesome/pro-solid-svg-icons";
import {components} from "../../models/product-catalog";
type Category = components["schemas"]["Category"];

export type BadgeStatus = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'bae-badge',
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
