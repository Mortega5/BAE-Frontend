import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { SellerOfferingsPaths } from './seller-offerings.paths';

import { SellerOfferingsComponent } from './seller-offerings.component';

describe('SellerOfferingsComponent', () => {
  let component: SellerOfferingsComponent;
  let fixture: ComponentFixture<SellerOfferingsComponent>;
  let httpMock: HttpTestingController;
  let api: ApiServiceService;
  let quoteServiceSpy: jasmine.SpyObj<QuoteService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    quoteServiceSpy = jasmine.createSpyObj<QuoteService>('QuoteService', ['getQuoteById']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate'], { events: of(), url: '/my-offerings/offers' });
    localStorageSpy.getObject.and.returnValue({});

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SellerOfferingsComponent],
      imports: [HttpClientTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: QuoteService, useValue: quoteServiceSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: {} },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(SellerOfferingsComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiServiceService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loadCounts should do nothing when no party can be resolved from local storage', async () => {
    localStorageSpy.getObject.and.returnValue({});
    spyOn(api, 'getSoftwareResourceByUserPaged');

    await (component as any).loadCounts();

    httpMock.expectNone(() => true);
    expect(api.getSoftwareResourceByUserPaged).not.toHaveBeenCalled();
  });

  it('loadCounts should load every section count for the resolved party', async () => {
    localStorageSpy.getObject.and.returnValue({ id: 'user-1', logged_as: 'user-1', partyId: 'party-1' });
    spyOn(api, 'getSoftwareResourceByUserPaged').and.returnValue(Promise.resolve({ items: [], total: 3 }));

    const loadPromise = (component as any).loadCounts();

    httpMock.expectOne(req => req.url.includes('/productOffering') && req.urlWithParams.includes('relatedParty.id=party-1'))
      .flush([{ id: 'offer-1' }, { id: 'offer-2' }]);
    httpMock.expectOne(req => req.url.includes('/catalog/catalog') && req.urlWithParams.includes('relatedParty.id=party-1'))
      .flush([{ id: 'catalog-1' }]);
    httpMock.expectOne(req => req.url.includes('/productSpecification')).flush([]);
    httpMock.expectOne(req => req.url.includes('/serviceSpecification')).flush([{ id: 'serv-1' }]);
    httpMock.expectOne(req => req.url.includes('/resourceSpecification')).flush([]);

    await loadPromise;

    expect(component.productOffersCount).toBe(2);
    expect(component.catalogsCount).toBe(1);
    expect(component.productSpecsCount).toBe(0);
    expect(component.serviceSpecsCount).toBe(1);
    expect(component.resourceSpecsCount).toBe(0);
    expect(component.softwaresCount).toBe(3);
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
