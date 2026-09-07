import { Component, EventEmitter, Input, Output } from '@angular/core';

/** Shared visual shell for a media-first tile — a full-bleed cover image plus
 * freeform projected content (name, description, badges, actions...) below or
 * beside it. Supports a vertical `grid` tile (image on top) and a horizontal
 * `list` row (image on the side), mirroring app-item-card's role for this
 * specific "product/offering tile" pattern. Purely presentational — content
 * and semantics are left to the caller; the whole card emits `cardClick` when
 * `clickable`, so any projected element that needs its own action (a button,
 * a secondary link) should call `$event.stopPropagation()` to opt out. */
@Component({
  selector: 'app-tile-card',
  standalone: true,
  templateUrl: './tile-card.component.html',
  styleUrl: './tile-card.component.scss',
})
export class TileCardComponent {
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() image?: string;
  @Input() imageAlt = '';
  @Input() clickable = false;
  @Output() cardClick = new EventEmitter<void>();

  onCardClick(): void {
    if (this.clickable) this.cardClick.emit();
  }
}
