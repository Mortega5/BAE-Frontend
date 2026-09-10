import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { TranslateService } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { billingAccountCart } from 'src/app/models/interfaces';
import { components } from "src/app/models/product-catalog";
import { ProductInventoryPaths } from 'src/app/pages/product-inventory/product-inventory.paths';
import { ProductOrdersPaths } from 'src/app/pages/product-orders/product-orders.paths';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { BadgeStatus } from 'src/app/shared/badge/badge.component';
import { environment } from 'src/environments/environment';
type ProductOffering = components["schemas"]["ProductOffering"];

@Component({
  selector: 'inventory-products',
  templateUrl: './inventory-products.component.html',
  styleUrl: './inventory-products.component.css'
})
export class InventoryProductsComponent implements OnInit, OnDestroy {

  protected readonly faSwatchbook = faSwatchbook;

  inventory: any[] = [];
  partyId: any = '';
  loading: boolean = false;
  unsubscribeModal: boolean = false;
  prodToUnsubscribe: any;
  filters: any[] = ['active', 'created'];
  loading_more: boolean = false;
  /** 5 per page, not 6, so a 6th grid cell is free for the "load more" tile when there's more. */
  pageSize: number = 5;
  total: number = 0;

  get hasMore(): boolean {
    return this.inventory.length < this.total;
  }
  /** Populated by loadModifyData() right before opening the "modify" price-plan drawer. */
  selectedProduct: any;
  selectedInv: any;
  productOff: any;

  private destroy$ = new Subject<void>();

  isModifyDrawerOpen: boolean = false;
  selectedProdSpec: any;
  billingAddresses: billingAccountCart[] = [];
  selectedBillingAddress: any = null;
  showBillingSelector: boolean = false;
  pendingModifyPayload: any = null;

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
    private accountService: AccountServiceService,
    private translate: TranslateService,
    private notificationService: NotificationService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initInventory();
        }
      })
  }

  ngOnInit() {
    this.initInventory();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initInventory() {
    this.loading = true;

    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
      this.getInventory(false);
    }
    initFlowbite();
  }

  @HostListener('document:click')
  onClick() {
    if (this.unsubscribeModal == true) {
      this.unsubscribeModal = false;
      this.cdr.detectChanges();
    }
    if (this.openCardMenuIdx !== null) {
      this.openCardMenuIdx = null;
      this.cdr.detectChanges();
    }
  }

  openCardMenuIdx: number | null = null;

  toggleCardMenu(idx: number, event: Event): void {
    event.stopPropagation();
    this.openCardMenuIdx = this.openCardMenuIdx === idx ? null : idx;
  }

  statusBadgeVariant(status: string): BadgeStatus {
    switch (status) {
      case 'active': return 'info';
      case 'created': return 'success';
      case 'suspended': return 'warning';
      case 'terminated': return 'danger';
      default: return 'neutral';
    }
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'active': return 'PRODUCT_INVENTORY._active';
      case 'created': return 'PRODUCT_INVENTORY._created';
      case 'suspended': return 'PRODUCT_INVENTORY._suspended';
      case 'terminated': return 'PRODUCT_INVENTORY._terminated';
      default: return status;
    }
  }

  getProductImage(prod: ProductOffering) {
    let images: any[] = []
    if (prod?.attachment) {
      let profile = prod?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
      images = prod.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
      if (profile.length != 0) {
        images = profile;
      }
    }
    return images.length > 0 ? images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  goToProductDetails(productOff: ProductOffering | undefined) {
    document.querySelector("body > div[modal-backdrop]")?.remove()
    this.router.navigate([ProductInventoryPaths.detail(productOff?.id ?? '')]);
  }

  // TEMPORARY: shows the product detail inline (passing the already-fetched list item
  // directly, so it doesn't need to re-fetch it and hit the same backend authorization bug
  // as GET-by-id) instead of navigating to goToProductDetails()'s route. Revert to
  // goToProductDetails() once that backend bug (relatedParty.role mismatch) is fixed.
  showDetails = false;

  openProductDetails(inv: any) {
    this.selectedInv = inv;
    this.showDetails = true;
  }

  closeProductDetails() {
    this.showDetails = false;
  }

  async getInventory(next: boolean) {
    if (next == false) {
      this.loading = true;
      this.inventory = [];
    }

    const offset = next ? this.inventory.length : 0;

    const data = await this.paginationService.getInventoryPaged(
      { limit: this.pageSize, offset },
      undefined,
      this.filters,
      this.partyId
    );

    this.inventory = next ? [...this.inventory, ...data.items] : data.items;
    this.total = data.total;
    this.loading = false;
    this.loading_more = false;
    initFlowbite();
  }

  onStateFilterChange(filter: string) {
    const index = this.filters.findIndex(item => item === filter);
    if (index !== -1) {
      this.filters.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.filters)
    } else {
      console.log('añade filtro')
      console.log(this.filters)
      this.filters.push(filter)
    }
    this.getInventory(false);
  }

  async next() {
    this.loading_more = true;
    try {
      await this.getInventory(true);
    } finally {
      this.loading_more = false;
    }
  }

  onUnsubscribeConfirmResolved(confirmed: boolean) {
    if (confirmed) {
      void this.unsubscribeProduct();
    } else {
      this.unsubscribeModal = false;
    }
  }

  async unsubscribeProduct() {
    const inv = this.prodToUnsubscribe;
    const orderItem: any = {
      id: inv.productOffering.id,
      action: 'delete',
      productOffering: {
        id: inv.productOffering.id,
        href: inv.productOffering.id
      },
      product: {
        id: inv.id,
        productCharacteristic: []
      }
    };
    this.unsubscribeModal = false;
    await this.onModifySubmit(orderItem);
  }

  showUnsubscribeModal(inv: any) {
    this.unsubscribeModal = true;
    this.prodToUnsubscribe = inv;
  }

  get unsubscribeConfirmMessage(): string {
    return this.translate.instant('PRODUCT_INVENTORY._cancel_sub', { name: this.prodToUnsubscribe?.product?.name ?? '' });
  }

  /** Fetches the product spec + offering data needed by the "modify" price-plan drawer. */
  private async loadModifyData(prod: any) {
    this.selectedProduct = prod;

    let spec = await this.api.getProductSpecification(this.selectedProduct.product.productSpecification.id)
    this.selectedProdSpec = spec;

    let prodOff = await this.api.getProductById(this.selectedProduct.productOffering.id);
    let prodPrices: any[] | undefined = prodOff.productOfferingPrice;
    let prices: any[] = [];
    if (prodPrices !== undefined) {
      for (let j = 0; j < prodPrices.length; j++) {
        let price = await this.api.getProductPrice(prodPrices[j].id);
        prices.push(price);
      }
    }

    this.productOff = {
      id: prodOff.id,
      name: prodOff.name,
      category: prodOff.category,
      description: prodOff.description,
      lastUpdate: prodOff.lastUpdate,
      attachment: spec.attachment,
      productOfferingPrice: prices,
      productSpecification: prodOff.productSpecification,
      productOfferingTerm: prodOff.productOfferingTerm,
      serviceLevelAgreement: prodOff.serviceLevelAgreement,
      version: prodOff.version
    }
  }

  async openModifyFromCard(inv: any) {
    await this.loadModifyData(inv);
    this.isModifyDrawerOpen = true;
  }

  async onModifySubmit(orderItem: any) {
    this.pendingModifyPayload = orderItem;
    await this.getBilling();
    this.showBillingSelector = true;
  }

  async getBilling() {
    this.selectedBillingAddress = null;
    this.billingAddresses = [];
    let data = await this.accountService.getBillingAccount();
    for (let i = 0; i < data.length; i++) {
      let isBillSelected = false;
      let email = '';
      let phone = '';
      let phoneType = '';
      let address = {
        city: '',
        country: '',
        postCode: '',
        stateOrProvince: '',
        street: ''
      };
      if (data[i].contact) {
        for (let j = 0; j < data[i].contact[0].contactMedium.length; j++) {
          if (data[i].contact[0].contactMedium[j].mediumType == 'Email') {
            email = data[i].contact[0].contactMedium[j].characteristic.emailAddress;
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'PostalAddress') {
            address = {
              city: data[i].contact[0].contactMedium[j].characteristic.city,
              country: data[i].contact[0].contactMedium[j].characteristic.country,
              postCode: data[i].contact[0].contactMedium[j].characteristic.postCode,
              stateOrProvince: data[i].contact[0].contactMedium[j].characteristic.stateOrProvince,
              street: data[i].contact[0].contactMedium[j].characteristic.street1
            };
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'TelephoneNumber') {
            phone = data[i].contact[0].contactMedium[j].characteristic.phoneNumber;
            phoneType = data[i].contact[0].contactMedium[j].characteristic.contactType;
          }
          if (data[i].contact[0].contactMedium[j].preferred == true) {
            isBillSelected = true;
          }
        }
      }
      const baddr: billingAccountCart = {
        id: data[i].id,
        href: data[i].href,
        name: data[i].name,
        email: email ?? '',
        postalAddress: address ?? {},
        telephoneNumber: phone ?? '',
        telephoneType: phoneType ?? '',
        selected: isBillSelected
      };
      this.billingAddresses.push(baddr);
      if (isBillSelected) {
        this.selectedBillingAddress = baddr;
      }
    }
    this.cdr.detectChanges();
  }

  onBillingSelected(baddr: billingAccountCart) {
    this.selectedBillingAddress = baddr;
  }

  async confirmModify() {
    if (!this.pendingModifyPayload || !this.selectedBillingAddress) return;

    const productOrder = {
      productOrderItem: [this.pendingModifyPayload],
      relatedParty: [{ id: this.partyId, href: this.partyId, role: environment.BUYER_ROLE }],
      billingAccount: { id: this.selectedBillingAddress.id, href: this.selectedBillingAddress.id },
      priority: '4',
      notificationContact: this.selectedBillingAddress.email
    };

    try {
      const response = await firstValueFrom(this.orderService.postProductOrder(productOrder));
      const redirectUrl = response.headers.get('X-Redirect-URL');

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        this.showBillingSelector = false;
        this.pendingModifyPayload = null;
        this.notificationService.showSuccess('PRODUCT_INVENTORY._modify_success');
        this.router.navigate([ProductOrdersPaths.root()]);
      }
    } catch (error: any) {
      console.error('Error submitting modify order:', error);
      const details = error?.error?.error || error?.error?.message || error?.message;
      this.notificationService.showError('PRODUCT_INVENTORY._modify_error', details ? { details } : undefined);
    }
    this.showBillingSelector = false;
  }

}
