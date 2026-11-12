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

  /** The product the offer sells does not exist yet (a dataset or an API is made when the offer is saved), so there is nothing real to
   * preview: the modal only asks whether to save the offer as a draft or to publish it. */
  @Input() confirmOnly = false;

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
