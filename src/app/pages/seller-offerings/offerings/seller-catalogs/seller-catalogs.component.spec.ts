import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule } from '@ngx-translate/core';

import { Router } from '@angular/router';
import { SellerOfferingsPaths } from '../../seller-offerings.paths';
import { SellerCatalogsComponent } from './seller-catalogs.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { EventMessageService } from 'src/app/services/event-message.service';

describe('SellerCatalogsComponent', () => {
  let component: SellerCatalogsComponent;
  let fixture: ComponentFixture<SellerCatalogsComponent>;
  let router: Router;
  let api: ApiServiceService;
  let localStorage: LocalStorageService;
  let eventMessage: EventMessageService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      declarations: [SellerCatalogsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SellerCatalogsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    api = TestBed.inject(ApiServiceService);
    localStorage = TestBed.inject(LocalStorageService);
    eventMessage = TestBed.inject(EventMessageService);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('goToCreate should emit seller create catalog event', () => {
    spyOn(router, 'navigate');

    component.goToCreate();

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.catalogues.new()]);
  });

  it('goToUpdate should emit seller update catalog event', () => {
    const cat = { id: 'cat-1' };
    spyOn(router, 'navigate');

    component.goToUpdate(cat.id);

    expect(router.navigate).toHaveBeenCalledWith([SellerOfferingsPaths.catalogues.edit(cat.id)]);
  });

  it('initCatalogs should resolve the partyId for a directly logged-in user', () => {
    spyOn(localStorage, 'getObject').and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user-1',
      organizations: []
    });

    component.initCatalogs();

    expect(component.partyId).toBe('party-user-1');
  });

  it('initCatalogs should resolve the partyId for the currently impersonated organization', () => {
    spyOn(localStorage, 'getObject').and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      organizations: [{ id: 'org-1', partyId: 'party-org-1' }]
    });

    component.initCatalogs();

    expect(component.partyId).toBe('party-org-1');
  });

  it('a ChangedSession event should reload the catalogs for the new party', () => {
    spyOn(localStorage, 'getObject').and.returnValues(
      { id: 'user-1', logged_as: 'user-1', partyId: 'party-user-1', organizations: [] },
      { id: 'user-1', logged_as: 'org-2', organizations: [{ id: 'org-2', partyId: 'party-org-2' }] }
    );
    component.initCatalogs();
    expect(component.partyId).toBe('party-user-1');

    eventMessage.emitChangedSession({});

    expect(component.partyId).toBe('party-org-2');
  });

  it('fetchCatalogs should request catalogs for the resolved party filtered by status', async () => {
    component.partyId = 'party-1';
    component.filter = { name: 'cloud' };
    const getCatalogsSpy = spyOn(api, 'getCatalogsByUserPaged').and.returnValue(
      Promise.resolve({ items: [], total: 0 })
    );

    await component.fetchCatalogs({ limit: 10, offset: 0 }, { status: ['Active', 'Launched'] });

    expect(getCatalogsSpy).toHaveBeenCalledWith(
      { limit: 10, offset: 0 },
      { name: 'cloud' },
      ['Active', 'Launched'],
      'party-1'
    );
  });

  it('fetchCatalogs should default the status filter to an empty list when none is selected', async () => {
    component.partyId = 'party-1';
    const getCatalogsSpy = spyOn(api, 'getCatalogsByUserPaged').and.returnValue(
      Promise.resolve({ items: [], total: 0 })
    );

    await component.fetchCatalogs({ limit: 10, offset: 0 }, {});

    expect(getCatalogsSpy).toHaveBeenCalledWith({ limit: 10, offset: 0 }, undefined, [], 'party-1');
  });

  it('hasLongWord should detect long words and handle undefined', () => {
    expect(component.hasLongWord('short words', 20)).toBeFalse();
    expect(component.hasLongWord('averyveryverylongword', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
