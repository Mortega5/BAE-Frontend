import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';

import { SearchComponent } from './search.component';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { LocalStorageService } from '../../services/local-storage.service';
import { EventMessageService } from '../../services/event-message.service';
import { SearchStateService } from '../../services/search-state.service';
import { LoginServiceService } from 'src/app/services/login-service.service';
import { ThemeService } from 'src/app/services/theme.service';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let apiSpy: jasmine.SpyObj<ApiServiceService>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;
  let stateMock: {
    products: any[];
    page: number;
    page_check: boolean;
    total: number;
    keywords: string | undefined;
    selectedCategoryId: string | null;
    selectedCatalogId: string | null;
    activeCategoryName: string | null;
    offerTab: 'public' | 'private';
    publicPage: number;
    privatePage: number;
    hasState: jasmine.Spy;
    save: jasmine.Spy;
    clear: jasmine.Spy;
  };
  let routerSpy: jasmine.SpyObj<Router>;
  let routeParamGetSpy: jasmine.Spy;
  let routeQueryParams: Record<string, string>;
  let messages$: Subject<any>;
  let routerEvents$: Subject<any>;

  const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(async () => {
    apiSpy = jasmine.createSpyObj<ApiServiceService>('ApiServiceService', [
      'getProductsDetails',
      'getOfferingsPaged',
      'getCategoriesByParentId',
      'getDefaultCategories',
      'getCatalogsPaged',
    ]);
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', [
      'getObject',
      'getValidLoginInfo',
      'getItem',
      'removeItem',
      'setItem',
      'setObject',
    ]);
    eventMessageSpy = {} as jasmine.SpyObj<EventMessageService>;
    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate'], {
      events: undefined,
    });
    messages$ = new Subject<any>();
    (eventMessageSpy as any).messages$ = messages$.asObservable();

    routerEvents$ = new Subject<any>();
    Object.defineProperty(routerSpy, 'events', { value: routerEvents$.asObservable() });

    routeParamGetSpy = jasmine.createSpy('paramMap.get').and.returnValue(null);
    routeQueryParams = {};

    stateMock = {
      products: [],
      page: 0,
      page_check: true,
      total: 0,
      keywords: undefined,
      selectedCategoryId: null,
      selectedCatalogId: null,
      activeCategoryName: null,
      offerTab: 'public',
      publicPage: 1,
      privatePage: 1,
      hasState: jasmine.createSpy('hasState').and.returnValue(false),
      save: jasmine.createSpy('save'),
      clear: jasmine.createSpy('clear'),
    };

    apiSpy.getOfferingsPaged.and.resolveTo({ items: [], total: 0 });
    apiSpy.getProductsDetails.and.callFake(async (items: any[]) => items as any);
    apiSpy.getDefaultCategories.and.resolveTo([]);
    apiSpy.getCategoriesByParentId.and.resolveTo([]);
    apiSpy.getCatalogsPaged.and.resolveTo({ items: [], total: 0 });
    localStorageSpy.getObject.and.callFake((key: string) => {
      if (key === 'login_items') return {};
      if (key === 'feedback') return {};
      return {};
    });
    localStorageSpy.getItem.and.returnValue(null);
    localStorageSpy.getValidLoginInfo.and.returnValue(null);
    spyOn(window, 'scrollTo');

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [SearchComponent],
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: ApiServiceService, useValue: apiSpy },
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
        { provide: SearchStateService, useValue: stateMock },
        { provide: LoginServiceService, useValue: {} },
        { provide: ThemeService, useValue: { currentTheme$: new Subject<any>().asObservable() } },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: routeParamGetSpy },
              queryParamMap: { get: (key: string) => routeQueryParams[key] ?? null },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    routerEvents$.complete();
    messages$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('constructor should close feedback when CloseFeedback event arrives', () => {
    component.feedback = true;

    messages$.next({ type: 'CloseFeedback' });

    expect(component.feedback).toBeFalse();
  });

  it('ngOnInit should mark navigation target on router navigation events', async () => {
    await component.ngOnInit();

    routerEvents$.next(new NavigationStart(1, '/search/urn:ngsi-ld:product-offering:1'));
    expect((component as any).navigatingToDetail).toBeTrue();

    routerEvents$.next(new NavigationStart(2, '/search'));
    expect((component as any).navigatingToDetail).toBeFalse();
  });

  describe('non-AI mode', () => {
    beforeEach(() => {
      });

    it('ngOnInit should load category/catalog options and both offering sections', async () => {
      localStorageSpy.getValidLoginInfo.and.returnValue({ id: 'u1', logged_as: 'u1', partyId: 'party-1', organizations: [] } as any);
      apiSpy.getDefaultCategories.and.resolveTo([{ id: 'cat-1', name: 'Cat 1' }] as any);
      apiSpy.getCatalogsPaged.and.resolveTo({ items: [{ id: 'catalog-1', name: 'Catalog 1' }], total: 1 });
      apiSpy.getOfferingsPaged.and.callFake(async (opts: any) => {
        return opts.visibility === 'private'
          ? { items: [{ id: 'priv-1' }], total: 1 }
          : { items: [{ id: 'pub-1' }], total: 1 };
      });

      await component.ngOnInit();
      await flushPromises();

      expect(component.categoryOptions).toEqual([{ value: 'cat-1', label: 'Cat 1' }]);
      expect(component.catalogOptions).toEqual([{ value: 'catalog-1', label: 'Catalog 1' }]);
      expect(component.publicItems).toEqual([{ id: 'pub-1' }] as any);
      expect(component.privateItems).toEqual([{ id: 'priv-1' }] as any);
      expect(component.publicTotal).toBe(1);
      expect(component.privateTotal).toBe(1);
    });

    it('ngOnInit should take the filters from the URL and the saved pages from matching state', async () => {
      localStorageSpy.getValidLoginInfo.and.returnValue({ id: 'u1', logged_as: 'u1', partyId: 'party-1', organizations: [] } as any);
      apiSpy.getDefaultCategories.and.resolveTo([{ id: 'cat-1', name: 'Cat 1' }] as any);
      routeQueryParams = { category: 'cat-1', catalog: 'catalog-1', tab: 'private' };
      stateMock.hasState.and.returnValue(true);
      stateMock.selectedCategoryId = 'cat-1';
      stateMock.selectedCatalogId = 'catalog-1';
      stateMock.publicPage = 2;
      stateMock.privatePage = 3;

      await component.ngOnInit();
      await flushPromises();

      expect(component.selectedCategoryId).toBe('cat-1');
      expect(component.selectedCatalogId).toBe('catalog-1');
      expect(component.activeCategoryName).toBe('Cat 1');
      expect(component.offerTab).toBe('private');
      // Restoring saved state re-fetches every item up to the saved page in one
      // request (offset 0, limit = page * pageSize), not just that page's slice —
      // "load more" appends, so coming back needs the whole accumulated list.
      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith(jasmine.objectContaining({ offset: 0, limit: 2 * component.PUBLIC_LIMIT, visibility: 'public' }));
      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith(jasmine.objectContaining({ offset: 0, limit: 3 * component.PRIVATE_LIMIT, visibility: 'private' }));
    });

    it('loadPublicOfferings should request the right offset/limit and save state', async () => {
      apiSpy.getOfferingsPaged.and.resolveTo({ items: [{ id: 'p1' }], total: 25 });

      await component.loadPublicOfferings(2);

      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith({
        limit: 2 * component.PUBLIC_LIMIT,
        offset: 0,
        categoryIds: undefined,
        catalogId: undefined,
        keywords: undefined,
        visibility: 'public',
      });
      expect(component.publicItems).toEqual([{ id: 'p1' }] as any);
      expect(component.publicTotal).toBe(25);
      expect(component.publicPage).toBe(2);
      expect(stateMock.save).toHaveBeenCalled();
    });

    it('loadPrivateOfferings should request the right offset/limit when logged in', async () => {
      localStorageSpy.getValidLoginInfo.and.returnValue({ id: 'u1', logged_as: 'u1', partyId: 'party-1', organizations: [] } as any);
      apiSpy.getOfferingsPaged.and.resolveTo({ items: [{ id: 'p1' }], total: 3 });

      await component.loadPrivateOfferings(1);

      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith({
        limit: component.PRIVATE_LIMIT,
        offset: 0,
        categoryIds: undefined,
        catalogId: undefined,
        keywords: undefined,
        visibility: 'private',
      });
      expect(component.privateItems).toEqual([{ id: 'p1' }] as any);
      expect(component.privateTotal).toBe(3);
    });

    it('loadPrivateOfferings should skip the request entirely when logged out', async () => {
      localStorageSpy.getValidLoginInfo.and.returnValue(null);
      component.privateItems = [{ id: 'stale' }] as any;
      component.privateTotal = 5;

      await component.loadPrivateOfferings(1);

      expect(apiSpy.getOfferingsPaged).not.toHaveBeenCalled();
      expect(component.privateItems).toEqual([]);
      expect(component.privateTotal).toBe(0);
    });

    it('loadMorePublicOfferings should do nothing once every item is already loaded', async () => {
      component.publicItems = [{ id: 'p1' }] as any;
      component.publicTotal = component.publicItems.length; // nothing left to load
      apiSpy.getOfferingsPaged.calls.reset();

      await component.loadMorePublicOfferings();

      expect(apiSpy.getOfferingsPaged).not.toHaveBeenCalled();
    });

    it('loadMorePublicOfferings should append the next chunk after what is already shown', async () => {
      component.publicItems = [{ id: 'p1' }] as any;
      component.publicTotal = component.PUBLIC_LIMIT * 3;
      component.publicPage = 1;
      apiSpy.getOfferingsPaged.and.resolveTo({ items: [{ id: 'p2' }], total: component.PUBLIC_LIMIT * 3 });

      await component.loadMorePublicOfferings();

      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith(jasmine.objectContaining({
        limit: component.PUBLIC_LIMIT,
        offset: 1, // one item already loaded
      }));
      expect(component.publicPage).toBe(2);
      expect(component.publicItems).toEqual([{ id: 'p1' }, { id: 'p2' }] as any);
    });

    it('onCategoryChange should set the filter and refresh both sections', async () => {
      component.categoryOptions = [{ value: 'cat-1', label: 'Cat 1' }];
      apiSpy.getOfferingsPaged.calls.reset();
      apiSpy.getOfferingsPaged.and.resolveTo({ items: [], total: 0 });

      await component.onCategoryChange('cat-1');

      expect(component.selectedCategoryId).toBe('cat-1');
      expect(component.activeCategoryName).toBe('Cat 1');
      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith(jasmine.objectContaining({ categoryIds: ['cat-1'], offset: 0 }));
    });

    it('onCatalogChange should set the filter and refresh both sections', async () => {
      apiSpy.getOfferingsPaged.calls.reset();
      apiSpy.getOfferingsPaged.and.resolveTo({ items: [], total: 0 });

      await component.onCatalogChange('catalog-1');

      expect(component.selectedCatalogId).toBe('catalog-1');
      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith(jasmine.objectContaining({ catalogId: 'catalog-1' }));
    });

    it('selectOfferTab should switch the active tab and persist state', () => {
      component.offerTab = 'public';

      component.selectOfferTab('private');

      expect(component.offerTab).toBe('private');
      expect(stateMock.save).toHaveBeenCalledWith(jasmine.objectContaining({ offerTab: 'private' }));
    });

    it('showOfferTabs should stay visible on the private tab even when it has no results', () => {
      component.privateTotal = 0;
      component.offerTab = 'public';
      expect(component.showOfferTabs).toBeFalse();
      component.offerTab = 'private';
      expect(component.showOfferTabs).toBeTrue();
    });

    it('hasPrivateOfferings should reflect privateTotal', () => {
      component.privateTotal = 0;
      expect(component.hasPrivateOfferings).toBeFalse();
      component.privateTotal = 2;
      expect(component.hasPrivateOfferings).toBeTrue();
    });

    it('onUnifiedSearch should set keywords, sync the URL and refresh both sections', async () => {
      component.searchField.setValue('kubernetes');
      const syncSpy = spyOn(component, 'syncUrl').and.stub();
      apiSpy.getOfferingsPaged.and.resolveTo({ items: [], total: 0 });

      await component.onUnifiedSearch();

      expect(component.keywords).toBe('kubernetes');
      expect(syncSpy).toHaveBeenCalled();
      expect(apiSpy.getOfferingsPaged).toHaveBeenCalledWith(jasmine.objectContaining({ keywords: 'kubernetes' }));
    });

    it('onUnifiedSearch should clear keywords when search field is empty', async () => {
      component.searchField.setValue('');
      spyOn(component, 'syncUrl').and.stub();

      await component.onUnifiedSearch();

      expect(component.keywords).toBeUndefined();
    });
  });

  it('syncUrl should write the search and non-default filters as query params', () => {
    component.keywords = 'ai';
    component.selectedCategoryId = 'cat-1';
    component.selectedCatalogId = null;
    component.offerTab = 'public';

    component.syncUrl();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/search'], {
      queryParams: { keyword: 'ai', category: 'cat-1', catalog: null, tab: null },
      replaceUrl: true,
    });
  });

  it('onClick should close drawer when open', () => {
    component.showDrawer = true;

    component.onClick();

    expect(component.showDrawer).toBeFalse();
  });

  it('ngOnDestroy should clear state when not navigating to detail', () => {
    (component as any).navigatingToDetail = false;

    component.ngOnDestroy();

    expect(stateMock.clear).toHaveBeenCalled();
  });

  it('ngOnDestroy should skip cleanup when navigating to product detail', () => {
    (component as any).navigatingToDetail = true;

    component.ngOnDestroy();

    expect(stateMock.clear).not.toHaveBeenCalled();
  });
});
