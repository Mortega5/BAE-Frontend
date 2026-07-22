import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { environment } from 'src/environments/environment';
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
    private router: Router,
    private route: ActivatedRoute,
    private quoteService: QuoteService,
  ) {
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
