import { Location } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { faEarthAmericas } from '@fortawesome/free-solid-svg-icons';
import { faCheck, faChevronDown, faChevronRight, faEnvelope, faGlobe, faGrid2, faLocationDot, faPhone } from '@fortawesome/pro-solid-svg-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { availableFilters, searchCategoriesConfig } from 'src/app/data/availableFilters';
import { iconForCategory } from 'src/app/data/categoryIcons';
import { Category } from 'src/app/models/interfaces';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { EventMessageService } from "../../services/event-message.service";
import { ThemeService } from '../../services/theme.service';

type ToolbarFilter = {
  key: string;
  label: string;
  source: 'configured' | 'categoryRoot';
  rootName?: string;
  options: Category[];
  selectedIds: string[];
  open: boolean;
  dropTop?: number | null;
};

type OrganizationDetailsMode = 'catalog' | 'organization';
type ContactMediumKind = 'email' | 'phone' | 'address' | 'website';
const CONTACT_MEDIUM_KIND_ORDER: ContactMediumKind[] = ['email', 'phone', 'address'];

interface DisplayContactMedium {
  kind: ContactMediumKind;
  title: string;
  titleKey: string;
  value: string;
  href?: string;
}

@Component({
  selector: 'app-organization-details',
  templateUrl: './organization-details.component.html',
  styleUrl: './organization-details.component.css'
})
export class OrganizationDetailsComponent implements OnInit, AfterViewInit, OnDestroy {

  id: any;
  mode: OrganizationDetailsMode = 'organization';
  notFound = false;
  orgInfo: any;
  logo: any = undefined;

  get defaultLogo(): string | undefined {
    return this.themeService.getCurrentThemeConfig()?.assets.defaultLogoUrl;
  }

  get contactMediums(): DisplayContactMedium[] { return this.buildContactMediums(this.orgInfo?.contactMedium); }
  get supportContacts(): DisplayContactMedium[] {
    const contacts = this.contactMediums;
    return this.website
      ? [...contacts, { kind: 'website' as const, title: '', titleKey: 'ORGANIZATION._site', value: this.website, href: this.website }]
      : contacts;
  }
  get hasContact(): boolean { return this.supportContacts.length > 0; }
  get contactCount(): number { return this.supportContacts.length; }
  description: any = undefined;
  website: any;
  country: any;
  email: string = '';
  phone: string = '';
  address: string = '';
  servicesCount: number = 0;
  protected readonly faEarthAmericas = faEarthAmericas;
  protected readonly faCheck = faCheck;
  protected readonly faChevronDown = faChevronDown;
  protected readonly faChevronRight = faChevronRight;
  protected readonly faEnvelope = faEnvelope;
  protected readonly faGlobe = faGlobe;
  protected readonly faGrid2 = faGrid2;
  protected readonly faLocationDot = faLocationDot;
  protected readonly faPhone = faPhone;
  protected readonly iconForCategory = iconForCategory;

  serviceSearch = new FormControl();
  serviceKeywords: string | undefined;
  toolbarFilters: ToolbarFilter[] = [];

  services: any[] = [];
  /** Total matching offerings for the current filters/keywords, from X-Total-Count. */
  serviceTotal = 0;
  servicesLoading = false;
  loading_more = false;
  get page_check(): boolean {
    return this.services.length < this.serviceTotal;
  }
  /** Catalogue view only, logged-in only: private (ad-hoc) offers targeted at the current
   * party live in their own tab, so the public list's pagination isn't broken by the
   * proxy dropping other buyers' private offers after the TMForum has paged. */
  offerTab: 'public' | 'private' = 'public';
  publicTotal = 0;
  privateTotal = 0;
  /** Whether the party has any private offer here at all (from an unfiltered request),
   * so the tabs don't disappear just because a filter leaves the private tab empty. */
  private hasPrivateOffers = false;
  readonly offerTabs: { value: 'public' | 'private'; label: string }[] = [
    { value: 'public', label: 'DASHBOARD._public_catalog' },
    { value: 'private', label: 'ORGANIZATION._private_offers' },
  ];
  get showOfferTabs(): boolean {
    return this.mode === 'catalog' && this.hasPrivateOffers;
  }
  rootCategories: Category[] = [];
  activeCategoryName: string | null = null;
  activeCategoryId: string | null = null;
  showCategoryDropdown = false;
  showSummaryBar = false;
  @ViewChild('providerHero') providerHero?: ElementRef<HTMLElement>;
  @ViewChild('summaryBar') summaryBar?: ElementRef<HTMLElement>;
  @ViewChild('descPara') descPara?: ElementRef<HTMLElement>;
  descTruncated = false;
  showDescModal = false;
  showCategoriesOverlay = false;
  private overlaySnapshot: Category[] = [];
  get selectedCategoryCount(): number {
    const raw = this.localStorage.getObject('selected_categories');
    return Array.isArray(raw) ? raw.length : 0;
  }
  private readonly HEADER_HEIGHT = 88;
  serviceSort: 'relevance' | 'name' | 'date' = 'relevance';
  showServiceSort = false;
  serviceSortOptions: { value: 'relevance' | 'name' | 'date'; label: string }[] = [
    { value: 'relevance', label: 'ORGANIZATION._sort_relevance' },
    { value: 'name', label: 'ORGANIZATION._sort_name' },
    { value: 'date', label: 'ORGANIZATION._sort_date' },
  ];
  get serviceSortLabel() { return this.serviceSortOptions.find(o => o.value === this.serviceSort)?.label ?? ''; }

  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private accService: AccountServiceService,
    private location: Location,
    private api: ApiServiceService,
    private renderer: Renderer2,
    private themeService: ThemeService
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'FiltersCommitted') {
        this.reloadServices();
        this.cdr.detectChanges();
      } else if (ev.type === 'ChangedSession') {
        // Private offers depend on who is logged in
        this.offerTab = 'public';
        this.hasPrivateOffers = false;
        this.reloadServices();
      }
    });
  }

  ngOnInit(): void {
    this.serviceSearch.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => {
      if (!v) { this.serviceKeywords = undefined; this.syncUrl(); this.reloadServices(); }
    });
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.id = params.get('id');
      this.mode = this.route.snapshot.data['mode'] === 'catalog' ? 'catalog' : 'organization';
      this.resetPageState();
      this.applyQueryParams();
      this.loadPage();
    });
  }

  /** Search, sort and tab live in the query string, so reloads, shared links and back
   * keep them. Read after resetPageState(), which clears them for a new organization. */
  private applyQueryParams(): void {
    const query = this.route.snapshot.queryParamMap;
    this.serviceKeywords = query.get('keyword') || undefined;
    this.serviceSearch.setValue(this.serviceKeywords ?? null, { emitEvent: false });
    const sort = query.get('sort');
    this.serviceSort = this.serviceSortOptions.find(o => o.value === sort)?.value ?? 'relevance';
    this.offerTab = query.get('tab') === 'private' ? 'private' : 'public';
  }

  /** Mirrors search, sort and tab into the query string (defaults left out), replacing the
   * current history entry instead of adding one per change. */
  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        keyword: this.serviceKeywords || null,
        sort: this.serviceSort === 'relevance' ? null : this.serviceSort,
        tab: this.offerTab === 'private' ? 'private' : null,
      },
      replaceUrl: true,
    });
  }

  private resetPageState(): void {
    this.notFound = false;
    this.orgInfo = undefined;
    this.logo = undefined;
    this.description = undefined;
    this.website = undefined;
    this.country = undefined;
    this.email = '';
    this.phone = '';
    this.address = '';
    this.servicesCount = 0;
    this.services = [];
    this.serviceTotal = 0;
    this.offerTab = 'public';
    this.publicTotal = 0;
    this.privateTotal = 0;
    this.hasPrivateOffers = false;
    this.loading_more = false;
    this.activeCategoryName = null;
    this.activeCategoryId = null;
    this.showCategoryDropdown = false;
    this.showSummaryBar = false;
    this.descTruncated = false;
    this.showDescModal = false;
    this.showCategoriesOverlay = false;
    this.serviceKeywords = undefined;
    this.serviceSearch.reset(undefined, { emitEvent: false });
    this.localStorage.setObject('selected_categories', []);
    this.initToolbarFilters();
  }

  private loadPage(): void {
    if (this.mode === 'catalog') {
      this.loadCatalogPage();
    } else {
      this.loadOrganizationPage();
    }
  }

  private async loadCatalogPage(): Promise<void> {
    const catalogId = this.id;
    const requestKey = this.currentRequestKey();
    let owner: any;
    try {
      const catalog = await this.api.getCatalog(catalogId);
      if (this.currentRequestKey() !== requestKey) { return; }
      const parties: any[] = catalog?.relatedParty ?? [];
      owner = parties.find((p: any) => p?.role === environment.SELLER_ROLE)
        ?? parties.find((p: any) => p?.id && String(p.id).includes('organization'));
    } catch (err) {
      console.warn('Catalog unavailable:', err);
    }
    if (this.currentRequestKey() !== requestKey) { return; }
    if (!owner?.id) {
      this.notFound = true;
      return;
    }
    await this.loadOwnerInfo(owner.id, requestKey);
    if (this.currentRequestKey() !== requestKey) { return; }
    await this.loadServicesPage(false, requestKey);
    if (this.currentRequestKey() !== requestKey) { return; }
    this.loadRootCategories();
  }

  private async loadOrganizationPage(): Promise<void> {
    const orgId = this.id;
    const requestKey = this.currentRequestKey();

    if (!orgId) {
      this.notFound = true;
      return;
    }

    await this.loadOwnerInfo(orgId, requestKey);
    if (this.currentRequestKey() !== requestKey || this.notFound) { return; }
    await this.loadServicesPage(false, requestKey);
    if (this.currentRequestKey() !== requestKey) { return; }
    this.loadRootCategories();
  }

  private currentRequestKey(): string {
    return `${this.mode}:${this.id ?? ''}`;
  }

  private loadOwnerInfo(ownerId: string, requestKey: string): Promise<void> {
    return this.accService.getOrgInfo(ownerId).then(org => {
      if (this.currentRequestKey() !== requestKey) { return; }
      this.orgInfo = org;
      console.log(this.orgInfo)
      const chars = this.orgInfo?.partyCharacteristic ?? [];
      for (let i = 0; i < chars.length; i++) {
        if (chars[i].name == 'logo') {
          this.logo = chars[i].value
        }
        if (chars[i].name == 'website') {
          this.website = chars[i].value
        }
        if (chars[i].name == 'description') {
          this.description = chars[i].value
        }
      }
      if (!this.logo) {
        this.logo = this.defaultLogo;
      }
      this.email = ''; this.phone = ''; this.address = ''; this.country = '';
      for (const m of (org?.contactMedium ?? [])) {
        const c = m?.characteristic ?? {};
        if (m?.mediumType === 'Email') this.email = c.emailAddress ?? '';
        if (m?.mediumType === 'TelephoneNumber' || m?.mediumType === 'Phone') this.phone = c.phoneNumber ?? this.phone;
        if (m?.mediumType === 'PostalAddress') {
          this.country = c.country ?? '';
          this.address = [c.street1, [c.postCode, c.city].filter(Boolean).join(' '), c.stateOrProvince, c.country].filter(Boolean).join(', ');
        }
      }
      this.cdr.detectChanges();
      setTimeout(() => {
        const el = this.descPara?.nativeElement;
        this.descTruncated = !!el && el.scrollHeight > el.clientHeight + 1;
        this.cdr.detectChanges();
      });
    }).catch(err => {
      if (this.currentRequestKey() !== requestKey) { return; }
      console.warn('Organization unavailable:', err);
      this.notFound = true;
    })
  }

  private buildContactMediums(contactMedium: any[] | undefined): DisplayContactMedium[] {
    if (!Array.isArray(contactMedium)) return [];

    const grouped = new Map<ContactMediumKind, DisplayContactMedium[]>(
      CONTACT_MEDIUM_KIND_ORDER.map(kind => [kind, []])
    );

    for (const medium of contactMedium) {
      const displayMedium = this.toDisplayContactMedium(medium);
      if (!displayMedium) { continue; }
      grouped.get(displayMedium.kind)?.push(displayMedium);
    }

    return CONTACT_MEDIUM_KIND_ORDER.flatMap(kind => grouped.get(kind) ?? []);
  }

  private toDisplayContactMedium(medium: any): DisplayContactMedium | null {
    const characteristic = medium?.characteristic ?? {};
    const contactType = characteristic?.contactType;
    const title = typeof contactType === 'string' ? contactType.trim() : '';

    if (medium?.mediumType === 'Email') {
      const value = characteristic?.emailAddress ?? '';
      return value ? { kind: 'email', title, titleKey: 'ORGANIZATION._contact_mail', value, href: `mailto:${value}` } : null;
    }

    if (medium?.mediumType === 'TelephoneNumber' || medium?.mediumType === 'Phone') {
      const value = characteristic?.phoneNumber ?? '';
      return value ? { kind: 'phone', title, titleKey: 'ORGANIZATION._phone', value } : null;
    }

    if (medium?.mediumType === 'PostalAddress') {
      const value = [
        characteristic?.street1,
        [characteristic?.postCode, characteristic?.city].filter(Boolean).join(' '),
        characteristic?.stateOrProvince,
        characteristic?.country
      ].filter(Boolean).join(', ');
      return value ? { kind: 'address', title, titleKey: 'ORGANIZATION._address', value } : null;
    }

    return null;
  }

  ngAfterViewInit(): void {
    const el = this.summaryBar?.nativeElement;
    const nav = document.querySelector('bae-header nav');
    if (el && nav) {
      this.renderer.appendChild(nav, el);
    }
  }

  ngOnDestroy(): void {
    const el = this.summaryBar?.nativeElement;
    if (el?.parentNode) {
      el.parentNode.removeChild(el);
    }
    const stored = this.localStorage.getObject('selected_categories') as Category[] || [];
    for (const f of (Array.isArray(stored) ? stored : [])) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  back() {
    this.location.back();
  }

  openDescModal(event: Event) {
    event.stopPropagation();
    this.showDescModal = true;
  }

  openCategoriesOverlay(event: Event): void {
    event.stopPropagation();
    const raw = this.localStorage.getObject('selected_categories');
    this.overlaySnapshot = Array.isArray(raw) ? [...raw] : [];
    this.showCategoriesOverlay = true;
  }

  clearOverlayCategories(): void {
    const raw = this.localStorage.getObject('selected_categories');
    for (const f of (Array.isArray(raw) ? raw : []) as Category[]) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    this.eventMessage.emitFiltersCommitted();
  }

  applyCategoriesOverlay(): void {
    this.showCategoriesOverlay = false;
  }

  cancelCategoriesOverlay(): void {
    const raw = this.localStorage.getObject('selected_categories');
    const current: Category[] = Array.isArray(raw) ? raw : [];
    const snapIds = new Set(this.overlaySnapshot.map(c => c?.id).filter(Boolean));
    const currIds = new Set(current.map(c => c?.id).filter(Boolean));
    for (const f of current) {
      if (f?.id && !snapIds.has(f.id)) { this.localStorage.removeCategoryFilter(f); this.eventMessage.emitRemovedFilter(f); }
    }
    for (const f of this.overlaySnapshot) {
      if (f?.id && !currIds.has(f.id)) { this.localStorage.addCategoryFilter(f); this.eventMessage.emitAddedFilter(f); }
    }
    this.showCategoriesOverlay = false;
    this.eventMessage.emitFiltersCommitted();
  }

  closeDescModal() {
    this.showDescModal = false;
  }


  private initToolbarFilters(): void {
    this.toolbarFilters = availableFilters.map(filter => ({
      key: filter.name,
      label: filter.label ?? filter.name,
      source: filter.source ?? 'configured',
      rootName: filter.rootName,
      options: (filter.source ?? 'configured') === 'configured'
        ? (filter.children ?? []).map(child => ({ id: `${filter.name}::${child.name}`, name: child.label ?? child.name }))
        : [],
      selectedIds: [],
      open: false,
    }));
  }

  toggleToolbarFilterDropdown(filter: ToolbarFilter, event: Event): void {
    event.stopPropagation();
    const willOpen = !filter.open;
    for (const f of this.toolbarFilters) f.open = false;
    filter.dropTop = window.innerWidth < 640
      ? Math.round((event.currentTarget as HTMLElement).getBoundingClientRect().bottom)
      : null;
    filter.open = willOpen;
  }

  get hasActiveToolbarFilters(): boolean {
    return this.toolbarFilters.some(f => f.selectedIds.length > 0);
  }

  filterServices(): void {
    this.serviceKeywords = this.serviceSearch.value || undefined;
    this.syncUrl();
    this.reloadServices();
  }

  clearServiceFilters(): void {
    for (const f of this.toolbarFilters) { f.selectedIds = []; f.open = false; }
    this.serviceKeywords = undefined;
    this.serviceSearch.reset();
    this.reloadServices();
  }

  private async loadRootCategories(): Promise<void> {
    try {
      const roots = await this.api.getDefaultCategories();
      const list = Array.isArray(roots) ? roots : [];
      let primaryCategories: Category[] = [];
      if (searchCategoriesConfig.primaryCategoriesMode === 'catalogFirstLevel') {
        primaryCategories = list;
      } else {
        const primaryRoot = list.find((c: any) => c?.name === searchCategoriesConfig.primaryRootName);
        if (primaryRoot?.id) {
          const children = await this.api.getCategoriesByParentId(primaryRoot.id).catch(() => []);
          primaryCategories = Array.isArray(children) ? children : [];
        }
      }
      await Promise.all(
        this.toolbarFilters
          .filter(f => f.source === 'categoryRoot')
          .map(async f => {
            const root = list.find((c: any) => c?.name === f.rootName);
            const children = root?.id ? await this.api.getCategoriesByParentId(root.id).catch(() => []) : [];
            f.options = Array.isArray(children) ? children : [];
          })
      );
      this.rootCategories = primaryCategories;
    } catch {
      this.rootCategories = [];
    }
  }

  isToolbarOptionSelected(filter: ToolbarFilter, option: Category): boolean {
    return !!option?.id && filter.selectedIds.includes(option.id);
  }

  toggleToolbarOption(filter: ToolbarFilter, option: Category, event: Event): void {
    event.stopPropagation();
    if (!option?.id) return;
    const idx = filter.selectedIds.indexOf(option.id);
    if (idx > -1) filter.selectedIds.splice(idx, 1);
    else filter.selectedIds.push(option.id);
    this.reloadServices();
  }

  clearToolbarFilterSelection(filter: ToolbarFilter, event: Event): void {
    event.stopPropagation();
    filter.selectedIds = [];
    this.reloadServices();
  }

  toggleCategoryDropdown(event: Event): void {
    event.stopPropagation();
    this.showCategoryDropdown = !this.showCategoryDropdown;
    for (const f of this.toolbarFilters) f.open = false;
    this.showServiceSort = false;
  }

  async selectCategory(cat: Category | null): Promise<void> {
    const raw = this.localStorage.getObject('selected_categories');
    const storedFilters: Category[] = Array.isArray(raw) ? raw : [];
    for (const f of storedFilters) {
      this.localStorage.removeCategoryFilter(f);
      this.eventMessage.emitRemovedFilter(f);
    }
    if (cat) {
      this.activeCategoryName = cat.name ?? null;
      this.activeCategoryId = cat.id ?? null;
      if (cat.id) {
        const children = await this.api.getCategoriesByParentId(cat.id).catch(() => []);
        const childList: Category[] = Array.isArray(children) ? children : [];
        for (const child of childList) {
          if (!child?.id) continue;
          this.localStorage.addCategoryFilter(child);
          this.eventMessage.emitAddedFilter(child);
        }
      }
    } else {
      this.activeCategoryName = null;
      this.activeCategoryId = null;
    }
    this.showCategoryDropdown = false;
    this.eventMessage.emitFiltersCommitted();
  }

  get categoryFilterCatalogId(): string | undefined {
    return this.mode === 'catalog' ? this.id : undefined;
  }

  async next(): Promise<void> {
    await this.loadServicesPage(true, this.currentRequestKey());
  }

  selectOfferTab(tab: 'public' | 'private'): void {
    if (tab === this.offerTab) { return; }
    this.offerTab = tab;
    this.syncUrl();
    this.reloadServices();
  }

  private reloadServices(): void {
    if (!this.id) { return; }
    this.loadServicesPage(false, this.currentRequestKey());
  }

  private async loadServicesPage(next: boolean, requestKey: string): Promise<void> {
    if (next && (!this.page_check || this.loading_more)) { return; }
    if (next) {
      this.loading_more = true;
    } else {
      this.servicesLoading = true;
      this.loading_more = false;
      this.services = [];
      this.serviceTotal = 0;
    }

    const filters = this.getSelectedServiceFilters();
    const keywords = this.serviceKeywords?.trim() || undefined;
    const sort = this.getServiceSortParams();
    // A provider's own private offers can't be scoped to that provider and to the current
    // buyer in one query (both are relatedParty.id), so the organization view is public-only.
    const canSeePrivate = this.mode === 'catalog' && !!this.localStorage.getValidLoginInfo();
    if (!canSeePrivate) { this.offerTab = 'public'; }
    const query = {
      categoryIds: filters.map(f => f.id!).filter(Boolean),
      catalogId: this.mode === 'catalog' ? this.id ?? undefined : undefined,
      partyId: this.mode === 'organization' ? this.id ?? undefined : undefined,
      keywords,
    };
    const otherTab = this.offerTab === 'public' ? 'private' : 'public';
    try {
      const [result, other] = await Promise.all([
        this.api.getOfferingsPaged({
          ...query,
          limit: environment.PRODUCT_LIMIT,
          offset: next ? this.services.length : 0,
          orderBy: sort?.orderBy,
          orderDirection: sort?.orderDirection,
          visibility: this.offerTab,
        }),
        // Only the other tab's total is needed, for its label
        !next && canSeePrivate
          ? this.api.getOfferingsPaged({ ...query, limit: 1, offset: 0, visibility: otherTab })
          : Promise.resolve(null),
      ]);
      if (this.currentRequestKey() !== requestKey) { return; }

      const enriched = await this.api.getProductsDetails(result.items);
      this.services = next ? [...this.services, ...enriched] : enriched;
      this.serviceTotal = result.total;
      if (this.offerTab === 'public') { this.publicTotal = result.total; } else { this.privateTotal = result.total; }
      if (other) {
        if (otherTab === 'public') { this.publicTotal = other.total; } else { this.privateTotal = other.total; }
      }
      if (!canSeePrivate) { this.privateTotal = 0; }
      // The header figure and whether the tabs show at all come from an unfiltered request.
      if (!next && !keywords && !filters.length) {
        this.servicesCount = this.publicTotal;
        this.hasPrivateOffers = canSeePrivate && this.privateTotal > 0;
      }
    } catch (err) {
      if (this.currentRequestKey() !== requestKey) { return; }
      console.warn('Offers unavailable:', err);
      if (!next) {
        this.services = [];
        this.serviceTotal = 0;
      }
    } finally {
      if (this.currentRequestKey() !== requestKey) { return; }
      this.servicesLoading = false;
      this.loading_more = false;
      this.cdr.detectChanges();
    }
  }

  private getSelectedServiceFilters(): Category[] {
    const selected: Category[] = [];
    const byId = new Set<string>();
    const stored = this.localStorage.getObject('selected_categories') as Category[] || [];

    const add = (cat: Category | undefined) => {
      if (!cat?.id || byId.has(cat.id)) { return; }
      byId.add(cat.id);
      selected.push(cat);
    };

    for (const cat of (Array.isArray(stored) ? stored : [])) {
      add(cat);
    }

    for (const filter of this.toolbarFilters) {
      for (const id of filter.selectedIds) {
        const option = filter.options.find(opt => opt.id === id);
        add(option);
      }
    }

    return selected;
  }

  /** Sorting is done by the API so it applies across every page, not just the loaded ones. */
  private getServiceSortParams(): { orderBy: string; orderDirection: 'asc' | 'desc' } | undefined {
    if (this.serviceSort === 'name') return { orderBy: 'name', orderDirection: 'asc' };
    if (this.serviceSort === 'date') return { orderBy: 'lastUpdate', orderDirection: 'desc' };
    return undefined;
  }

  toggleServiceSort(event: Event): void {
    event.stopPropagation();
    this.showServiceSort = !this.showServiceSort;
  }

  selectServiceSort(v: 'relevance' | 'name' | 'date', event: Event): void {
    event.stopPropagation();
    this.serviceSort = v;
    this.showServiceSort = false;
    this.syncUrl();
    this.reloadServices();
  }

  @HostListener('window:scroll') onScroll(): void {
    const bottom = this.providerHero?.nativeElement.getBoundingClientRect().bottom;
    const next = bottom !== undefined && bottom <= this.HEADER_HEIGHT;
    if (next !== this.showSummaryBar) {
      this.showSummaryBar = next;
      this.cdr.detectChanges();
    }
  }

  @HostListener('document:click') onDocClick(): void {
    let changed = false;
    if (this.toolbarFilters.some(f => f.open)) { for (const f of this.toolbarFilters) f.open = false; changed = true; }
    if (this.showServiceSort) { this.showServiceSort = false; changed = true; }
    if (this.showCategoryDropdown) { this.showCategoryDropdown = false; changed = true; }
    if (changed) this.cdr.detectChanges();
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
