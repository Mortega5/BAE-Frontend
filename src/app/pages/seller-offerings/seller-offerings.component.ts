import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { LocalStorageService } from "src/app/services/local-storage.service";
import { environment } from 'src/environments/environment';
import { EventMessageService } from "../../services/event-message.service";
import { SellerOfferingsPaths } from './seller-offerings.paths';

const { segments } = SellerOfferingsPaths;

@Component({
  selector: 'app-seller-offerings',
  templateUrl: './seller-offerings.component.html',
  styleUrl: './seller-offerings.component.css'
})
export class SellerOfferingsComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private router: Router,
    private route: ActivatedRoute,
    private quoteService: QuoteService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        switch (ev.type) {
          case 'SellerCreateProductSpec':
            if (ev.value == true) this.router.navigate([segments.productSpecs, segments.new], { relativeTo: this.route });
            break;
          case 'SellerCreateServiceSpec':
            if (ev.value == true) this.router.navigate([segments.serviceSpecs, segments.new], { relativeTo: this.route });
            break;
          case 'SellerCreateResourceSpec':
            if (ev.value == true) this.router.navigate([segments.resourceSpecs, segments.new], { relativeTo: this.route });
            break;
          case 'SellerCreateOffer':
            if (ev.value == true) this.router.navigate([segments.offers, segments.new], { relativeTo: this.route });
            break;
          case 'SellerCatalogCreate':
            if (ev.value == true) this.router.navigate([segments.catalogues, segments.new], { relativeTo: this.route });
            break;
          case 'SellerUpdateProductSpec':
            this.router.navigate([segments.productSpecs, (ev.value as any).id], { relativeTo: this.route });
            break;
          case 'SellerUpdateServiceSpec':
            this.router.navigate([segments.serviceSpecs, (ev.value as any).id], { relativeTo: this.route });
            break;
          case 'SellerUpdateResourceSpec':
            this.router.navigate([segments.resourceSpecs, (ev.value as any).id], { relativeTo: this.route });
            break;
          case 'SellerUpdateOffer':
            this.router.navigate([segments.offers, (ev.value as any).id], { relativeTo: this.route });
            break;
          case 'SellerCreateCustomOffer': {
            const evValue = ev.value as { offer: any, partyId?: string };
            this.router.navigate([segments.offers, segments.custom], {
              relativeTo: this.route,
              queryParams: { offerId: evValue.offer?.id, partyId: evValue.partyId },
            });
            break;
          }
          case 'SellerCatalogUpdate':
            this.router.navigate([segments.catalogues, (ev.value as any).id], { relativeTo: this.route });
            break;
          case 'SellerCreateSoftware':
            if (ev.value == true) this.router.navigate([segments.softwares, segments.new], { relativeTo: this.route });
            break;
          case 'SellerSoftwareUpdate':
            this.router.navigate([segments.softwares, (ev.value as any).id], { relativeTo: this.route });
            break;
        }
      })
  }

  async ngOnInit() {

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
}
