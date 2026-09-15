import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { environment } from 'src/environments/environment';
import { SellerOfferingsPaths } from './seller-offerings.paths';

import { SellerOfferingsComponent } from './seller-offerings.component';

describe('SellerOfferingsComponent', () => {
  let component: SellerOfferingsComponent;
  let fixture: ComponentFixture<SellerOfferingsComponent>;
  let quoteServiceSpy: jasmine.SpyObj<QuoteService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    quoteServiceSpy = jasmine.createSpyObj<QuoteService>('QuoteService', ['getQuoteById']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate'], { events: of(), url: '/my-offerings/offers' });

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SellerOfferingsComponent],
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: QuoteService, useValue: quoteServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: {} },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(SellerOfferingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should navigate to the custom offer route when a quoteId is present in history state', async () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({ quoteId: 'quote-1' });
    quoteServiceSpy.getQuoteById.and.returnValue(of({
      quoteItem: [{ productOffering: { id: 'offer-1' } }],
      relatedParty: [{ id: 'buyer-1', role: environment.BUYER_ROLE }],
    } as any));

    await component.ngOnInit();

    expect(quoteServiceSpy.getQuoteById).toHaveBeenCalledWith('quote-1');
    expect(routerSpy.navigate).toHaveBeenCalledWith(
      [SellerOfferingsPaths.segments.offers, SellerOfferingsPaths.segments.custom],
      { relativeTo: TestBed.inject(ActivatedRoute), queryParams: { offerId: 'offer-1', partyId: 'buyer-1' } }
    );
  });

  it('ngOnInit should not fetch a quote when history state has no quoteId', async () => {
    spyOnProperty(history, 'state', 'get').and.returnValue({});

    await component.ngOnInit();

    expect(quoteServiceSpy.getQuoteById).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
