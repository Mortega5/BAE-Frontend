import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { faCircleCheck, faStickyNote } from '@fortawesome/pro-solid-svg-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { API_PRODUCT_MARKER } from 'src/app/models/api-access.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { expandLifecycleStatusFilter, lifecycleStatusBadgeVariant, lifecycleStatusLabel, orderStateBadgeVariant, orderStateLabel } from 'src/app/shared/badge/badge.component';
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';
import { OrderDetailsComponent } from 'src/app/shared/order-details/order-details.component';
import { environment } from 'src/environments/environment';
import { ProductOrdersPaths } from '../../product-orders/product-orders.paths';
import { SellerOfferingsPaths } from '../../seller-offerings/seller-offerings.paths';

/** The states of the received orders the provider still has something to do with: received and not started, or being
 * treated. The others (completed, failed...) are final. A new order comes without any state at all, which is the most
 * pending of all. */
const ATTENTION_STATES = ['acknowledged', 'inProgress'];
const needsAttention = (order: any): boolean => !order.state || ATTENTION_STATES.includes(order.state);

/** How many of the latest received orders are looked through. The server cannot be asked for the orders that have no
 * state, so they are told apart here; the ones that wait for the provider are, by nature, among the latest. */
const ORDERS_LOOKED_THROUGH = 100;

type ProductKind = 'product' | 'dataset' | 'api';

interface CreateShortcut {
  label: string;
  description: string;
  icon: string;
  dataCy: string;
  path: string;
}

/** Landing of the workspace: what needs the provider's attention (received orders to treat), shortcuts to create a
 * product and the latest products. Everything about selling is for sellers only. */
@Component({
  selector: 'app-dashboard-overview',
  templateUrl: './dashboard-overview.component.html',
})
export class DashboardOverviewComponent implements OnInit, OnDestroy {
  isSeller = false;
  partyId: any;

  /** The received orders that wait for the provider, the oldest first; null until read. */
  private pendingOrders: any[] | null = null;
  /** How many wait; null until read. */
  pending: number | null = null;
  /** Reading the orders to attend again, from the refresh button of their card. */
  refreshingOrders = false;

  readonly checkIcon = faCircleCheck;
  readonly shortcuts: CreateShortcut[] = this.buildShortcuts();
  readonly pageSizeOptions = [5];

  @ViewChild('ordersTable') private ordersTable?: PaginatedTableComponent<any>;
  @ViewChild('productsTable') private productsTable?: PaginatedTableComponent<any>;
  @ViewChild(OrderDetailsComponent) private orderDetails?: OrderDetailsComponent;

  readonly sellerRole = environment.SELLER_ROLE;

  private destroy$ = new Subject<void>();

  readonly orderColumns: TableColumn<any>[] = [
    { header: 'PRODUCT_INVENTORY._order_id', getValue: (item: any) => item.id.slice(-36), hideOnMobile: true },
    {
      header: 'PRODUCT_INVENTORY._status', type: 'status-badge', getValue: (item: any) => orderStateLabel(item.state),
      getStatus: (item: any) => orderStateBadgeVariant(item.state), width: 'w-[180px]',
    },
    { header: 'PRODUCT_ORDERS._date', type: 'date', getValue: (item: any) => item.orderDate },
    {
      header: 'PRODUCT_ORDERS._actions', type: 'actions', width: 'w-[100px]',
      actions: [{ icon: faStickyNote, tooltip: 'PRODUCT_ORDERS._show_notes', dataCy: 'orderNotesButton', onClick: (item: any) => this.orderDetails?.openNotes(item) }],
    },
  ];

  readonly productColumns: TableColumn<any>[] = [
    { header: 'OFFERINGS._name', getValue: (item: any) => item.name ?? '-', cellClass: 'break-words' },
    { header: 'WORKSPACE._type', type: 'badge', getValue: (item: any) => `WORKSPACE._type_${item.kind}`, hideOnMobile: true, width: 'w-[140px]' },
    {
      header: 'OFFERINGS._status', type: 'status-badge', getValue: (item: any) => lifecycleStatusLabel(item.lifecycleStatus ?? ''),
      getStatus: (item: any) => lifecycleStatusBadgeVariant(item.lifecycleStatus ?? ''), width: 'w-[140px]',
    },
    { header: 'OFFERINGS._last_update', type: 'date', hideOnMobile: true, getValue: (item: any) => item.lastUpdate, width: 'w-[200px]' },
  ];

  constructor(
    private router: Router,
    private authGuard: AuthGuard,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private orderService: ProductOrderService,
    private api: ApiServiceService,
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ChangedSession') {
        this.init();
        this.productsTable?.refresh(true);
        this.ordersTable?.refresh(true);
      }
    });
  }

  ngOnInit(): void {
    this.init();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get countsLoaded(): boolean {
    return this.pending !== null;
  }

  private init(): void {
    this.isSeller = this.authGuard.hasAnyRole(['seller']);
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    this.partyId = aux.logged_as == aux.id
      ? aux.partyId
      : aux.organizations?.find((element: { id: any }) => element.id == aux.logged_as)?.partyId;
    this.pending = null;
    if (this.isSeller) void this.loadPending();
  }

  /** Reads the latest received orders once and keeps the ones that wait for the provider, the oldest first, since those
   * have been waiting the longest. The table pages through what is kept. */
  private async loadPending(): Promise<void> {
    try {
      const page = await this.orderService.getProductOrdersPaged(
        { limit: ORDERS_LOOKED_THROUGH, offset: 0, orderBy: 'orderDate', orderDirection: 'desc' }, undefined, [], this.partyId, environment.SELLER_ROLE);
      this.pendingOrders = page.items.filter(needsAttention).reverse();
    } catch (error) {
      console.error('Error reading the orders to attend:', error);
      this.pendingOrders = [];
    }
    this.pending = this.pendingOrders.length;
  }

  fetchOrders = async (params: PageRequest): Promise<PageResult<any>> => {
    const orders = this.pendingOrders ?? [];
    return { items: orders.slice(params.offset, params.offset + params.limit), total: orders.length };
  };

  /** The latest offers the user touched, each told apart as a product, a dataset or an API from its product spec. */
  fetchLatestProducts = async (params: PageRequest): Promise<PageResult<any>> => {
    params.orderBy = 'lastUpdate';
    params.orderDirection = 'desc';
    const status = expandLifecycleStatusFilter(['Active', 'Launched', 'Retired']);
    const page = await this.api.getProductOfferByOwnerPaged(params, undefined, status, this.partyId, undefined);
    const items = await Promise.all(page.items.map(async offer => ({ ...offer, kind: await this.kindOf(offer) })));
    return { items, total: page.total };
  };

  private async kindOf(offer: any): Promise<ProductKind> {
    try {
      const spec = await this.api.getProductSpecification(offer.productSpecification?.id);
      const characteristics: any[] = spec?.productSpecCharacteristic ?? [];
      if (characteristics.some(c => c.name === API_PRODUCT_MARKER)) return 'api';
      if (characteristics.some(c => c.valueType === 'dataset')) return 'dataset';
    } catch {
      // The row is still worth showing, as a plain product
    }
    return 'product';
  }

  iconOf(name: string) {
    return findButtonIcon(name);
  }

  /** The order in its modal, right here. */
  openOrder(order: any): void {
    this.orderDetails?.openDetails(order);
  }

  /** Reads the orders to attend again. The card keeps its content, dimmed under a spinner, so it does not change size. */
  async refreshOrders(): Promise<void> {
    if (this.refreshingOrders) return;
    this.refreshingOrders = true;
    try {
      await this.loadPending();
      this.ordersTable?.refresh(true);
    } finally {
      this.refreshingOrders = false;
    }
  }

  /** Reads the latest products again; the table shows its own loading. */
  refreshProducts(): void {
    this.productsTable?.refresh(true);
  }

  /** An order moved along from its modal: the orders are read again, and the table with them. */
  async onOrderUpdated(): Promise<void> {
    await this.loadPending();
    this.ordersTable?.refresh();
  }

  goToOrders(): void {
    this.router.navigate([ProductOrdersPaths.orders()], { queryParams: { role: environment.SELLER_ROLE } });
  }

  goToProducts(): void {
    this.router.navigate([SellerOfferingsPaths.offers.list()]);
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  /** Opens the offer in the section it belongs to, so going back returns to it. */
  openProduct(offer: any): void {
    const edit = offer.kind === 'dataset' && environment.DATASETS_ENABLED ? SellerOfferingsPaths.datasets.edit
      : offer.kind === 'api' && environment.API_ACCESS_ENABLED ? SellerOfferingsPaths.apis.edit
        : SellerOfferingsPaths.offers.edit;
    this.router.navigate([edit(offer.id)]);
  }

  /** One shortcut per kind of product the marketplace has enabled, and the one for a product of no particular kind. */
  private buildShortcuts(): CreateShortcut[] {
    const shortcuts: CreateShortcut[] = [
      { label: 'WORKSPACE._create_plain_product', description: 'WORKSPACE._create_plain_product_desc', icon: 'layer-group', dataCy: 'createProduct', path: SellerOfferingsPaths.offers.new() },
    ];
    if (environment.DATASETS_ENABLED) {
      shortcuts.push({ label: 'WORKSPACE._create_dataset', description: 'WORKSPACE._create_dataset_desc', icon: 'database', dataCy: 'createDataset', path: SellerOfferingsPaths.datasets.new() });
    }
    if (environment.API_ACCESS_ENABLED) {
      shortcuts.push({ label: 'WORKSPACE._create_api', description: 'WORKSPACE._create_api_desc', icon: 'code', dataCy: 'createApi', path: SellerOfferingsPaths.apis.new() });
    }
    return shortcuts;
  }
}
