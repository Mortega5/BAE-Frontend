import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';

import { CatalogsComponent } from './catalogs.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ThemeService } from 'src/app/services/theme.service';
import { environment } from 'src/environments/environment';

describe('CatalogsComponent', () => {
  let component: CatalogsComponent;
  let fixture: ComponentFixture<CatalogsComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiServiceService>;
  let paginationServiceSpy: jasmine.SpyObj<PaginationService>;
  let accServiceSpy: jasmine.SpyObj<AccountServiceService>;
  let themeServiceStub: { currentTheme$: Observable<any> };
  let routerSpy: jasmine.SpyObj<Router>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', ['getCatalogsWithLimit']);
    apiServiceSpy.getCatalogsWithLimit.and.returnValue(Promise.resolve([] as any));

    paginationServiceSpy = jasmine.createSpyObj<PaginationService>('PaginationService', ['getItemsPaginated']);
    paginationServiceSpy.getItemsPaginated.and.returnValue(
      Promise.resolve({
        page_check: true,
        items: [],
        nextItems: [],
        page: 0,
      }),
    );

    accServiceSpy = jasmine.createSpyObj<AccountServiceService>('AccountServiceService', ['getOrgInfo']);
    accServiceSpy.getOrgInfo.and.returnValue(Promise.resolve({} as any));

    themeServiceStub = { currentTheme$: of(null) };

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [CatalogsComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiServiceSpy },
        { provide: PaginationService, useValue: paginationServiceSpy },
        { provide: AccountServiceService, useValue: accServiceSpy },
        { provide: ThemeService, useValue: themeServiceStub },
        { provide: Router, useValue: routerSpy },
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

  it('getProviders should call pagination service, filter out the default catalog and map to providers', async () => {
    const defaultCatalog = { id: environment.DFT_CATALOG_ID, name: 'Default' } as any;
    const customCatalog = { id: 'custom-cat', name: 'Custom', description: 'desc' } as any;

    paginationServiceSpy.getItemsPaginated.and.returnValue(
      Promise.resolve({
        page_check: false,
        items: [defaultCatalog, customCatalog],
        nextItems: [{ id: 'next-cat' }],
        page: 3,
      }),
    );

    await component.getProviders(false);
    await flushPromises();

    const args = paginationServiceSpy.getItemsPaginated.calls.mostRecent().args;
    expect(args[0]).toBe(0);
    expect(args[1]).toBe(component.CATALOG_LIMIT);
    expect(args[2]).toBeFalse();
    expect(args[5]).toEqual({ keywords: undefined });
    expect(typeof args[6]).toBe('function');

    expect(component.page_check).toBeFalse();
    expect(component.page).toBe(3);
    expect(component.providers.map(p => p.id)).toEqual(['custom-cat']);
    expect(component.totalCount).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.loading_more).toBeFalse();
  });

  it('getProviders should skip requesting the next page while already loading more', async () => {
    component.page_check = true;
    component.loading_more = true;

    await component.getProviders(true);

    expect(paginationServiceSpy.getItemsPaginated).not.toHaveBeenCalled();
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

  it('selectSort should update the sort option, close the dropdown and re-apply the view', async () => {
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);
    paginationServiceSpy.getItemsPaginated.and.returnValue(
      Promise.resolve({
        page_check: false,
        items: [{ id: 'b', name: 'Beta' }, { id: 'a', name: 'Alpha' }],
        nextItems: [],
        page: 0,
      }),
    );
    await component.getProviders(false);

    component.selectSort('name_asc', event);

    expect(component.sortOption).toBe('name_asc');
    expect(component.showSortDropdown).toBeFalse();
    expect(component.providers.map(p => p.name)).toEqual(['Alpha', 'Beta']);
  });

  it('next should request the next page of providers', () => {
    spyOn(component, 'getProviders');

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

  it('isDefaultLogo should compare against the theme-provided fallback logo', () => {
    component.defaultCatalogLogoUrl = 'assets/fallback.svg';

    expect(component.isDefaultLogo('assets/fallback.svg')).toBeTrue();
    expect(component.isDefaultLogo('assets/other.svg')).toBeFalse();
    expect(component.isDefaultLogo(undefined)).toBeFalse();
  });

  it('hasLongWord should detect words over threshold and handle undefined values', () => {
    expect(component.hasLongWord('short words only', 20)).toBeFalse();
    expect(component.hasLongWord('this_contains_a_reallyreallyreallylongtoken', 10)).toBeTrue();
    expect(component.hasLongWord(undefined, 10)).toBeFalse();
  });
});
