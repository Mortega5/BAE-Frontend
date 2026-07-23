import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { Router } from '@angular/router';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { PriceServiceService } from 'src/app/services/price-service.service';

import { SellerOfferComponent } from './seller-offer.component';
import { SellerOfferingsPaths } from '../../seller-offerings.paths';

describe('SellerOfferComponent', () => {
  let component: SellerOfferComponent;
  let fixture: ComponentFixture<SellerOfferComponent>;
  let messages$: Subject<any>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let priceServiceSpy: jasmine.SpyObj<PriceServiceService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;

  beforeEach(async () => {
    messages$ = new Subject<any>();
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getProductOfferByOwnerPaged']);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    priceServiceSpy = jasmine.createSpyObj<PriceServiceService>('PriceServiceService', ['isCustomOffering']);
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      [],
      { messages$: messages$.asObservable() }
    );

    priceServiceSpy.isCustomOffering.and.resolveTo(false);
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      organizations: [],
    } as any);

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerOfferComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: PriceServiceService, useValue: priceServiceSpy },
      ]
    })
    .overrideComponent(SellerOfferComponent, {
      set: { template: '' },
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellerOfferComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should call initOffers', () => {
    const initSpy = spyOn(component, 'initOffers');

    component.ngOnInit();

    expect(initSpy).toHaveBeenCalled();
  });

  it('constructor subscription should call initOffers on ChangedSession message', () => {
    const initSpy = spyOn(component, 'initOffers');

    messages$.next({ type: 'ChangedSession' });

    expect(initSpy).toHaveBeenCalled();
  });

  it('ngOnDestroy should unsubscribe from ChangedSession stream', () => {
    const initSpy = spyOn(component, 'initOffers');
    component.ngOnDestroy();

    messages$.next({ type: 'ChangedSession' });

    expect(initSpy).not.toHaveBeenCalled();
  });

  it('initOffers should set partyId from user login and refresh the table', () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      organizations: [],
    } as any);
    const refreshSpy = jasmine.createSpy('refresh');
    (component as any).paginatedTable = { refresh: refreshSpy };

    component.initOffers();

    expect(component.partyId).toBe('party-user');
    expect(refreshSpy).toHaveBeenCalledWith(true);
  });

  it('initOffers should set partyId from logged organization', () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      organizations: [{ id: 'org-1', partyId: 'party-org' }],
    } as any);
    const refreshSpy = jasmine.createSpy('refresh');
    (component as any).paginatedTable = { refresh: refreshSpy };

    component.initOffers();

    expect(component.partyId).toBe('party-org');
    expect(refreshSpy).toHaveBeenCalledWith(true);
  });

  it('fetchOffers should request paginated items and build customMap', async () => {
    component.partyId = 'party-user';
    const offers = [{ id: 'off-1' }, { id: 'off-2' }];
    apiSpy.getProductOfferByOwnerPaged.and.resolveTo({
      items: offers,
      total: 2,
    } as any);
    priceServiceSpy.isCustomOffering.and.callFake(async (offer: any) => offer.id === 'off-1');

    const params = { limit: 10, offset: 0 };
    const result = await component.fetchOffers(params, { status: ['Active'] });

    expect(apiSpy.getProductOfferByOwnerPaged).toHaveBeenCalledWith(
      params,
      component.filter,
      ['Active'],
      'party-user',
      component.isBundle
    );
    expect(result.items).toBe(offers);
    expect(priceServiceSpy.isCustomOffering).toHaveBeenCalledTimes(2);
    expect(component.customMap['off-1']).toBeTrue();
    expect(component.customMap['off-2']).toBeFalse();
  });

  it('onTypeChange should set isBundle and refresh the table', () => {
    const refreshSpy = jasmine.createSpy('refresh');
    (component as any).paginatedTable = { refresh: refreshSpy };

    component.onTypeChange({ target: { value: 'simple' } });
    expect(component.isBundle).toBeFalse();

    component.onTypeChange({ target: { value: 'bundle' } });
    expect(component.isBundle).toBeTrue();

    component.onTypeChange({ target: { value: 'all' } });
    expect(component.isBundle).toBeUndefined();

    expect(refreshSpy).toHaveBeenCalledTimes(3);
    expect(refreshSpy).toHaveBeenCalledWith(true);
  });

  it('goToCreate should navigate to the new offer route', () => {
    component.goToCreate();
    expect(routerSpy.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.offers.new()]);
  });

  it('goToUpdate should navigate to the offer edit route', () => {
    component.goToUpdate('off-1');
    expect(routerSpy.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.offers.edit('off-1')]);
  });

  it('goToCreateCustom should navigate to the custom offer route with offer id and party id', () => {
    component.goToCreateCustom({ offer: { id: 'off-2' }, partyId: 'party-9' });

    expect(routerSpy.navigate).toHaveBeenCalledWith(
      [SellerOfferingsPaths.offers.custom()],
      { queryParams: { offerId: 'off-2', partyId: 'party-9' } }
    );
  });

  it('hasLongWord should detect words above threshold', () => {
    expect(component.hasLongWord('short words only', 10)).toBeFalse();
    expect(component.hasLongWord('containsaveryverylongword here', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
