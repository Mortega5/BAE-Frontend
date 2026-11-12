import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { inventoryStatusBadgeVariant, inventoryStatusLabel } from 'src/app/shared/badge/badge.component';
import { environment } from 'src/environments/environment';
import { ProductInventoryPaths } from '../../product-inventory/product-inventory.paths';

/** How many latest offers and acquired products the overview shows. */
const NEW_OFFERS = 4;
const ACQUIRED_PRODUCTS = 3;

/** The overview of a user who buys: the marketplace to get new products from, what they have acquired, and their orders
 * that are still pending. */
@Component({
  selector: 'app-buyer-overview',
  templateUrl: './buyer-overview.component.html',
})
export class BuyerOverviewComponent implements OnInit, OnDestroy {
  readonly buyerRole = environment.BUYER_ROLE;
  readonly inventoryStatusBadgeVariant = inventoryStatusBadgeVariant;
  readonly inventoryStatusLabel = inventoryStatusLabel;

  partyId: any;
  newOffers: any[] = [];
  loadingOffers = true;
  acquired: any[] = [];
  loadingAcquired = true;
  /** Reading the acquired products again, from the refresh button. */
  refreshingAcquired = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
    private paginationService: PaginationService,
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ChangedSession') {
        this.initPartyInfo();
        void this.loadAcquired();
      }
    });
  }

  ngOnInit(): void {
    this.initPartyInfo();
    void this.loadNewOffers();
    void this.loadAcquired();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initPartyInfo(): void {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    this.partyId = aux.logged_as == aux.id
      ? aux.partyId
      : aux.organizations?.find((element: { id: any }) => element.id == aux.logged_as)?.partyId;
  }

  /** The latest offers of the marketplace. */
  private async loadNewOffers(): Promise<void> {
    this.loadingOffers = true;
    try {
      const page = await this.api.getOfferingsPaged({
        limit: NEW_OFFERS, offset: 0, visibility: 'public', orderBy: 'lastUpdate', orderDirection: 'desc',
      });
      this.newOffers = await this.api.getProductsDetails(page.items);
    } catch (error) {
      console.error('Error reading the latest offers:', error);
      this.newOffers = [];
    } finally {
      this.loadingOffers = false;
    }
  }

  /** What the user has acquired and still has: the latest products of their inventory. */
  private async loadAcquired(): Promise<void> {
    this.loadingAcquired = true;
    try {
      this.acquired = await this.readAcquired();
    } finally {
      this.loadingAcquired = false;
    }
  }

  private async readAcquired(): Promise<any[]> {
    try {
      const page = await this.paginationService.getInventoryPaged(
        { limit: ACQUIRED_PRODUCTS, offset: 0 }, undefined, ['active', 'created'], this.partyId);
      return page.items;
    } catch (error) {
      console.error('Error reading the inventory:', error);
      return [];
    }
  }

  /** Reads the acquired products again. The card keeps its content, dimmed under a spinner, so it does not change size. */
  async refreshAcquired(): Promise<void> {
    if (this.refreshingAcquired) return;
    this.refreshingAcquired = true;
    try {
      this.acquired = await this.readAcquired();
    } finally {
      this.refreshingAcquired = false;
    }
  }

  getProductImage(prod: any): string {
    const pictures: any[] = prod?.attachment?.filter((item: any) => item.attachmentType === 'Picture') ?? [];
    const profile = prod?.attachment?.filter((item: any) => item.name === 'Profile Picture') ?? [];
    const images = profile.length > 0 ? profile : pictures;
    return images.length > 0 ? images[0].url : 'https://placehold.co/600x400/svg';
  }

  goToMarketplace(): void {
    this.router.navigate(['/search']);
  }

  /** The detail of the product, on its own route; the item it already has goes along, so it is not read again. */
  openAcquired(inv: any): void {
    this.router.navigate([ProductInventoryPaths.detail(inv.id)], { state: { inv } });
  }

  goToInventory(): void {
    this.router.navigate([ProductInventoryPaths.root()]);
  }
}
