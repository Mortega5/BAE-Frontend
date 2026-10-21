import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { CatalogsComponent } from './catalogs.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ThemeService } from 'src/app/services/theme.service';
import { environment } from 'src/environments/environment';

describe('CatalogsComponent', () => {
  let component: CatalogsComponent;
  let fixture: ComponentFixture<CatalogsComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiServiceService>;
  let accServiceSpy: jasmine.SpyObj<AccountServiceService>;
  let themeServiceStub: { currentTheme$: Observable<any> };
  let routerSpy: jasmine.SpyObj<Router>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getLaunchedCatalogsPage']);
    apiServiceSpy.getLaunchedCatalogsPage.and.returnValue(Promise.resolve({ items: [], filteredPaginationToken: null }));

    accServiceSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['getOrgInfo']);
    accServiceSpy.getOrgInfo.and.returnValue(Promise.resolve({} as any));

    themeServiceStub = { currentTheme$: of(null) };

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [CatalogsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiServiceSpy },
        { provide: AccountServiceService, useValue: accServiceSpy },
        { provide: ThemeService, useValue: themeServiceStub },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should subscribe to the theme and request providers', () => {
    spyOn(component, 'getProviders');

    component.ngOnInit();

    expect(component.getProviders).toHaveBeenCalledWith(false);
    expect(component.marketplaceHomeUrl).toBe('/search');
  });

  it('ngOnInit should apply theme-driven header component and fallback logo when the theme emits', () => {
    const headerComponent = class {};
    themeServiceStub.currentTheme$ = of({
      name: 'dome',
      links: { marketplaceHomeUrl: '/dome-home' },
      catalogs: { sections: { header: headerComponent }, cards: { fallbackLogoUrl: 'assets/fallback.svg' } },
    } as any);

    component.ngOnInit();

    expect(component.marketplaceHomeUrl).toBe('/dome-home');
    expect(component.catalogsHeaderComponent).toBe(headerComponent);
    expect(component.defaultCatalogLogoUrl).toBe('assets/fallback.svg');
  });

  it('ngOnInit should fall back to the theme logo when the theme has no catalogs fallback logo', () => {
    themeServiceStub.currentTheme$ = of({
      name: 'bae',
      assets: { defaultLogoUrl: 'assets/themes/bae/bae-logo.svg' },
    } as any);

    component.ngOnInit();

    expect(component.defaultCatalogLogoUrl).toBe('assets/themes/bae/bae-logo.svg');
  });

  it('ngOnInit should reset filter and reload providers when the search field is cleared', () => {
    spyOn(component, 'getProviders');
    component.searchField.setValue('seed');

    component.ngOnInit();
    expect(component.getProviders).toHaveBeenCalledWith(false);

    component.filter = 'seed';
    component.searchField.setValue('');

    expect(component.filter).toBeUndefined();
    expect(component.getProviders).toHaveBeenCalledTimes(2);
  });

  it('getProviders should load the first page, filter out the default catalog and prefetch the next page when a token is returned', async () => {
    const defaultCatalog = { id: environment.DFT_CATALOG_ID, name: 'Default' } as any;
    const customCatalog = { id: 'custom-cat', name: 'Custom', description: 'desc' } as any;
    const nextCatalog = { id: 'next-cat', name: 'Next' } as any;

    apiServiceSpy.getLaunchedCatalogsPage.and.callFake((page: any) => {
      if (page === 0) return Promise.resolve({ items: [defaultCatalog, customCatalog], filteredPaginationToken: 'tok-1' });
      return Promise.resolve({ items: [nextCatalog], filteredPaginationToken: null });
    });

    await component.getProviders(false);
    await flushPromises();

    expect(apiServiceSpy.getLaunchedCatalogsPage).toHaveBeenCalledTimes(2);
    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.argsFor(0)).toEqual([0, undefined, component.CATALOG_LIMIT, null, null, '-lastUpdate']);
    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.argsFor(1)).toEqual([component.CATALOG_LIMIT, undefined, component.CATALOG_LIMIT, 'tok-1', null, '-lastUpdate']);

    expect(component.providers.map(p => p.id)).toEqual(['custom-cat']);
    expect(component.totalCount).toBe(1);
    expect(component.page).toBe(component.CATALOG_LIMIT * 2);
    expect(component.page_check).toBeTrue();
    expect(component.loading).toBeFalse();
    expect(component.loading_more).toBeFalse();
  });

  it('getProviders should show the owner from relatedParty and then fill name and logo from the organization once per owner', async () => {
    const owner = { id: 'urn:ngsi-ld:organization:o1', role: 'Seller', name: 'Owner (relatedParty)' };
    apiServiceSpy.getLaunchedCatalogsPage.and.returnValue(Promise.resolve({
      items: [
        { id: 'c1', name: 'Cat 1', relatedParty: [owner] },
        { id: 'c2', name: 'Cat 2', relatedParty: [owner] },
      ],
      filteredPaginationToken: null,
    }));
    let resolveOrg!: (org: any) => void;
    accServiceSpy.getOrgInfo.and.returnValue(new Promise(resolve => { resolveOrg = resolve; }));

    await component.getProviders(false);

    expect(component.providers.map(p => p.owner)).toEqual(['Owner (relatedParty)', 'Owner (relatedParty)']);
    expect(accServiceSpy.getOrgInfo).toHaveBeenCalledTimes(1);

    resolveOrg({
      tradingName: 'Owner Org',
      partyCharacteristic: [{ name: 'logo', value: 'logo.png' }],
    });
    await flushPromises();

    expect(component.providers.map(p => [p.owner, p.logo])).toEqual([
      ['Owner Org', 'logo.png'],
      ['Owner Org', 'logo.png'],
    ]);
  });

  it('getProviders should page with limit/offset and expose the total when the proxy returns X-Total-Count and no token', async () => {
    const limit = component.CATALOG_LIMIT;
    const page = (from: number, n: number) => Array.from({ length: n }, (_, i) => ({ id: `c${from + i}`, name: `Cat ${from + i}` }));
    apiServiceSpy.getLaunchedCatalogsPage.and.returnValues(
      Promise.resolve({ items: page(0, limit), filteredPaginationToken: null, total: limit + 1 }),
      Promise.resolve({ items: page(limit, 1), filteredPaginationToken: null, total: limit + 1 }),
    );

    await component.getProviders(false);

    expect(component.catalogTotal).toBe(limit + 1);
    expect(component.totalCount).toBe(limit);
    expect(component.page_check).toBeTrue();

    await component.next();

    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.argsFor(1)).toEqual([limit, undefined, limit, null, null, '-lastUpdate']);
    expect(component.totalCount).toBe(limit + 1);
    expect(component.page_check).toBeFalse();
  });

  it('getProviders should not count the hidden default catalog in the total', async () => {
    apiServiceSpy.getLaunchedCatalogsPage.and.returnValue(Promise.resolve({
      items: [{ id: environment.DFT_CATALOG_ID, name: 'Default' }, { id: 'c1', name: 'Cat 1' }],
      filteredPaginationToken: null,
      total: 2,
    }));

    await component.getProviders(false);

    expect(component.totalCount).toBe(1);
    expect(component.catalogTotal).toBe(1);
  });

  it('getProviders should keep the total unknown when the proxy pages with a filtered-pagination token', async () => {
    apiServiceSpy.getLaunchedCatalogsPage.and.returnValue(Promise.resolve({ items: [{ id: 'c1' }], filteredPaginationToken: 'tok', total: 40 }));

    await component.getProviders(false);

    expect(component.catalogTotal).toBeNull();
  });

  it('getProviders should skip requesting the next page while already loading more', async () => {
    component.page_check = true;
    component.loading_more = true;

    await component.getProviders(true);

    expect(apiServiceSpy.getLaunchedCatalogsPage).not.toHaveBeenCalled();
  });

  it('next should reveal the buffered page and keep prefetching while a token remains', async () => {
    const firstCatalog = { id: 'cat-1', name: 'First' } as any;
    const secondCatalog = { id: 'cat-2', name: 'Second' } as any;
    const thirdCatalog = { id: 'cat-3', name: 'Third' } as any;

    apiServiceSpy.getLaunchedCatalogsPage.and.returnValues(
      Promise.resolve({ items: [firstCatalog], filteredPaginationToken: 'tok-1' }),
      Promise.resolve({ items: [secondCatalog], filteredPaginationToken: 'tok-2' }),
    );
    await component.getProviders(false);
    await flushPromises();

    expect(component.providers.map(p => p.id)).toEqual(['cat-1']);
    expect(component.page_check).toBeTrue();

    apiServiceSpy.getLaunchedCatalogsPage.and.returnValue(
      Promise.resolve({ items: [thirdCatalog], filteredPaginationToken: null }),
    );

    await component.next();
    await flushPromises();

    expect(apiServiceSpy.getLaunchedCatalogsPage).toHaveBeenCalledTimes(3);
    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.argsFor(2)).toEqual([component.CATALOG_LIMIT * 2, undefined, component.CATALOG_LIMIT, 'tok-2', null, '-lastUpdate']);
    expect(component.providers.map(p => p.id)).toEqual(['cat-1', 'cat-2']);
    expect(component.page_check).toBeTrue();
  });

  it('filterProviders should trim the search value and reload from the first page', () => {
    spyOn(component, 'getProviders');
    component.searchField.setValue('  my-catalog  ');

    component.filterProviders();

    expect(component.filter).toBe('my-catalog');
    expect(component.getProviders).toHaveBeenCalledWith(false);
  });

  it('toggleSortDropdown should flip the dropdown visibility', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);

    component.toggleSortDropdown(event);
    expect(component.showSortDropdown).toBeTrue();

    component.toggleSortDropdown(event);
    expect(component.showSortDropdown).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalledTimes(2);
  });

  it('selectSort should update the sort option, close the dropdown and reload providers', () => {
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);
    spyOn(component, 'getProviders');

    component.selectSort('name_asc', event);

    expect(component.sortOption).toBe('name_asc');
    expect(component.showSortDropdown).toBeFalse();
    expect(component.getProviders).toHaveBeenCalledWith(false);
  });

  it('getProviders should ask the backend to sort by the selected option instead of sorting client-side', async () => {
    component.sortOption = 'name_asc';
    await component.getProviders(false);
    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.mostRecent().args[5]).toBe('name');

    component.sortOption = 'name_desc';
    await component.getProviders(false);
    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.mostRecent().args[5]).toBe('-name');

    component.sortOption = 'recent';
    await component.getProviders(false);
    expect(apiServiceSpy.getLaunchedCatalogsPage.calls.mostRecent().args[5]).toBe('-lastUpdate');
  });

  it('next should request the next page of providers', () => {
    spyOn(component, 'getProviders').and.returnValue(Promise.resolve());

    component.next();

    expect(component.getProviders).toHaveBeenCalledWith(true);
  });

  it('goToProvider should navigate to the catalogue search route', () => {
    component.goToProvider('cat-123');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search/catalogue', 'cat-123']);
  });

  it('onClick should close an open sort dropdown', () => {
    component.showSortDropdown = true;
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(component.showSortDropdown).toBeFalse();
    expect(cdrSpy).toHaveBeenCalled();
  });

  it('onClick should do nothing when the sort dropdown is closed', () => {
    component.showSortDropdown = false;
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');

    component.onClick();

    expect(cdrSpy).not.toHaveBeenCalled();
  });

});
