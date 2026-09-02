import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';

@Component({
  selector: 'app-offer-preview-modal',
  templateUrl: './offer-preview-modal.component.html',
})
export class OfferPreviewModalComponent {
  protected readonly faXmark = faXmark;

  @Input() previewProductOff: any;
  @Output() closed = new EventEmitter<void>();

  activeTab: 'details' | 'card' = 'details';

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.activeTab = 'details';
    this.closed.emit();
  }
}
