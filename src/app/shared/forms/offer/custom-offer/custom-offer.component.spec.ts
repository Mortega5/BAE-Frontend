import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { CustomOfferComponent } from './custom-offer.component';

describe('CustomOfferComponent', () => {
  let component: CustomOfferComponent;
  let fixture: ComponentFixture<CustomOfferComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [CustomOfferComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CustomOfferComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the preview before creating, then creates the offer with the status chosen there', () => {
    const create = spyOn(component, 'createOffer').and.resolveTo();
    const preview = spyOn(component.submitPreviewRequested, 'emit');
    component.offer = {
      name: 'Base offer', description: 'desc', category: [{ id: 'cat-1' }],
      productOfferingTerm: [{ name: 'License', description: 'terms' }],
    };
    component.productOfferForm.patchValue({ partyInfo: { tradingName: 'Acme' } });

    component.askPublishOrDraft();
    expect(preview).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Base offer - Acme',
      productOfferingTerm: jasmine.arrayContaining([{ name: 'License', description: 'terms' }]),
    }));
    expect(create).not.toHaveBeenCalled();

    component.publish();
    expect(create).toHaveBeenCalledWith('Launched');

    component.saveDraft();
    expect(create).toHaveBeenCalledWith('Active');
  });
});
