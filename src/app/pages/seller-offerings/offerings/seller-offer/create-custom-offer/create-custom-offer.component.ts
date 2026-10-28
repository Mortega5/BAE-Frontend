import { Component, ViewChild } from '@angular/core';
import { LeaveConfirmable } from 'src/app/guard/unsaved-changes.guard';
import { CustomOfferComponent } from 'src/app/shared/forms/offer/custom-offer/custom-offer.component';

/** Route page for a custom (tailored) offer: hosts the standalone form plus the offer preview,
 * which can only live in the app module, shown before the offer is published or saved. */
@Component({
  selector: 'create-custom-offer',
  templateUrl: './create-custom-offer.component.html',
})
export class CreateCustomOfferComponent implements LeaveConfirmable {
  @ViewChild(CustomOfferComponent) private customOffer?: CustomOfferComponent;
  previewProductOff: any = null;

  confirmLeave(): boolean | Promise<boolean> {
    return this.customOffer?.confirmLeave() ?? true;
  }

  onPreviewSubmitted(action: 'draft' | 'publish' | 'update'): void {
    this.previewProductOff = null;
    if (action === 'publish') this.customOffer?.publish();
    else this.customOffer?.saveDraft();
  }
}
