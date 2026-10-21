import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, Type } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { ApiServiceService, CatalogPageResponse } from 'src/app/services/product-service.service';
import { ThemeService } from 'src/app/services/theme.service';
import { CatalogsPageConfig } from 'src/app/themes';
import { environment } from 'src/environments/environment';

interface ProviderCard { id: string; name: string; description: string; logo: string; owner: string; }
/** What a catalogue card shows about its owning organization (null = not set). */
interface OwnerInfo { logo: string | null; name: string | null; }

@Component({
  selector: 'app-catalogs',
  templateUrl: './catalogs.component.html',
  styleUrl: './catalogs.component.css'
})
export class CatalogsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private catalogs: any[] = [];
  private nextCatalogs: any[] = [];
  private allProviders: ProviderCard[] = [];
  /** Per owner organization, so each one is fetched once across pages, sorts and searches. */
  private ownerInfoCache = new Map<string, OwnerInfo>();
  private providersRequestSeq = 0;
  private filteredPaginationToken: string | null = null;
  providers: ProviderCard[] = [];
  totalCount = 0;
  /** Real total for the "x of n" line. Only known when the proxy pages with plain
   * limit/offset; null when it pages with a filtered-pagination token (the proxy hides
   * catalogues without launched offers, so no total exists), and the line falls back
   * to just the loaded count. */
  catalogTotal: number | null = null;
  /** Default catalogues dropped client-side so far, subtracted from X-Total-Count. */
  private excludedCount = 0;
  page = 0;
  readonly CATALOG_LIMIT: number = environment.CATALOG_LIMIT;
  loading = false;
  loading_more = false;
  page_check = true;
  filter: string | undefined;
  searchField = new FormControl();

  viewMode: 'grid' | 'list' = 'grid';
  defaultCatalogLogoUrl = '';
  sortOption: 'recent' | 'name_asc' | 'name_desc' = 'recent';
  showSortDropdown = false;
  sortOptions: { value: 'recent' | 'name_asc' | 'name_desc'; label: string }[] = [
    { value: 'recent', label: 'CATALOGS._sort_recent' },
    { value: 'name_asc', label: 'CATALOGS._sort_name_asc' },
    { value: 'name_desc', label: 'CATALOGS._sort_name_desc' },
  ];
  marketplaceHomeUrl = '/search';
  catalogsHeaderComponent: Type<unknown> | null = null;

  get sortLabel() { return this.sortOptions.find(o => o.value === this.sortOption)?.label ?? ''; }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private accService: AccountServiceService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private themeService: ThemeService
  ) { }

  ngOnInit() {
    this.themeService.currentTheme$
      .pipe(takeUntil(this.destroy$))
      .subscribe(theme => {
        this.marketplaceHomeUrl = theme?.links?.marketplaceHomeUrl || '/search';
        this.applyCatalogsTheme(theme?.catalogs, theme?.assets?.defaultLogoUrl);
      });

    // Search and sort live in the query string, so reloads, shared links and back keep them.
    const query = this.route.snapshot.queryParamMap;
    this.filter = query.get('keyword') || undefined;
    this.searchField.setValue(this.filter ?? null, { emitEvent: false });
    const sort = query.get('sort');
    if (this.sortOptions.some(o => o.value === sort)) {
      this.sortOption = sort as CatalogsComponent['sortOption'];
    }

    this.getProviders(false);
    this.searchField.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(v => {
        if (!v && this.filter !== undefined) {
          this.filter = undefined;
          this.syncUrl();
          this.getProviders(false);
        }
      });
  }

  /** Mirrors search and sort into the query string (defaults left out), replacing the
   * current history entry instead of adding one per change. */
  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        keyword: this.filter || null,
        sort: this.sortOption === 'recent' ? null : this.sortOption,
      },
      replaceUrl: true,
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private applyCatalogsTheme(catalogsConfig: CatalogsPageConfig | undefined, themeLogoUrl?: string) {
    this.catalogsHeaderComponent = catalogsConfig?.sections?.header || null;
    const previousDefaultLogoUrl = this.defaultCatalogLogoUrl;
    // A theme without its own catalogs fallback (e.g. BAE) falls back to its generic logo,
    // same as the catalogue details page does for an organization with no logo.
    this.defaultCatalogLogoUrl = catalogsConfig?.cards?.fallbackLogoUrl || themeLogoUrl || '';

    if (previousDefaultLogoUrl !== this.defaultCatalogLogoUrl) {
      this.updateDefaultLogos(previousDefaultLogoUrl, this.defaultCatalogLogoUrl);
    }
  }

  private updateDefaultLogos(previousDefaultLogoUrl: string, nextDefaultLogoUrl: string) {
    const replaceDefaultLogo = (card: ProviderCard) => {
      if (!card.logo || card.logo === previousDefaultLogoUrl) {
        card.logo = nextDefaultLogoUrl;
      }
    };

    this.allProviders.forEach(replaceDefaultLogo);
    this.providers.forEach(replaceDefaultLogo);
  }

  async getProviders(next = false) {
    if (next && (!this.page_check || this.loading_more)) {
      return;
    }

    const requestSeq = ++this.providersRequestSeq;

    if (next) {
      this.loading_more = true;
    } else {
      this.loading = true;
      this.page = 0;
      this.catalogs = [];
      this.nextCatalogs = [];
      this.allProviders = [];
      this.providers = [];
      this.page_check = true;
      this.catalogTotal = null;
      this.excludedCount = 0;
      this.clearFilteredPaginationToken();
    }

    try {
      let loadedCatalogs: any[] = [];
      let page = this.page;
      let filteredPaginationToken = this.filteredPaginationToken;

      if (next) {
        loadedCatalogs = [...this.nextCatalogs];
        const visibleCatalogs = [...this.catalogs, ...loadedCatalogs];
        let bufferedCatalogs: any[] = [];

        if (filteredPaginationToken) {
          const prefetched = await this.loadCatalogsPage(page, filteredPaginationToken);
          page += this.CATALOG_LIMIT;
          filteredPaginationToken = prefetched.filteredPaginationToken ?? null;
          if (requestSeq !== this.providersRequestSeq) {
            return;
          }
          bufferedCatalogs = Array.isArray(prefetched.items) ? prefetched.items : [];
        } else if (this.catalogTotal !== null) {
          // Plain limit/offset paging: fetch the next page now
          const more = await this.loadCatalogsPage(page, null);
          page += this.CATALOG_LIMIT;
          if (requestSeq !== this.providersRequestSeq) {
            return;
          }
          loadedCatalogs = more.items;
          visibleCatalogs.push(...more.items);
          this.updateCatalogTotal(more);
        }

        this.catalogs = visibleCatalogs;
        this.nextCatalogs = bufferedCatalogs;
      } else {
        page = 0;
        filteredPaginationToken = null;
        const current = await this.loadCatalogsPage(page, filteredPaginationToken);
        page += this.CATALOG_LIMIT;
        filteredPaginationToken = current.filteredPaginationToken ?? null;
        if (requestSeq !== this.providersRequestSeq) {
          return;
        }

        loadedCatalogs = Array.isArray(current.items) ? current.items : [];
        this.catalogs = loadedCatalogs;
        if (!filteredPaginationToken) {
          this.updateCatalogTotal(current);
        }

        if (filteredPaginationToken) {
          const prefetched = await this.loadCatalogsPage(page, filteredPaginationToken);
          page += this.CATALOG_LIMIT;
          filteredPaginationToken = prefetched.filteredPaginationToken ?? null;
          if (requestSeq !== this.providersRequestSeq) {
            return;
          }
          this.nextCatalogs = Array.isArray(prefetched.items) ? prefetched.items : [];
        }
      }

      this.page = page;
      this.filteredPaginationToken = filteredPaginationToken;
      this.page_check = this.catalogTotal !== null
        ? this.catalogs.length < this.catalogTotal
        : this.nextCatalogs.some(item => item != null);
      this.allProviders = this.catalogs.map(c => this.mapCatalog(c));
      this.applyView();
      this.fillOwnerInfo(loadedCatalogs);
    } catch (err) {
      console.error('Error loading catalogs:', err);
    } finally {
      if (requestSeq === this.providersRequestSeq) {
        this.loading = false;
        this.loading_more = false;
        this.cdr.detectChanges();
      }
    }
  }

  private async loadCatalogsPage(page: number, filteredPaginationToken: string | null): Promise<CatalogPageResponse & { excluded: number }> {
    const response = await this.api.getLaunchedCatalogsPage(page, this.filter, this.CATALOG_LIMIT, filteredPaginationToken, null, this.sortParam);
    const all = response.items ?? [];
    const items = all.filter((catalog: any) => catalog?.id !== environment.DFT_CATALOG_ID);
    return { ...response, items, excluded: all.length - items.length };
  }

  /** Offset mode only: X-Total-Count minus the default catalogues hidden so far. */
  private updateCatalogTotal(page: { total?: number | null; excluded: number }): void {
    this.excludedCount += page.excluded;
    this.catalogTotal = page.total != null ? Math.max(0, page.total - this.excludedCount) : null;
  }

  /** TMF sort convention: bare field for ascending, `-field` for descending. */
  private get sortParam(): string {
    switch (this.sortOption) {
      case 'name_asc': return 'name';
      case 'name_desc': return '-name';
      default: return '-lastUpdate';
    }
  }

  private clearFilteredPaginationToken(): void {
    this.filteredPaginationToken = null;
  }

  private mapCatalog(c: any): ProviderCard {
    const owner = this.findOwner(c);
    const cached = owner ? this.ownerInfoCache.get(owner.id) : undefined;
    return {
      id: c?.id ?? '',
      name: c?.name ?? '',
      description: c?.description ?? '',
      logo: cached?.logo || this.defaultCatalogLogoUrl,
      // The catalogue's relatedParty already carries the owner's name, so it shows
      // straight away; the organization record (if fetched) is the source of truth.
      owner: cached?.name || owner?.name || '',
    };
  }

  private findOwner(catalog: any): any | undefined {
    const parties: any[] = catalog?.relatedParty ?? [];
    const owner = parties.find((p: any) => p?.role === environment.SELLER_ROLE)
      ?? parties.find((p: any) => p?.id && String(p.id).includes('organization'));
    return owner?.id && String(owner.id).includes('organization') ? owner : undefined;
  }

  /** Fetches each not-yet-seen owner organization once, for its logo and name. */
  private fillOwnerInfo(catalogs: any[]) {
    const cardsByOwner = new Map<string, ProviderCard[]>();
    for (const c of catalogs) {
      const owner = this.findOwner(c);
      const card = this.allProviders.find(p => p.id === c?.id);
      if (!owner || !card || this.ownerInfoCache.has(owner.id)) continue;
      cardsByOwner.set(owner.id, [...(cardsByOwner.get(owner.id) ?? []), card]);
    }
    for (const [ownerId, cards] of cardsByOwner) {
      this.accService.getOrgInfo(ownerId).then(org => {
        const info: OwnerInfo = {
          logo: (org?.partyCharacteristic ?? []).find((ch: any) => ch?.name === 'logo')?.value || null,
          name: org?.tradingName || null,
        };
        this.ownerInfoCache.set(ownerId, info);
        for (const card of cards) {
          if (info.logo) card.logo = info.logo;
          if (info.name) card.owner = info.name;
        }
        this.cdr.detectChanges();
      }).catch(() => {
        this.ownerInfoCache.set(ownerId, { logo: null, name: null });
      });
    }
  }

  private applyView() {
    // Sorting is done backend-side (see sortParam) so it applies across the whole
    // result set, not just whatever page happens to be loaded client-side.
    this.totalCount = this.allProviders.length;
    this.providers = [...this.allProviders];
  }

  filterProviders() {
    const value = this.searchField.value?.trim();
    this.filter = value || undefined;
    this.syncUrl();
    this.getProviders(false);
  }

  toggleSortDropdown(e: Event) {
    e.stopPropagation();
    this.showSortDropdown = !this.showSortDropdown;
  }

  selectSort(v: 'recent' | 'name_asc' | 'name_desc', e: Event) {
    e.stopPropagation();
    this.sortOption = v;
    this.showSortDropdown = false;
    this.syncUrl();
    this.getProviders(false);
  }

  next(): Promise<void> {
    return this.getProviders(true);
  }

  goToProvider(id: string) {
    this.router.navigate(['/search/catalogue', id]);
  }

  @HostListener('document:click') onClick() {
    if (this.showSortDropdown) {
      this.showSortDropdown = false;
      this.cdr.detectChanges();
    }
  }
}
