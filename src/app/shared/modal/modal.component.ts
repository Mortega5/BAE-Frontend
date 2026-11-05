import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { filter } from 'rxjs/operators';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';

/** Generic backdrop + centered app-card(variant="modal") wrapper, consolidating the
 * fixed inset-0/backdrop/stopPropagation boilerplate that was hand-rolled at every
 * call site. Projects [appCardHeader]/default/[appCardFooter] straight through to
 * the app-card underneath, same slots callers already used directly.
 *
 * Rendered through a CDK overlay while `visible`, so a transformed ancestor (e.g. a
 * carousel track) can't mispositon it; the CDK handles the backdrop, Escape and
 * scroll blocking. */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [ContentCardComponent],
  templateUrl: './modal.component.html',
})
export class ModalComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  /** Tailwind width class(es) applied to the modal box, e.g. 'max-w-lg', 'max-w-7xl'. */
  @Input() width = 'max-w-lg';
  /** Set false to keep the modal open on Escape (e.g. a nested confirm must resolve first). */
  @Input() closeOnEscape = true;
  /** Backdrop click, Escape, or whatever else the caller wires to dismiss without resolving. */
  @Output() closed = new EventEmitter<void>();

  @ViewChild('dialog', { static: true }) private dialog!: TemplateRef<unknown>;

  private readonly overlay = inject(Overlay);
  private readonly viewContainer = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']) {
      this.visible ? this.open() : this.close();
    }
  }

  ngOnDestroy(): void {
    this.close();
  }

  private open(): void {
    if (this.overlayRef) return;
    const ref = this.overlay.create({
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      hasBackdrop: true,
      backdropClass: 'bg-overlay',
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: '100%',
    });
    ref.backdropClick().subscribe(() => this.closed.emit());
    ref.keydownEvents()
      .pipe(filter(e => e.key === 'Escape' && this.closeOnEscape))
      .subscribe(() => this.closed.emit());
    ref.attach(new TemplatePortal(this.dialog, this.viewContainer));
    this.overlayRef = ref;
  }

  private close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }
}
