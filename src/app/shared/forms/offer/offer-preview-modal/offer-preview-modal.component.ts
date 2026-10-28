import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-offer-preview-modal',
  templateUrl: './offer-preview-modal.component.html',
})
export class OfferPreviewModalComponent {

  @Input() previewProductOff: any;
  /** Set when the preview is the last step before saving: shows the create (draft/publish) or update actions. */
  @Input() submitMode: 'create' | 'update' | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<'draft' | 'publish' | 'update'>();

  activeTab: 'details' | 'card' = 'details';

  submit(action: 'draft' | 'publish' | 'update'): void {
    this.activeTab = 'details';
    this.submitted.emit(action);
  }

  close(): void {
    this.activeTab = 'details';
    this.closed.emit();
  }
}
