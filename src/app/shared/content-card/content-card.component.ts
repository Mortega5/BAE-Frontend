import { Component, Input } from '@angular/core';

export type ContentCardVariant = 'panel' | 'modal';

/** Shared white/dark box used to consolidate the many near-duplicate
 * `bg-white dark:bg-secondary-100 rounded-2xl border ... shadow-*` boxes scattered
 * across steppers, drawers and modals. Adopt incrementally when touching a file,
 * not as a one-shot sweep — same approach as ButtonComponent. */
@Component({
  selector: 'app-card',
  standalone: true,
  templateUrl: './content-card.component.html',
  styleUrl: './content-card.component.scss',
})
export class ContentCardComponent {
  @Input() variant: ContentCardVariant = 'panel';
}
