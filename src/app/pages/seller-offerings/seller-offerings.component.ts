import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { firstValueFrom, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { LoginInfo } from 'src/app/models/interfaces';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ThemeService } from 'src/app/services/theme.service';
import { WorkspaceHelpConfig } from 'src/app/themes';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { environment } from 'src/environments/environment';
import { SellerOfferingsPaths } from './seller-offerings.paths';

const { segments } = SellerOfferingsPaths;

@Component({
  selector: 'app-seller-offerings',
  templateUrl: './seller-offerings.component.html',
  styleUrl: './seller-offerings.component.css'
})
export class SellerOfferingsComponent implements OnInit, OnDestroy {

  catalogManagementEnabled: boolean = environment.CATALOG_MANAGEMENT_ENABLED;
  isListView = true;

  catalogsCount = 0;
  productOffersCount = 0;
  softwaresCount = 0;
  productSpecsCount = 0;
  serviceSpecsCount = 0;
  resourceSpecsCount = 0;
  usageSpecsCount = 0;

  workspaceHelpAction?: WorkspaceHelpConfig;

  sections: SideNavSection[] = this.buildSections();

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private quoteService: QuoteService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private http: HttpClient,
    private themeService: ThemeService,
  ) {
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.onNavigationEnd());
    this.updateIsListView();
  }

  async ngOnInit() {
    const theme = this.themeService.getCurrentThemeConfig();
    this.workspaceHelpAction = theme?.workspace?.sellerOfferingsHelp;

    this.loadCounts();

    const state = history.state as { quoteId?: string };
    if (state && state.quoteId) {
      const quote = await firstValueFrom(this.quoteService.getQuoteById(state.quoteId));
      const offerId = quote?.quoteItem?.[0]?.productOffering?.id;
      const quoteBuyer = quote?.relatedParty?.find((party: any) => party.role.toLowerCase() === environment.BUYER_ROLE.toLowerCase());
      if (offerId) {
        this.router.navigate([segments.offers, segments.custom], {
          relativeTo: this.route,
          queryParams: { offerId, partyId: quoteBuyer?.id },
        });
      }
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToResources() {
    const targetUrl = environment.KNOWLEDGE_BASE_URL || environment.KB_GUIDELNES_URL;
    if (!targetUrl) return;
    window.open(targetUrl, '_blank', 'noopener');
  }

  private onNavigationEnd() {
    const wasListView = this.isListView;
    this.updateIsListView();
    // The component isn't re-created when navigating between the list and its
    // create/update children (they share this same outlet), so ngOnInit's
    // loadCounts() only runs once. Re-fetch whenever we land back on a list
    // view — e.g. right after creating/updating an item — to avoid stale counts.
    if (this.isListView && !wasListView) {
      this.loadCounts();
    }
  }

  private updateIsListView() {
    const path = this.router.url.split('?')[0];
    this.isListView = /^\/my-offerings\/[a-zA-Z]+\/?$/.test(path);
  }

  private getPartyId(): string | undefined {
    const info = this.localStorage.getObject('login_items') as LoginInfo;
    if (!info || JSON.stringify(info) === '{}') return undefined;
    if (info.logged_as == info.id) {
      return info.partyId;
    }
    const loggedOrg = info.organizations?.find((org: any) => org.id == info.logged_as);
    return loggedOrg?.partyId;
  }

  private async loadCounts() {
    const partyId = this.getPartyId();
    if (!partyId) return;

    const limit = 1000;
    const base = environment.BASE_URL;
    const partyParam = `relatedParty.id=${partyId}`;
    const offersUrl = `${base}${environment.PRODUCT_CATALOG}/productOffering?limit=${limit}&${partyParam}`;
    const catalogsUrl = `${base}${environment.PRODUCT_CATALOG}/catalog?limit=${limit}&${partyParam}`;
    const prodSpecUrl = `${base}${environment.PRODUCT_CATALOG}${environment.PRODUCT_SPEC}?limit=${limit}&${partyParam}`;
    const servSpecUrl = `${base}${environment.SERVICE}${environment.SERVICE_SPEC}?limit=${limit}&${partyParam}`;
    const resSpecUrl = `${base}${environment.RESOURCE}${environment.RESOURCE_SPEC}?limit=${limit}&${partyParam}`;
    const usageSpecUrl = `${base}/usage/usageSpecification?limit=${limit}&${partyParam}`;

    const safeCount = async (url: string) => {
      try {
        const items = await firstValueFrom(this.http.get<any[]>(url));
        return Array.isArray(items) ? items.length : 0;
      } catch {
        return 0;
      }
    };

    const [offers, catalogs, prods, servs, ress, softwares, usageSpecs] = await Promise.all([
      safeCount(offersUrl),
      this.catalogManagementEnabled ? safeCount(catalogsUrl) : Promise.resolve(0),
      safeCount(prodSpecUrl),
      safeCount(servSpecUrl),
      safeCount(resSpecUrl),
      this.api.getSoftwareResourceByUserPaged({ limit: 1, offset: 0 }, undefined, [], partyId).then(res => res.total).catch(() => 0),
      safeCount(usageSpecUrl),
    ]);

    this.productOffersCount = offers;
    this.catalogsCount = catalogs;
    this.productSpecsCount = prods;
    this.serviceSpecsCount = servs;
    this.resourceSpecsCount = ress;
    this.softwaresCount = softwares;
    this.usageSpecsCount = usageSpecs;
    this.sections = this.buildSections();
  }

  private buildSections(): SideNavSection[] {
    return [
      {
        items: [
          ...(this.catalogManagementEnabled
            ? [{
                label: 'OFFERINGS._catalogs',
                routerLink: segments.catalogues,
                icon: 'bars' as IconName,
                count: this.catalogsCount,
                dataCy: 'catalogSection',
              }]
            : []),
          {
            label: 'OFFERINGS._product_offers',
            routerLink: segments.offers,
            icon: 'box' as IconName,
            count: this.productOffersCount,
            dataCy: 'offerSection',
          },
          // Software is now managed inside Resources (SoftwareSpecification / SoftwareSupportPackageSpecification baseTemplate).
          // {
          //   label: 'Software',
          //   routerLink: segments.softwares,
          //   icon: 'microchip' as IconName,
          //   count: this.softwaresCount,
          //   dataCy: 'softwareSection',
          // },
        ],
      },
      {
        label: 'OFFERINGS._specifications',
        items: [
          { label: 'OFFERINGS._products', routerLink: segments.productSpecs, count: this.productSpecsCount, dataCy: 'prdSpecSection' },
          { label: 'OFFERINGS._services', routerLink: segments.serviceSpecs, count: this.serviceSpecsCount, dataCy: 'servSpecSection' },
          { label: 'OFFERINGS._resources', routerLink: segments.resourceSpecs, count: this.resourceSpecsCount, dataCy: 'resSpecSection' },
          { label: 'USAGE_SPECS._usage_spec', routerLink: segments.usageSpecs, count: this.usageSpecsCount, dataCy: 'usageSpecSection' },
        ],
      },
    ];
  }
}
