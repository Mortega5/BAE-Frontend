import { Component, Input } from '@angular/core';

/** Shared visual shell for a single row/tile in a list — a billing address, a cart
 * line item, a price tier, etc. Purely presentational: it owns the resting/hover/
 * selected look (driven by the --card-* theme tokens in styles.css, so it always
 * matches the current theme's brand color instead of a fixed hue) and leaves
 * everything else — content, semantics (role/tabindex), click handling — to the
 * caller, which can bind those directly onto this component's host tag. */
@Component({
  selector: 'app-item-card',
  standalone: true,
  templateUrl: './item-card.component.html',
  styleUrl: './item-card.component.scss',
})
export class ItemCardComponent {
  @Input() selected = false;
  @Input() clickable = false;
}
