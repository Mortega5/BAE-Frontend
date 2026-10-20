import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';

import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeedbackInfo } from 'src/app/models/interfaces';
import { LoginServiceService } from "src/app/services/login-service.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { Category } from "../../models/interfaces";
import { components } from "../../models/product-catalog";
import { EventMessageService } from "../../services/event-message.service";
import { LocalStorageService } from "../../services/local-storage.service";
import { SearchStateService } from "../../services/search-state.service";
type ProductOffering = components["schemas"]["ProductOffering"];

import { fetchAllPages } from 'src/app/models/pagination.model';
import { SelectOption } from 'src/app/models/formFields/form-field.model';
import { searchCategoriesConfig } from 'src/app/data/availableFilters';
import { AiSearchService } from 'src/app/services/ai-search.service';
import { ThemeService } from 'src/app/services/theme.service';

@Component({
  selector: 'bae-search',
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit, OnDestroy {

  loading: boolean = false;
  PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  DFT_CATALOG: String = environment.DFT_CATALOG_ID;
  showDrawer: boolean = false;
  searchEnabled = environment.SEARCH_ENABLED;
  keywords: any = undefined;
  searchField = new FormControl();
  feedback: boolean = false;
  providerThemeName = environment.providerThemeName;
  private navigatingToDetail = false;
  private destroy$ = new Subject<void>();

  viewMode: 'grid' | 'list' = 'grid';
  marketplaceHomeUrl = '/search';

  // Sidebar filters (non-AI mode)
  rootCategories: Category[] = [];
  categoryOptions: SelectOption[] = [];
  selectedCategoryId: string | null = null;
  activeCategoryName: string | null = null;
  catalogOptions: SelectOption[] = [];
  selectedCatalogId: string | null = null;
  // With catalog management off, catalogs aren't something buyers browse by — hide the filter
  // and never send a catalogId (a stale one could still be sitting in the saved search state).
  readonly catalogFilterEnabled: boolean = environment.CATALOG_MANAGEMENT_ENABLED;
  primaryCategoriesMode = searchCategoriesConfig.primaryCategoriesMode;
  primaryRootName = searchCategoriesConfig.primaryRootName;

  // Private offerings section (non-AI mode)
  privateItems: ProductOffering[] = [];
  privatePage = 1;
  privateTotal = 0;
  privateLoading = true;
  privateLoadingMore = false;
  privateOpen = true;
  readonly PRIVATE_LIMIT = 6;

  // Public offerings section (non-AI mode)
  publicItems: ProductOffering[] = [];
  publicPage = 1;
  publicTotal = 0;
  publicLoading = true;
  publicLoadingMore = false;
  readonly PUBLIC_LIMIT = 6;

  get publicHasMore(): boolean {
    return this.publicItems.length < this.publicTotal;
  }

  get privateHasMore(): boolean {
    return this.privateItems.length < this.privateTotal;
  }

  get hasPrivateOfferings(): boolean {
    return this.privateTotal > 0;
  }

  // AI Search properties (untouched — a separate, independent mode)
  aiSearchEnabled = environment.AI_SEARCH_ENABLED;
  aiAnswer: string = '';
  aiSearchLoading: boolean = false;
  aiTotalItems: number = 0;
  aiCurrentPage: number = 1;
  aiPageSize: number = environment.PRODUCT_LIMIT;
  products: ProductOffering[] = [];

  get aiTotalPages(): number {
    return Math.ceil(this.aiTotalItems / this.aiPageSize);
  }

  get totalResultsCount(): number {
    return this.aiTotalItems;
  }

  constructor(
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private loginService: LoginServiceService,
    private state: SearchStateService,
    private aiSearchService: AiSearchService,
    private themeService: ThemeService) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'CloseFeedback') {
          this.feedback = false;
        }
      })
  }

  async ngOnInit() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.marketplaceHomeUrl = theme?.links?.marketplaceHomeUrl || '/search';
      });

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          // Detecta navegación al detalle del producto
          if (event.url.startsWith('/search/urn:ngsi-ld:product-offering')) {
            this.navigatingToDetail = true;
          } else {
            this.navigatingToDetail = false;
          }
        }
      });

    if (this.route.snapshot.paramMap.get('keywords')) {
      this.keywords = this.route.snapshot.paramMap.get('keywords');
      this.searchField.setValue(this.keywords);
    }

    if (this.aiSearchEnabled) {
      // 1. Restaurar estado (modo IA)
      if (this.state.hasState()) {
        this.products = this.state.products;
        this.keywords = this.state.keywords;
        this.searchField.setValue(this.keywords);
        return;
      }

      if (this.keywords) {
        await this.runAiSearch();
      } else {
        await this.runInitialAiSearch();
      }
    } else {
      await this.loadCategoryOptions();
      if (this.catalogFilterEnabled) {
        await this.loadCatalogOptions();
      }

      // 1. Restaurar estado (modo estándar)
      if (this.state.hasState()) {
        this.selectedCategoryId = this.state.selectedCategoryId;
        this.selectedCatalogId = this.catalogFilterEnabled ? this.state.selectedCatalogId : null;
        this.activeCategoryName = this.state.activeCategoryName;
        this.privateOpen = this.state.privateOpen;
        await Promise.all([
          this.loadPublicOfferings(this.state.publicPage || 1),
          this.loadPrivateOfferings(this.state.privatePage || 1),
        ]);
      } else {
        await this.refreshOfferings();
      }
    }

    let input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', async e => {
        if (this.searchField.value == '') {
          this.keywords = undefined;
          this.updateQueryParams(this.keywords)
          this.aiAnswer = '';
          this.eventMessage.emitAiSearchCleared();
          if (this.aiSearchEnabled) {
            await this.runInitialAiSearch();
          } else {
            await this.refreshOfferings();
          }
        }
      });
    }
    setTimeout(() => {
      const userInfo = this.localStorage.getValidLoginInfo();

      // The user is logged in
      if (userInfo) {
        if (environment.feedbackCampaign) {
          let feedbackInfo = this.localStorage.getObject('feedback') as FeedbackInfo;

          if (JSON.stringify(feedbackInfo) === '{}') {
            let wantsFeedback = {
              "expire": environment?.feedbackCampaignExpiration ?? moment().add(1, 'week').unix(),
            }
            this.localStorage.setObject('feedback', wantsFeedback);
            this.feedback = true;
          } else {
            if ("expire" in feedbackInfo) {
              let expiration = feedbackInfo?.expire ?? 0
              if (((expiration - moment().unix()) - 4) < 0 && ((environment.feedbackCampaignExpiration - moment().unix()) - 4) > 0) {
                let wantsFeedback: FeedbackInfo = {
                  "expire": environment?.feedbackCampaignExpiration,
                }
                if ("approval" in feedbackInfo) {
                  wantsFeedback.approval = feedbackInfo.approval
                }
                this.localStorage.setObject('feedback', wantsFeedback)
              }
            } else {
              let wantsFeedback: FeedbackInfo = {
                "expire": environment?.feedbackCampaignExpiration,
              }
              if ("approval" in feedbackInfo) {
                wantsFeedback.approval = feedbackInfo.approval
              }
              this.localStorage.setObject('feedback', wantsFeedback)
            }

            if ("approval" in feedbackInfo) {
              this.feedback = false;
            } else {
              this.feedback = true;
            }

          }

        }
      }
    });
  }

  @HostListener('document:click')
  onClick() {
    if (this.showDrawer) {
      this.showDrawer = false;
    }
  }

  ngOnDestroy() {
    if (this.navigatingToDetail) {
      return;
    }
    this.state.clear();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ------------------------------------------------------------------
  // Sidebar filters (category + catalog)
  // ------------------------------------------------------------------

  private async loadCategoryOptions(): Promise<void> {
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];

      if (this.primaryCategoriesMode === 'catalogFirstLevel') {
        this.rootCategories = list;
      } else {
        const primaryRoot = list.find((c: any) => c?.name === this.primaryRootName);
        const children = primaryRoot?.id
          ? await this.api.getCategoriesByParentId(primaryRoot.id).catch(() => [])
          : [];
        this.rootCategories = Array.isArray(children) ? children : [];
      }

      this.categoryOptions = this.rootCategories
        .filter((c): c is Category & { id: string } => !!c.id)
        .map(c => ({ value: c.id, label: c.name ?? '' }));
    } catch {
      this.rootCategories = [];
      this.categoryOptions = [];
    }
  }

  private async loadCatalogOptions(): Promise<void> {
    try {
      const catalogs = await fetchAllPages(params => this.api.getCatalogsPaged(params));
      this.catalogOptions = catalogs
        .filter((c: any) => !!c?.id)
        .map((c: any) => ({ value: c.id, label: c.name ?? '' }));
    } catch {
      this.catalogOptions = [];
    }
  }

  async onCategoryChange(value: any): Promise<void> {
    this.selectedCategoryId = value ?? null;
    this.activeCategoryName = this.categoryOptions.find(o => o.value === value)?.label ?? null;
    await this.refreshOfferings();
  }

  async onCatalogChange(value: any): Promise<void> {
    this.selectedCatalogId = value ?? null;
    await this.refreshOfferings();
  }

  togglePrivateAccordion(): void {
    this.privateOpen = !this.privateOpen;
    this.saveStandardState();
  }

  // ------------------------------------------------------------------
  // Offerings loading (non-AI mode) — classic forward/backward pagination,
  // one independent page per section.
  // ------------------------------------------------------------------

  async refreshOfferings(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadPublicOfferings(1),
        this.loadPrivateOfferings(1),
      ]);
    } finally {
      this.loading = false;
    }
  }

  /** `append: true` (a "load more" click) fetches just the next chunk and appends it;
   * otherwise (initial load, filter change, or restoring saved state) it fetches every
   * item from the start up to `page` in one request and replaces the list. */
  async loadPublicOfferings(page: number, options?: { append?: boolean }): Promise<void> {
    const append = options?.append ?? false;
    if (append) {
      this.publicLoadingMore = true;
    } else {
      this.publicLoading = true;
    }
    try {
      const result = await this.api.getOfferingsPaged({
        limit: append ? this.PUBLIC_LIMIT : page * this.PUBLIC_LIMIT,
        offset: append ? this.publicItems.length : 0,
        categoryIds: this.selectedCategoryId ? [this.selectedCategoryId] : undefined,
        catalogId: this.selectedCatalogId ?? undefined,
        keywords: this.keywords,
        visibility: 'public',
      });
      const enriched = await this.api.getProductsDetails(result.items);
      this.publicItems = append ? [...this.publicItems, ...enriched] : enriched;
      this.publicTotal = result.total;
      this.publicPage = page;
      this.saveStandardState();
    } finally {
      if (append) {
        this.publicLoadingMore = false;
      } else {
        this.publicLoading = false;
      }
    }
  }

  async loadPrivateOfferings(page: number, options?: { append?: boolean }): Promise<void> {
    const append = options?.append ?? false;
    // Logged-out visitors can't have any private/ad-hoc offers targeted at them —
    // skip the request entirely rather than querying with no resolvable partyId.
    if (!this.localStorage.getValidLoginInfo()) {
      this.privateItems = [];
      this.privateTotal = 0;
      this.privatePage = 1;
      return;
    }
    if (append) {
      this.privateLoadingMore = true;
    } else {
      this.privateLoading = true;
    }
    try {
      const result = await this.api.getOfferingsPaged({
        limit: append ? this.PRIVATE_LIMIT : page * this.PRIVATE_LIMIT,
        offset: append ? this.privateItems.length : 0,
        categoryIds: this.selectedCategoryId ? [this.selectedCategoryId] : undefined,
        catalogId: this.selectedCatalogId ?? undefined,
        keywords: this.keywords,
        visibility: 'private',
      });
      const enriched = await this.api.getProductsDetails(result.items);
      this.privateItems = append ? [...this.privateItems, ...enriched] : enriched;
      this.privateTotal = result.total;
      this.privatePage = page;
      this.saveStandardState();
    } finally {
      if (append) {
        this.privateLoadingMore = false;
      } else {
        this.privateLoading = false;
      }
    }
  }

  // Arrow-function class fields (not methods) so they keep `this` bound when used as
  // bare event-handler references from the template.
  loadMorePublicOfferings = async (): Promise<void> => {
    if (this.publicLoadingMore || !this.publicHasMore) return;
    await this.loadPublicOfferings(this.publicPage + 1, { append: true });
  }

  loadMorePrivateOfferings = async (): Promise<void> => {
    if (this.privateLoadingMore || !this.privateHasMore) return;
    await this.loadPrivateOfferings(this.privatePage + 1, { append: true });
  }

  private saveStandardState(): void {
    this.state.save({
      selectedCategoryId: this.selectedCategoryId,
      selectedCatalogId: this.selectedCatalogId,
      activeCategoryName: this.activeCategoryName,
      privateOpen: this.privateOpen,
      publicPage: this.publicPage,
      privatePage: this.privatePage,
    });
  }

  // ------------------------------------------------------------------
  // Search bar (shared entry point between AI and non-AI modes)
  // ------------------------------------------------------------------

  async filterSearch(event: any) {
    event.preventDefault()
    this.keywords = (this.searchField.value != '' && this.searchField.value != null) ? this.searchField.value : undefined;
    this.updateQueryParams(this.keywords)
    await this.refreshOfferings();
  }

  updateQueryParams(keywords: string | null) {
    if (keywords) {
      this.router.navigate(
        ['/search', { keywords }],
        { replaceUrl: true }
      );
    } else {
      this.router.navigate(['/search'], { replaceUrl: true });
    }
  }

  // Unified Search - triggers both standard search and AI answer
  async onUnifiedSearch(event: any): Promise<void> {
    event.preventDefault();

    if (this.aiSearchEnabled && this.searchField.value?.trim()) {
      this.keywords = this.searchField.value;
      this.updateQueryParams(this.keywords);
      await this.runAiSearch();
    } else if (this.aiSearchEnabled) {
      this.keywords = undefined;
      this.updateQueryParams(this.keywords);
      this.aiAnswer = '';
      this.eventMessage.emitAiSearchCleared();
      await this.runInitialAiSearch();
    } else {
      this.keywords = this.searchField.value || undefined;
      this.updateQueryParams(this.keywords);
      this.aiAnswer = '';
      this.eventMessage.emitAiSearchCleared();
      await this.refreshOfferings();
    }
  }

  // ------------------------------------------------------------------
  // AI Search mode — untouched, independent of the sidebar filters above.
  // ------------------------------------------------------------------

  private async runInitialAiSearch(): Promise<void> {
    this.loading = true;
    this.aiCurrentPage = 1;
    if (!this.keywords) {
      this.searchField.reset();
    }
    this.cdr.detectChanges();

    try {
      const searchResponse = await this.aiSearchService.search(
        '',
        [],
        false,
        this.aiPageSize,
        0
      );

      this.products = this.mapAiSearchToProducts(searchResponse.items || []);
      this.aiTotalItems = searchResponse.total_count;

      this.state.save({
        products: this.products,
        keywords: this.keywords
      });
    } catch (error) {
      console.error('Initial AI Search error:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private async runAiSearch(): Promise<void> {
    const query = this.searchField.value?.trim();
    if (!query) {
      return;
    }

    this.aiSearchLoading = true;
    this.aiAnswer = '';
    this.loading = true;
    this.aiCurrentPage = 1;
    this.cdr.detectChanges();

    try {
      const { searchResponse, answer } = await this.aiSearchService.searchWithAnswer(
        query,
        [],
        this.aiPageSize,
        0
      );

      this.products = this.mapAiSearchToProducts(searchResponse.items || []);
      this.aiTotalItems = searchResponse.total_count;
      this.aiAnswer = answer;

      this.state.save({
        products: this.products,
        keywords: this.keywords
      });
    } catch (error) {
      console.error('AI Search error:', error);
      this.aiAnswer = '';
      this.products = [];
    } finally {
      this.aiSearchLoading = false;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  changeAiPage = async (page: number): Promise<void> => {
    this.aiCurrentPage = page;
    this.loading = true;
    this.cdr.detectChanges();

    try {
      const offset = (this.aiCurrentPage - 1) * this.aiPageSize;

      const searchResponse = await this.aiSearchService.search(
        this.keywords || '',
        [],
        false,
        this.aiPageSize,
        offset
      );

      this.products = this.mapAiSearchToProducts(searchResponse.items || []);
      this.aiTotalItems = searchResponse.total_count;
    } catch (error) {
      console.error('AI Search page change error:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private mapAiSearchToProducts(aiItems: any[]): ProductOffering[] {
    return aiItems.map(item => ({
      id: item.id,
      href: item.id,
      name: item.offeringName || item.specificationName,
      description: item.offeringDescription || item.specificationDescription,
      lifecycleStatus: item.lifecycleStatus || 'Launched',
      category: item.categories || [],
      attachment: item.imageUrl ? [{
        id: 'ai-image',
        name: 'Profile Picture',
        attachmentType: 'Picture',
        url: item.imageUrl,
        mimeType: 'image/png'
      }] : [],
      productSpecification: {
        id: item.id,
        name: item.specificationName,
        description: item.specificationDescription,
        brand: item.brand,
        productSpecCharacteristic: item.complianceProfiles ? [{
          name: 'complianceProfiles',
          productSpecCharacteristicValue: item.complianceProfiles.map((cp: any) => ({
            value: cp.name
          }))
        }] : []
      },
      productOfferingPrice: [],
      _aiSearchData: item
    } as any));
  }

}
