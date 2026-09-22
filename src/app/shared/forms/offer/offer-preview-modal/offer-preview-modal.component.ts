import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-offer-preview-modal',
  templateUrl: './offer-preview-modal.component.html',
})
export class OfferPreviewModalComponent {

  @Input() previewProductOff: any;
  @Output() closed = new EventEmitter<void>();

  activeTab: 'details' | 'card' = 'details';

  close(): void {
    this.activeTab = 'details';
    this.closed.emit();
  }
}
