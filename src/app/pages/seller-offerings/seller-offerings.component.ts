import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IconName } from '@fortawesome/fontawesome-svg-core';
import { firstValueFrom, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { ThemeService } from 'src/app/services/theme.service';
import { SideNavSection } from 'src/app/shared/side-nav/side-nav.model';
import { WorkspaceHelpConfig } from 'src/app/themes';
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

  workspaceHelpAction?: WorkspaceHelpConfig;

  sections: SideNavSection[] = this.buildSections();

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private quoteService: QuoteService,
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
    this.updateIsListView();
  }

  private updateIsListView() {
    const path = this.router.url.split('?')[0];
    this.isListView = /^\/my-offerings\/[a-zA-Z]+\/?$/.test(path);
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
              dataCy: 'catalogSection',
            }]
            : []),
          {
            label: 'OFFERINGS._product_offers',
            routerLink: segments.offers,
            icon: 'box' as IconName,
            dataCy: 'offerSection',
          },
          // Software is now managed inside Resources (SoftwareSpecification / SoftwareSupportPackageSpecification baseTemplate).
          // {
          //   label: 'Software',
          //   routerLink: segments.softwares,
          //   icon: 'microchip' as IconName,
          //   dataCy: 'softwareSection',
          // },
        ],
      },
      {
        label: 'OFFERINGS._specifications',
        items: [
          { label: 'OFFERINGS._products', routerLink: segments.productSpecs, dataCy: 'prdSpecSection' },
          { label: 'OFFERINGS._services', routerLink: segments.serviceSpecs, dataCy: 'servSpecSection' },
          { label: 'OFFERINGS._resources', routerLink: segments.resourceSpecs, dataCy: 'resSpecSection' },
          { label: 'USAGE_SPECS._usage_spec', routerLink: segments.usageSpecs, dataCy: 'usageSpecSection' },
        ],
      },
    ];
  }
}
