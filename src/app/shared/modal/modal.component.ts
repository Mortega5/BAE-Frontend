import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

/** Generic backdrop + centered app-card(variant="modal") wrapper, consolidating the
 * fixed inset-0/backdrop/stopPropagation boilerplate that was hand-rolled at every
 * call site. Projects [appCardHeader]/default/[appCardFooter] straight through to
 * the app-card underneath, same slots callers already used directly. */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [ContentCardComponent],
  templateUrl: './modal.component.html',
})
export class ModalComponent {
  @Input() visible = false;
  /** Tailwind width class(es) applied to the modal box, e.g. 'max-w-lg', 'max-w-7xl'. */
  @Input() width = 'max-w-lg';
  /** Set false to keep the modal open on Escape (e.g. a nested confirm must resolve first). */
  @Input() closeOnEscape = true;
  /** Backdrop click, Escape, or whatever else the caller wires to dismiss without resolving. */
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible && this.closeOnEscape) this.closed.emit();
  }
}
