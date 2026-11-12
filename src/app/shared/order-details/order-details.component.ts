import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faEdit, faPlay, faTrash, faXmark } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Drawer, initFlowbite, Modal } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { components } from 'src/app/models/product-catalog';
import { TableColumnAction } from 'src/app/models/table-column.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { PaginationService } from 'src/app/services/pagination.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { BadgeComponent, orderStateBadgeVariant, orderStateLabel } from 'src/app/shared/badge/badge.component';
import { ItemCardComponent } from 'src/app/shared/item-card/item-card.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
type ProductOffering = components['schemas']['ProductOffering'];

interface OrderItemAction extends TableColumnAction {
  /** Order-item lifecycle state this action transitions to. */
  state: string;
  /** i18n key for the bulk ("apply to all") variant of this button, when bulkable. */
  bulkTooltip?: string;
  /** Whether this action can be offered as a single "do it for all items" button
   * when every item in the order currently qualifies for it. */
  bulkable: boolean;
}

/** The detail of a product order in a modal (customer, financial summary, items with the provider's actions to move
 * them along) and its notes in a drawer. Shared by everything that lists orders: the host opens either with
 * `openDetails(order)` / `openNotes(order)` and hears back through `orderUpdated` when the state of an order changed. */
@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, SharedModule, ItemCardComponent, LoadingSpinnerComponent, BadgeComponent],
  providers: [DatePipe],
  templateUrl: './order-details.component.html',
})
export class OrderDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  /** The role the user looks at the orders as: the provider's actions are only offered to the seller. */
  @Input() role: string = environment.BUYER_ROLE;
  /** An order changed state: its id and the new state. */
  @Output() orderUpdated = new EventEmitter<{ id: string; state: string }>();

  partyId: any = '';
  currentUser!: string;
  showOrderDetails: boolean = false;
  orderToShow: any;
  loadingOrderDetails: boolean = false;
  customerName: string = '';

  priceSummary: { label: string; amount: number; unit: string }[] = [];
  hasCustomPricing: boolean = false;
  hasFreeItems: boolean = false;

  buyerRole: string = environment.BUYER_ROLE;
  sellerRole: string = environment.SELLER_ROLE;

    // Acknowledge/reject/start/complete/fail are seller-only actions on a buyer's
  // order, so the whole row of buttons is left out of each item card entirely
  // for the buyer role rather than rendered empty (see the *role === sellerRole*
  // guard around this array in the template).
  protected readonly orderItemActions: OrderItemAction[] = [
    {
      state: 'cancelled', icon: faXmark, tooltip: 'PRODUCT_ORDERS._reject_order', dataCy: 'rejectOrder',
      buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
      onClick: (item: any) => this.openModal('cancelled', item),
      showIf: (item: any) => this.canAcknowledgeOrReject(item),
      // Goes through the confirm modal (see onClick above), so it's excluded from
      // bulkItemActions instead of being wired up as a second, modal-less bulk path.
      bulkable: false,
    },
    {
      state: 'acknowledged', icon: faCheck, tooltip: 'PRODUCT_ORDERS._acknowledge_order', dataCy: 'acknowledgeOrder',
      bulkTooltip: 'PRODUCT_ORDERS._acknowledge_order_all',
      buttonClass: 'bg-primary-100 hover:bg-primary-50 focus:ring-primary-300 text-white',
      onClick: (item: any) => this.runItemAction('acknowledged', item, 'acknowledgeOrder'),
      showIf: (item: any) => this.canAcknowledgeOrReject(item),
      bulkable: true,
    },
    {
      state: 'inProgress', icon: faPlay, tooltip: 'PRODUCT_ORDERS._start_treatment', dataCy: 'startOrderTreatment',
      bulkTooltip: 'PRODUCT_ORDERS._start_treatment_all',
      buttonClass: 'bg-green-500 hover:bg-green-600 focus:ring-green-300 text-white',
      onClick: (item: any) => this.runItemAction('inProgress', item, 'startOrderTreatment'),
      showIf: (item: any) => this.isSellerTreatingManualItem(item) && item.productOrderItem.state === 'acknowledged',
      bulkable: true,
    },
    {
      state: 'failed', icon: faXmark, tooltip: 'PRODUCT_ORDERS._fail_order', dataCy: 'failOrder',
      bulkTooltip: 'PRODUCT_ORDERS._fail_order_all',
      buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
      onClick: (item: any) => this.runItemAction('failed', item, 'failOrder'),
      showIf: (item: any) => this.isSellerTreatingManualItem(item) && item.productOrderItem.state === 'inProgress',
      bulkable: true,
    },
    {
      state: 'completed', icon: faCheck, tooltip: 'PRODUCT_ORDERS._complete_order', dataCy: 'completeOrder',
      bulkTooltip: 'PRODUCT_ORDERS._complete_order_all',
      buttonClass: 'bg-green-500 hover:bg-green-600 focus:ring-green-300 text-white',
      onClick: (item: any) => this.runItemAction('completed', item, 'completeOrder'),
      showIf: (item: any) => this.isSellerTreatingManualItem(item) && item.productOrderItem.state === 'inProgress',
      bulkable: true,
    },
  ];

  /** Actions that currently apply to every item in the order at once (same state
   * across the board) — offered as a single "do it for all" button next to the
   * items card title instead of clicking each item's button one by one. */
  get bulkItemActions(): OrderItemAction[] {
    const items = this.orderToShow?.productOrderItems ?? [];
    if (this.role !== this.sellerRole || items.length < 2) return [];
    return this.orderItemActions.filter(action =>
      action.bulkable && items.every((item: any) => !action.showIf || action.showIf(item))
    );
  }

  // Confirm modal stuff
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  actionType: string = '';
  selectedItem: any = null;
  private modalInstance: any;
  // Which item-card button (if any) is mid-request, so only that one swaps its
  // icon for a spinner while the rest of that item's buttons are disabled.
  loadingAction: { itemId: string; actionKey: string } | null = null;
  confirmActionLoading: boolean = false;
  bulkActionLoading: string | null = null;

  // Note's drawer
  isDrawerOpen = false;
  drawerInstance: Drawer | null = null;
  selectedOrder: any = null;
  newNoteText = '';
  isLoading = false;
  isUpdating = false;

  @ViewChild('noteContainer') noteContainer!: ElementRef;

  userCache = new Map<string, string>(); // Caching userId -> username

  protected readonly faEdit = faEdit;
  protected readonly faTrash = faTrash;
  protected readonly orderStateBadgeVariant = orderStateBadgeVariant;
  protected readonly orderStateLabel = orderStateLabel;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
    private notificationService: NotificationService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      });
  }

  ngOnInit() {
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Who the user is acting as: the author of the notes they write, and the side of the conversation they are. */
  private initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
        this.currentUser = aux.user;
      } else {
        this.partyId = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as)?.partyId;
      }
    }
  }

  openModal(action: string, item: any) {
    this.actionType = action;
    this.selectedItem = item;
    if (this.modalInstance) {
      this.modalInstance.show();
    } else {
      console.error("Modal instance is not initialized!");
    }
  }

  closeModal() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
  }

  async confirmAction() {
    this.confirmActionLoading = true;
    try {
      await this.updateLifecycle(this.actionType, this.selectedItem);
    } finally {
      this.confirmActionLoading = false;
    }
  }

  /** Runs a direct (non-modal) item action, tracking which button triggered it
   * so the template can swap its icon for a spinner and disable the rest of
   * that item's buttons for the duration. */
  async runItemAction(state: string, item: any, actionKey: string) {
    this.loadingAction = { itemId: item.productOrderItem.id, actionKey };
    try {
      await this.updateLifecycle(state, item);
    } finally {
      this.loadingAction = null;
    }
  }

  /** Applies one bulkable action to every item in the order at once, in parallel. */
  async runBulkAction(action: OrderItemAction) {
    const items = this.orderToShow?.productOrderItems ?? [];
    this.bulkActionLoading = action.dataCy ?? action.state;
    try {
      // Sequential on purpose: each call PATCHes the *whole* shared note list
      // (see updateLifecycle below), so running them concurrently would race —
      // an earlier response landing after a later one could drop notes.
      for (const item of items) {
        await this.updateLifecycle(action.state, item);
      }
    } finally {
      this.bulkActionLoading = null;
    }
  }

  async updateLifecycle(state: string, item: any) {
    if (!this.orderToShow) {
      console.error("No order selected! Is this possible?");
      return;
    }

    console.log('Transitioning to...', state, item);
    // Kept for anything relying on "the last item touched" (e.g. the confirm
    // modal's copy), but everything below reads/writes `item` directly instead —
    // this method can run concurrently for different items (bulk actions), and
    // `this.selectedItem` is shared component state that a concurrent call could
    // overwrite mid-await.
    this.selectedItem = item;

    const prevState = item.productOrderItem['state']
    let stateChanged = false;
    try {
      // Actualizar el estado en la UI antes de enviar el PATCH
      item.productOrderItem['state'] = state;

      // Crear objeto PATCH para actualizar el estado
      const statePatchData = {
        productOrderItem: this.orderToShow.productOrderItem
      };

      // Llamar al servicio para actualizar solo el estado
      const stateResponse: any = await this.orderService.updateOrder(this.orderToShow.id, statePatchData);
      console.log("Order state updated successfully:", stateResponse);

      this.orderToShow.state = stateResponse.state;
      // orderToShow is a separate (enriched) object from the row the host keeps, so its state change
      // doesn't propagate there on its own - the host is told.
      this.orderUpdated.emit({ id: this.orderToShow.id, state: stateResponse.state });

      // Trust what the backend actually persisted for this line item over the
      // optimistic guess set above — the two can differ (backend-side validation,
      // auto-transitions, etc.).
      const confirmedItem = stateResponse.productOrderItem?.find(
        (poi: any) => poi.id === item.productOrderItem.id
      );
      if (confirmedItem) {
        item.productOrderItem['state'] = confirmedItem.state;
      }
      stateChanged = true;
      this.notificationService.showSuccess('PRODUCT_ORDERS._update_state_success');
    } catch (error: any) {
      item.productOrderItem['state'] = prevState

      const detail = error?.error?.error || error?.error?.message || error?.message;
      this.notificationService.showError('PRODUCT_ORDERS._update_state_error', detail ? { details: detail } : undefined);
      console.error("Error updating order:", error);
    }

    // The note says the state changed, so it is only written when it did
    if (stateChanged) {
      try {
        await this.appendNote(this.orderToShow, {
          text: `Order state updated to ${state}`,
          id: `urn:ngsi-ld:note:${uuidv4()}`,
          author: this.partyId,
          date: new Date().toISOString()
        });
      } catch (error: any) {
        const detail = error?.error?.error || error?.error?.message || error?.message;
        this.notificationService.showError('PRODUCT_ORDERS._update_state_note_error', detail ? { details: detail } : undefined);
        console.error("Error updating order notes:", error);
      }
    }

    // Cerrar el modal después de completar ambas actualizaciones
    this.closeModal();
  }

  ngAfterViewInit(): void {
    initFlowbite();
    const drawerElement = document.getElementById('drawer-notes');
    if (drawerElement) {
      this.drawerInstance = new Drawer(drawerElement, { placement: 'right', backdrop: false });
    }
    setTimeout(() => {
      if (this.confirmModal) {
        this.modalInstance = new Modal(this.confirmModal.nativeElement);
      }
    }, 100);
  }

  /** Adds a note to an order without touching the ones it already has. The server refuses a list that changes or drops
   * an existing note, so the list sent is the one the server has right now plus the new note, never the one this
   * screen kept from earlier (the order may have been changed since, from here or by the other party). */
  private async appendNote(order: any, note: any): Promise<void> {
    const current = await this.orderService.getProductOrderById(order.id);
    const notes = [...(current?.note ?? []), note];
    const updated: any = await this.orderService.updateOrder(order.id, { note: notes });
    order.note = updated?.note ?? notes;
  }

  /** The notes of the order as the server has them now, so the drawer does not show a list that has fallen behind. */
  private async refreshNotes(order: any): Promise<void> {
    try {
      const current = await this.orderService.getProductOrderById(order.id);
      order.note = current?.note ?? [];
      order.note.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      this.scrollToBottom();
    } catch (error) {
      console.error('Error reading the notes of the order:', error);
    }
  }

  // Note's drawer functionality
  openNotes(order: any): void {
    this.selectedOrder = order;
    if (this.drawerInstance) {
      this.isLoading = true;
      this.drawerInstance.show();
      // 1s before showing notes
      setTimeout(() => {
        this.isLoading = false;

        // Sorts notes (older before)
        if (this.selectedOrder?.note?.length) {
          this.selectedOrder.note.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        }

        this.scrollToBottom();
      }, 1000);
    }
    this.isDrawerOpen = true;
    void this.refreshNotes(order);
  }

  closeDrawer(): void {
    if (this.drawerInstance) {
      this.drawerInstance.hide();
      //Clear note's textarea
      this.newNoteText = '';
    }
    this.isDrawerOpen = false;
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.closeDrawer();
  }

  private scrollToBottom(): void {
    if (this.noteContainer) {
      setTimeout(() => {
        this.noteContainer.nativeElement.scrollTop = this.noteContainer.nativeElement.scrollHeight;
      }, 100);
    }
  }

  getProductImage(prod: ProductOffering) {
    let profile = prod?.attachment?.filter(item => item.name === 'Profile Picture') ?? [];
    let images = prod.attachment?.filter(item => item.attachmentType === 'Picture') ?? [];
    if (profile.length != 0) {
      images = profile;
    }
    return images.length > 0 ? images?.at(0)?.url : 'https://placehold.co/600x400/svg';
  }

  getPricePlanLabel(item: any): string {
    const price = item.productOfferingPrice;
    if (!price) return 'SHOPPING_CART._free';

    if (price.priceType === 'custom') {
      return price.name ?? 'Custom';
    }

    if (price.bundledPopRelationship?.length > 1) {
      return `Bundled price plan: ${price.name}`;
    }

    let label = `${price.price?.value ?? ''} ${price.price?.unit ?? ''}`.trim();
    if (price.unitOfMeasure) {
      label += ` / ${price.unitOfMeasure.units}`;
    }
    if (price.recurringChargePeriodType) {
      label += ` / ${price.recurringChargePeriodType}`;
    }
    return label;
  }

  private canAcknowledgeOrReject(item: any): boolean {
    return !this.hasProcurementAutomaticTerm(item) && !item.productOrderItem.state && this.role === this.sellerRole;
  }

  private isSellerTreatingManualItem(item: any): boolean {
    return !this.hasProcurementAutomaticTerm(item) && this.role === this.sellerRole;
  }

  /** Groups the order's line-item prices by (priceType, currency, recurring period) and
   * sums each group's amount — items with no productOfferingPrice are free, items priced
   * 'custom' are provider-defined and excluded from the sum (flagged via hasCustomPricing
   * instead), matching the same distinctions getPricePlanLabel already makes per item. */
  private computePriceSummary(items: any[]): void {
    const groups = new Map<string, { label: string; amount: number; unit: string }>();
    this.hasCustomPricing = false;
    this.hasFreeItems = false;

    for (const item of items ?? []) {
      const price = item.productOfferingPrice;
      if (!price) {
        this.hasFreeItems = true;
        continue;
      }
      if (price.priceType === 'custom') {
        this.hasCustomPricing = true;
        continue;
      }
      const amount = price.price?.value ?? 0;
      const unit = price.price?.unit ?? '';
      const period = price.recurringChargePeriodType ? ` / ${price.recurringChargePeriodType}` : '';
      const key = `${price.priceType ?? ''}|${unit}|${period}`;
      const existing = groups.get(key);
      if (existing) {
        existing.amount += amount;
      } else {
        groups.set(key, { label: `${price.priceType ?? ''}${period}`, amount, unit });
      }
    }

    this.priceSummary = Array.from(groups.values());
  }

  async openDetails(order: any) {
    this.showOrderDetails = true;
    this.orderToShow = order;
    this.customerName = '';
    this.priceSummary = [];
    this.hasCustomPricing = false;
    this.hasFreeItems = false;
    this.loadingOrderDetails = true;
    try {
      const [enrichedOrder, customerName] = await Promise.all([
        this.paginationService.enrichOrder(await this.withBillingAccount(order)),
        this.getCustomerName(),
      ]);
      this.orderToShow = enrichedOrder;
      this.customerName = customerName;
      this.computePriceSummary(enrichedOrder.productOrderItems);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      this.loadingOrderDetails = false;
    }
  }

  /** The modal shows the contact of the billing account, which a list may only carry as a reference. */
  private async withBillingAccount(order: any): Promise<any> {
    if (order.billingAccount?.contact || !order.billingAccount?.id) return order;
    try {
      return { ...order, billingAccount: await this.accountService.getBillingAccountById(order.billingAccount.id) };
    } catch (error) {
      console.error('Error fetching the billing account of the order:', error);
      return order;
    }
  }

  hasProcurementAutomaticTerm(item: any): boolean {
    return item.productOfferingTerm?.some(
      (term: any) => term.name === "procurement" && term.description === "automatic"
    );
  }

  async addNote(): Promise<void> {
    if (!this.newNoteText.trim()) return;

    const newNote = {
      text: this.newNoteText,
      id: `urn:ngsi-ld:note:${uuidv4()}`,
      author: this.partyId,
      date: new Date().toISOString()
    };

    // Add the note to the UI immediately
    this.selectedOrder.note.push(newNote);
    this.newNoteText = ''; // Clear input field
    this.isUpdating = true;
    this.scrollToBottom();

    try {
      // The server keeps the notes it has and gets the new one appended to them
      await this.appendNote(this.selectedOrder, newNote);
      this.scrollToBottom();
      console.log('Order notes updated successfully');
      this.notificationService.showSuccess('PRODUCT_ORDERS._add_note_success');
    } catch (error: any) {
      const detail = error?.error?.error || error?.error?.message || error?.message;
      this.notificationService.showError('PRODUCT_ORDERS._add_note_error', detail ? { details: detail } : undefined);
      console.error('Error updating order notes:', error);
      // Remove the note if update fails
      this.selectedOrder.note = (this.selectedOrder.note ?? []).filter((n: any) => n.id !== newNote.id);
    } finally {
      this.isUpdating = false;
    }
  }

  goToCustomerDeatils() {
    const customer = this.orderToShow.relatedParty.find(
      (party: any) => party.role?.toLowerCase() === this.buyerRole.toLowerCase()
    );

    window.open(this.router.serializeUrl(
      this.router.createUrlTree(['/org-details', customer?.id])
    ), '_blank');
  }

  private async getCustomerName(): Promise<string> {
    if (this.orderToShow?.relatedParty) {
      const customer = this.orderToShow.relatedParty.find(
        (party: any) => party.role?.toLowerCase() === this.buyerRole.toLowerCase()
      );
      if (customer?.id) {
        return this.getUsername(customer.id);
      }
    }
    return '';
  }

  async getUsername(partyId: string): Promise<string> {
    if (this.userCache.has(partyId)) {
      return this.userCache.get(partyId)!;
    }

    try {
      let username: string;

      if (partyId.startsWith('urn:ngsi-ld:individual:')) {
        // Get individual user info
        const userInfo = await this.accountService.getUserInfo(partyId);
        username = `${userInfo?.givenName || ''} ${userInfo?.familyName || ''}`.trim() || `Unknown (${partyId})`;
      } else if (partyId.startsWith('urn:ngsi-ld:organization:')) {
        // Get organization info
        const orgInfo = await this.accountService.getOrgInfo(partyId);
        username = orgInfo?.tradingName || `Unknown Organization (${partyId})`;
      } else {
        username = `Unknown (${partyId})`;
      }

      // Store in cache
      this.userCache.set(partyId, username);
      return username;
    } catch (error) {
      console.error('Error fetching name for', partyId, error);
      return `Unknown (${partyId})`;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }

  protected readonly JSON = JSON;
}
