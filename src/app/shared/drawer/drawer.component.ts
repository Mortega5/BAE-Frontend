import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';

/** Shared backdrop + sliding side-panel shell, consolidating the near-duplicate
 * drawer markup (opacity-animated backdrop + translate-x sliding panel) that had
 * accumulated across the cart/price-plan drawers, each with its own background.
 * Adopt incrementally when touching a file, not as a one-shot sweep — same
 * approach as ContentCardComponent. */
@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [NgClass],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent {
  @Input() isOpen = false;
  /** Tailwind width classes for the sliding panel. */
  @Input() widthClass = 'w-full max-w-[520px]';
  /** Tailwind z-index class shared by the backdrop and the panel — the panel
   * still paints above the backdrop because it comes after it in the DOM. */
  @Input() zIndexClass = 'z-[60]';
  /** Tailwind classes placing/sizing the panel vertically, e.g. to sit below a
   * fixed header instead of flush with the viewport top. */
  @Input() insetClass = 'top-0 h-screen';
  /** Tailwind classes for the panel's own inner layout (padding/overflow/flex),
   * left to the consumer since some drawers need a pinned footer instead of a
   * single scrolling area. */
  @Input() panelClass = 'p-4 overflow-y-auto';
  @Output() closed = new EventEmitter<void>();
}
