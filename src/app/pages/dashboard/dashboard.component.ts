import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { firstValueFrom, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { EventMessageService } from 'src/app/services/event-message.service';
import { ThemeService } from 'src/app/services/theme.service';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { WorkspaceHelpConfig } from 'src/app/themes';
import { environment } from 'src/environments/environment';
import { AnalyticsPaths } from '../analytics/analytics.paths';
import { ProductInventoryPaths } from '../product-inventory/product-inventory.paths';
import { ProductOrdersPaths } from '../product-orders/product-orders.paths';
import { SellerOfferingsPaths } from '../seller-offerings/seller-offerings.paths';
import { DashboardPaths } from './dashboard.paths';

/** Shell of the user workspace: a side menu with everything the user owns and the routed page next to it. */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit, OnDestroy {

  catalogManagementEnabled: boolean = environment.CATALOG_MANAGEMENT_ENABLED;
  /** False on the create/edit pages of an offering, which take the full width (the mobile menu stays). */
  isListView = true;

  workspaceHelpAction?: WorkspaceHelpConfig;

  sections: SideNavSection[] = this.buildSections();

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private quoteService: QuoteService,
    private themeService: ThemeService,
    private authGuard: AuthGuard,
    private eventMessage: EventMessageService,
  ) {
    this.router.events
      .pipe(
        filter((ev): ev is NavigationEnd => ev instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(() => this.updateIsListView());
    // The menu depends on the roles of the active session
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.sections = this.buildSections();
        }
      });
    this.updateIsListView();
  }

  async ngOnInit() {
    const theme = this.themeService.getCurrentThemeConfig();
    this.workspaceHelpAction = theme?.workspace?.sellerOfferingsHelp;

    const state = history.state as { quoteId?: string };
    if (state && state.quoteId) {
      const quote = await firstValueFrom(this.quoteService.getQuoteById(state.quoteId));
      const offerId = quote?.quoteItem?.[0]?.productOffering?.id;
      const quoteBuyer = quote?.relatedParty?.find((party: any) => party.role.toLowerCase() === environment.BUYER_ROLE.toLowerCase());
      if (offerId) {
        this.router.navigate([SellerOfferingsPaths.offers.custom()], {
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

  private updateIsListView() {
    const path = this.router.url.split('?')[0];
    // <area>/<section>/<id|new> is a form; anything else is a list
    const areas = [DashboardPaths.offerings()];
    this.isListView = !areas.some(area =>
      path.startsWith(`${area}/`) && path.slice(area.length + 1).split('/').filter(Boolean).length > 1);
  }

  private buildSections(): SideNavSection[] {
    const isSeller = this.authGuard.hasAnyRole(['seller']);
    const tendersEnabled = environment.TENDER_ENABLED && environment.QUOTES_ENABLED;

    const sections: SideNavSection[] = [
      {
        items: [
          { label: 'WORKSPACE._overview', routerLink: DashboardPaths.overview(), icon: 'chart-pie' as IconName, dataCy: 'overviewSection' },
          // One entry: products, services and resources are tabs inside the page
          { label: 'PRODUCT_INVENTORY._inventory', routerLink: ProductInventoryPaths.root(), icon: 'layer-group' as IconName, dataCy: 'inventorySection' },
        ],
      },
    ];

    if (isSeller) {
      sections.push(
        {
          label: 'WORKSPACE._products',
          items: [
            // The product list: the offers the seller sells
            { label: 'WORKSPACE._products', routerLink: SellerOfferingsPaths.offers.list(), icon: 'box' as IconName, dataCy: 'offerSection' },
            ...(environment.DATASETS_ENABLED
              ? [{ label: 'WORKSPACE._datasets', routerLink: SellerOfferingsPaths.datasets.list(), icon: 'database' as IconName, dataCy: 'datasetSection' }]
              : []),
            ...(environment.API_ACCESS_ENABLED
              ? [{ label: 'WORKSPACE._apis', routerLink: SellerOfferingsPaths.apis.list(), icon: 'code' as IconName, dataCy: 'apiSection' }]
              : []),
          ],
        },
        {
          label: 'WORKSPACE._product_specs',
          defaultCollapsed: true,
          items: [
            ...(this.catalogManagementEnabled
              ? [{
                label: 'OFFERINGS._catalogs',
                routerLink: SellerOfferingsPaths.catalogues.list(),
                icon: 'bars' as IconName,
                dataCy: 'catalogSection',
              }]
              : []),
            { label: 'OFFERINGS._products', routerLink: SellerOfferingsPaths.productSpecs.list(), icon: 'layer-group' as IconName, dataCy: 'prdSpecSection' },
            { label: 'OFFERINGS._services', routerLink: SellerOfferingsPaths.serviceSpecs.list(), icon: 'plug-circle-plus' as IconName, dataCy: 'servSpecSection' },
            { label: 'OFFERINGS._resources', routerLink: SellerOfferingsPaths.resourceSpecs.list(), icon: 'server' as IconName, dataCy: 'resSpecSection' },
            { label: 'USAGE_SPECS._usage_spec', routerLink: SellerOfferingsPaths.usageSpecs.list(), icon: 'chart-line' as IconName, dataCy: 'usageSpecSection' },
          ],
        },
      );
    }

    sections.push({
      label: 'WORKSPACE._activity',
      items: [
        { label: 'PRODUCT_ORDERS._orders', routerLink: ProductOrdersPaths.orders(), icon: 'clipboard-list' as IconName, dataCy: 'ordersSection' },
        { label: 'PRODUCT_ORDERS._invoices', routerLink: ProductOrdersPaths.invoice(), icon: 'file-lines' as IconName, dataCy: 'invoices' },
        ...(environment.QUOTES_ENABLED
          ? [{ label: 'WORKSPACE._quotes', routerLink: DashboardPaths.quotes(), icon: 'handshake' as IconName, dataCy: 'quotesSection' }]
          : []),
        ...(tendersEnabled
          ? [{ label: 'WORKSPACE._tenders', routerLink: DashboardPaths.tenders(), icon: 'scale-balanced' as IconName, dataCy: 'tendersSection' }]
          : []),
      ],
    });

    if (environment.analyticsEnabled) {
      sections.push({
        label: 'ANALYTICS._analytics',
        defaultCollapsed: true,
        items: [
          { label: 'ANALYTICS._business_insights', routerLink: AnalyticsPaths.businessInsights(), icon: 'chart-line' as IconName, dataCy: 'analyticsBusinessInsights' },
          ...(this.authGuard.hasAnyRole(['admin'])
            ? [{ label: 'ANALYTICS._usage_monitor', routerLink: AnalyticsPaths.usageMonitor(), icon: 'display-chart-up' as IconName, dataCy: 'analyticsUsageMonitor' }]
            : []),
        ],
      });
    }

    // Every titled group can be folded and is set off by a rule
    return sections.map(section => section.label ? { ...section, collapsible: true, divider: true } : section);
  }
}
