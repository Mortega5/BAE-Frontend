import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, TemplateRef, ViewChild, ViewContainerRef, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { filter } from 'rxjs/operators';

/** Slide-out duration, kept in sync with the panel's `duration-300` class. */
const SLIDE_MS = 300;

/** Shared backdrop + sliding side-panel shell, consolidating the near-duplicate
 * drawer markup (opacity-animated backdrop + translate-x sliding panel) that had
 * accumulated across the cart/price-plan drawers, each with its own background.
 * Adopt incrementally when touching a file, not as a one-shot sweep — same
 * approach as ContentCardComponent.
 *
 * The panel is rendered through a CDK overlay, so it lives in the overlay
 * container on <body> only while open: it can't be clipped or mispositioned by a
 * transformed ancestor (e.g. a carousel track) and the CDK handles the backdrop,
 * Escape and scroll blocking. */
@Component({
  selector: 'app-drawer',
  standalone: true,
  imports: [NgClass],
  templateUrl: './drawer.component.html',
  styleUrl: './drawer.component.scss',
})
export class DrawerComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  /** Tailwind width classes for the sliding panel. */
  @Input() widthClass = 'w-full max-w-[520px]';
  /** Tailwind z-index class for the panel, relative to other content of its own overlay. */
  @Input() zIndexClass = 'z-[60]';
  /** Tailwind classes placing/sizing the panel vertically, e.g. to sit below a
   * fixed header instead of flush with the viewport top. */
  @Input() insetClass = 'top-0 h-screen';
  /** Tailwind classes for the panel's own inner layout (padding/overflow/flex),
   * left to the consumer since some drawers need a pinned footer instead of a
   * single scrolling area. */
  @Input() panelClass = 'p-4 overflow-y-auto';
  /** Emits when the user asks to close it (backdrop click or Escape). */
  @Output() closed = new EventEmitter<void>();

  @ViewChild('panel', { static: true }) private panel!: TemplateRef<unknown>;

  /** Drives the slide: false while the panel is mounted off-screen. */
  protected readonly shown = signal(false);

  private readonly overlay = inject(Overlay);
  private readonly viewContainer = inject(ViewContainerRef);
  private overlayRef: OverlayRef | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      this.isOpen ? this.open() : this.close();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  private open(): void {
    clearTimeout(this.timer);
    if (!this.overlayRef) {
      const ref = this.overlay.create({
        positionStrategy: this.overlay.position().global(),
        hasBackdrop: true,
        backdropClass: 'bg-overlay',
        scrollStrategy: this.overlay.scrollStrategies.block(),
      });
      ref.backdropClick().subscribe(() => this.closed.emit());
      ref.keydownEvents().pipe(filter(e => e.key === 'Escape')).subscribe(() => this.closed.emit());
      ref.attach(new TemplatePortal(this.panel, this.viewContainer));
      this.overlayRef = ref;
    }
    // Let the panel mount off-screen first so the slide-in transition runs.
    requestAnimationFrame(() => this.shown.set(this.isOpen));
  }

  private close(): void {
    if (!this.overlayRef) return;
    this.shown.set(false);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.overlayRef?.dispose();
      this.overlayRef = null;
    }, SLIDE_MS);
  }
}
