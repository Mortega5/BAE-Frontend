import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { faCircleCheck, faStickyNote } from '@fortawesome/pro-solid-svg-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { orderStateBadgeVariant, orderStateLabel } from 'src/app/shared/badge/badge.component';
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';
import { OrderDetailsComponent } from 'src/app/shared/order-details/order-details.component';
import { ProductOrdersPaths } from '../../product-orders/product-orders.paths';

/** The states of the orders that still have something to do: received and not started, or being treated. The others
 * (completed, failed...) are final. A new order comes without any state at all, which is the most pending of all. */
const ATTENTION_STATES = ['acknowledged', 'inProgress'];
const needsAttention = (order: any): boolean => !order.state || ATTENTION_STATES.includes(order.state);

/** How many of the latest orders are looked through. The server cannot be asked for the orders that have no state, so
 * they are told apart here; the ones that are pending are, by nature, among the latest. */
const ORDERS_LOOKED_THROUGH = 100;

/** The orders of the user that are still pending, as the provider who receives them or as the customer who made them
 * (`role`): a table of them, oldest first, each opening its detail in a modal and its conversation in a drawer. */
@Component({
  selector: 'app-pending-orders-card',
  templateUrl: './pending-orders-card.component.html',
})
export class PendingOrdersCardComponent implements OnInit, OnDestroy {
  /** The role the user acts as in these orders (the configured seller or buyer role). */
  @Input({ required: true }) role!: string;
  /** i18n keys of the texts of the card. */
  @Input() title = 'WORKSPACE._pending_orders';
  @Input() subtitle = 'WORKSPACE._pending_orders_subtitle';
  @Input() emptyHeading = 'WORKSPACE._pending_all_clear';
  @Input() emptyDescription = 'WORKSPACE._pending_all_clear_desc';
  @Input() allOrdersLabel = 'WORKSPACE._view_all_orders';

  partyId: any;
  /** The orders that are pending, the oldest first; null until read. */
  private pendingOrders: any[] | null = null;
  /** How many are pending; null until read. */
  pending: number | null = null;
  /** Reading them again, from the refresh button. */
  refreshing = false;

  readonly checkIcon = faCircleCheck;
  readonly pageSizeOptions = [5];

  @ViewChild('ordersTable') private ordersTable?: PaginatedTableComponent<any>;
  @ViewChild(OrderDetailsComponent) private orderDetails?: OrderDetailsComponent;

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

  constructor(
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private orderService: ProductOrderService,
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ChangedSession') {
        this.init();
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
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    this.partyId = aux.logged_as == aux.id
      ? aux.partyId
      : aux.organizations?.find((element: { id: any }) => element.id == aux.logged_as)?.partyId;
    this.pending = null;
    void this.loadPending().then(() => this.ordersTable?.refresh(true));
  }

  /** Reads the latest orders once and keeps the ones that are pending, the oldest first, since those have been waiting
   * the longest. The table pages through what is kept. */
  private async loadPending(): Promise<void> {
    try {
      const page = await this.orderService.getProductOrdersPaged(
        { limit: ORDERS_LOOKED_THROUGH, offset: 0, orderBy: 'orderDate', orderDirection: 'desc' }, undefined, [], this.partyId, this.role);
      this.pendingOrders = page.items.filter(needsAttention).reverse();
    } catch (error) {
      console.error('Error reading the pending orders:', error);
      this.pendingOrders = [];
    }
    this.pending = this.pendingOrders.length;
  }

  fetchOrders = async (params: PageRequest): Promise<PageResult<any>> => {
    const orders = this.pendingOrders ?? [];
    return { items: orders.slice(params.offset, params.offset + params.limit), total: orders.length };
  };

  /** Reads the orders again. The card keeps its content, dimmed under a spinner, so it does not change size. */
  async refresh(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      await this.loadPending();
      this.ordersTable?.refresh(true);
    } finally {
      this.refreshing = false;
    }
  }

  /** The order in its modal, right here. */
  openOrder(order: any): void {
    this.orderDetails?.openDetails(order);
  }

  /** An order moved along from its modal: the orders are read again, and the table with them. */
  async onOrderUpdated(): Promise<void> {
    await this.loadPending();
    this.ordersTable?.refresh();
  }

  goToOrders(): void {
    this.router.navigate([ProductOrdersPaths.orders()], { queryParams: { role: this.role } });
  }
}
