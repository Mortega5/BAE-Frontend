import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { OfferPreviewModalComponent } from './offer-preview-modal.component';

describe('OfferPreviewModalComponent', () => {
  let fixture: ComponentFixture<OfferPreviewModalComponent>;
  let component: OfferPreviewModalComponent;
  const tabs = () => fixture.nativeElement.querySelectorAll('button.border-b-\\[3px\\]');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OfferPreviewModalComponent],
      imports: [TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(OfferPreviewModalComponent);
    component = fixture.componentInstance;
    component.previewProductOff = { id: 'preview', name: 'Offer' };
  });

  it('shows the details and the card tabs, starting on the details', () => {
    fixture.detectChanges();

    expect(tabs().length).toBe(2);
    expect(component.activeTab).toBe('details');
    expect(fixture.nativeElement.querySelector('[data-cy=createConfirmDesc]')).toBeNull();
  });

  it('only asks what to do with the offer, with nothing to preview, when the product does not exist yet', () => {
    component.confirmOnly = true;
    component.submitMode = 'create';
    fixture.detectChanges();

    expect(tabs().length).toBe(0);
    expect(fixture.nativeElement.querySelector('app-product-details')).toBeNull();
    expect(fixture.nativeElement.querySelector('bae-off-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy=createConfirmDesc]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy=previewSaveDraft]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[data-cy=confirmPublish]')).not.toBeNull();
  });
});
