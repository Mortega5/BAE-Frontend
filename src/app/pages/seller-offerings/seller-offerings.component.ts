import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { EventMessageService } from "../../services/event-message.service";

export enum SellerSection {
  CATALOGS = 'catalogs',
  PROD_SPECS = 'productspec',
  SERVICE_SPECS = 'servicespec',
  RESOURCE_SPECS = 'resourcespec',
  OFFERS = 'offers',
  SOFTWARE_LIST = 'softwarelist',
  CREATE_SOFTWARE = "createSoftware",
  CREATE_PROD_SPEC = 'create_prod_spec',
  CREATE_SERV_SPEC = 'create_serv_spec',
  CREATE_RES_SPEC = 'create_res_spec',
  CREATE_OFFER = 'create_offer',
  CREATE_CATALOG = 'create_catalog',
  CREATE_CUSTOM_OFFER = 'create_custom_offer',
  UPDATE_PROD_SPEC = 'update_prod_spec',
  UPDATE_SERV_SPEC = 'update_serv_spec',
  UPDATE_RES_SPEC = 'update_res_spec',
  UPDATE_OFFER = 'update_offer',
  UPDATE_CATALOG = 'update_catalog',
  UPDATE_SOFTWARE = "updateSoftware",
}

@Component({
  selector: 'app-seller-offerings',
  templateUrl: './seller-offerings.component.html',
  styleUrl: './seller-offerings.component.css'
})
export class SellerOfferingsComponent implements OnInit, OnDestroy {

  SellerSection = SellerSection;
  currentSection: SellerSection = SellerSection.CATALOGS;

  prod_to_update: any;
  serv_to_update: any;
  res_to_update: any;
  offer_to_update: any;
  custom_offer_partyId: any = null;
  catalog_to_update: any;
  software_to_update: any;

  private readonly navSections: Partial<Record<SellerSection, string>> = {
    [SellerSection.CATALOGS]: 'catalogs-button',
    [SellerSection.OFFERS]: 'offers-button',
    [SellerSection.PROD_SPECS]: 'prod-spec-button',
    [SellerSection.SERVICE_SPECS]: 'sev-spec-button',
    [SellerSection.RESOURCE_SPECS]: 'res-spec-button',
    [SellerSection.SOFTWARE_LIST]: 'software-button',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private cdr: ChangeDetectorRef,
    private eventMessage: EventMessageService,
    private router: Router,
    private quoteService: QuoteService,
    private api: ApiServiceService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        switch (ev.type) {
          case 'SellerProductSpec':
            this.goToProdSpec();
            break;
          case 'SellerCreateProductSpec':
            if (ev.value == true) this.goToCreateProdSpec();
            break;
          case 'SellerServiceSpec':
            if (ev.value == true) this.goToServiceSpec();
            break;
          case 'SellerCreateServiceSpec':
            if (ev.value == true) this.goToCreateServSpec();
            break;
          case 'SellerResourceSpec':
            if (ev.value == true) this.goToResourceSpec();
            break;
          case 'SellerCreateResourceSpec':
            if (ev.value == true) this.goToCreateResSpec();
            break;
          case 'SellerOffer':
            if (ev.value == true) this.goToOffers();
            break;
          case 'SellerCatalog':
            if (ev.value == true) this.goToCatalogs();
            break;
          case 'SellerCreateOffer':
            if (ev.value == true) this.goToCreateOffer();
            break;
          case 'SellerCatalogCreate':
            if (ev.value == true) this.goToCreateCatalog();
            break;
          case 'SellerUpdateProductSpec':
            this.prod_to_update = ev.value;
            this.goToUpdateProdSpec();
            break;
          case 'SellerUpdateServiceSpec':
            this.serv_to_update = ev.value;
            this.goToUpdateServiceSpec();
            break;
          case 'SellerUpdateResourceSpec':
            this.res_to_update = ev.value;
            this.goToUpdateResourceSpec();
            break;
          case 'SellerUpdateOffer':
            this.offer_to_update = ev.value;
            this.goToUpdateOffer();
            break;
          case 'SellerCreateCustomOffer': {
            const evValue = ev.value as { offer: any, partyId?: string };
            this.offer_to_update = evValue.offer;
            this.custom_offer_partyId = evValue.partyId || null;
            this.goToCreateCustomOffer();
            break;
          }
          case 'SellerCatalogUpdate':
            this.catalog_to_update = ev.value;
            this.goToUpdateCatalog();
            break;
          case 'SellerSoftware':
            if (ev.value == true) this.goToSoftwareList();
            break;
          case 'SellerCreateSoftware':
            if (ev.value == true) this.goToCreateSoftware();
            break;
          case 'SellerSoftwareUpdate':
            this.software_to_update = ev.value;
            this.goToUpdateSoftware();
            break;
        }
      })
  }

  async ngOnInit() {
    const saved = localStorage.getItem('activeSection') as SellerSection | null;
    if (saved && this.navSections[saved]) {
      this.showSection(saved);
    }

    const state = history.state as { quoteId?: string };
    if (state && state.quoteId) {
      const quote = await firstValueFrom(this.quoteService.getQuoteById(state.quoteId));
      const offerId = quote?.quoteItem?.[0]?.productOffering?.id;
      let offer: any = null;
      if (offerId) {
        offer = await this.api.getProductById(offerId);
      }

      const quoteBuyer = quote?.relatedParty?.find((party: any) => party.role.toLowerCase() === environment.BUYER_ROLE.toLowerCase());
      this.eventMessage.emitSellerCreateCustomOffer(offer, quoteBuyer?.id);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private showSection(section: SellerSection) {
    const buttonId = this.navSections[section];
    if (buttonId) {
      localStorage.setItem('activeSection', section);
      this.selectNavButton(buttonId);
    }
    this.currentSection = section;
    this.cdr.detectChanges();
  }

  private selectNavButton(activeId: string) {
    const cls = ['text-white', 'bg-primary-100'];
    ['catalogs-button', 'offers-button', 'software-button', 'prod-spec-button', 'sev-spec-button', 'res-spec-button'].forEach(id =>
      document.getElementById(id)?.classList[id === activeId ? 'add' : 'remove'](...cls)
    );
  }

  goToCreateProdSpec() { this.showSection(SellerSection.CREATE_PROD_SPEC); }
  goToUpdateProdSpec() { this.showSection(SellerSection.UPDATE_PROD_SPEC); }
  goToCreateCatalog() { this.showSection(SellerSection.CREATE_CATALOG); }
  goToUpdateCatalog() { this.showSection(SellerSection.UPDATE_CATALOG); }
  goToUpdateOffer() { this.showSection(SellerSection.UPDATE_OFFER); }
  goToCreateCustomOffer() { this.showSection(SellerSection.CREATE_CUSTOM_OFFER); }
  goToUpdateServiceSpec() { this.showSection(SellerSection.UPDATE_SERV_SPEC); }
  goToUpdateResourceSpec() { this.showSection(SellerSection.UPDATE_RES_SPEC); }
  goToCreateServSpec() { this.showSection(SellerSection.CREATE_SERV_SPEC); }
  goToCreateResSpec() { this.showSection(SellerSection.CREATE_RES_SPEC); }
  goToCreateOffer() { this.showSection(SellerSection.CREATE_OFFER); }
  goToCatalogs() { this.showSection(SellerSection.CATALOGS); }
  goToProdSpec() { this.showSection(SellerSection.PROD_SPECS); }
  goToServiceSpec() { this.showSection(SellerSection.SERVICE_SPECS); }
  goToResourceSpec() { this.showSection(SellerSection.RESOURCE_SPECS); }
  goToOffers() { this.showSection(SellerSection.OFFERS); }
  goToSoftwareList() { this.showSection(SellerSection.SOFTWARE_LIST); }
  goToCreateSoftware() {
    this.showSection(SellerSection.CREATE_SOFTWARE);
  }
  goToUpdateSoftware() {
    this.showSection(SellerSection.UPDATE_SOFTWARE)
  }
}
