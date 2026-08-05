import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faCircleCheck, faCircleXmark, faIdCard, faPlay, faSort, faStickyNote, faSwatchbook, faXmark } from "@fortawesome/pro-solid-svg-icons";
import { TranslateModule } from '@ngx-translate/core';
import { Drawer, initFlowbite, Modal } from 'flowbite';
import moment from 'moment';
import { from, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { countries } from 'src/app/models/country.const';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { components } from "src/app/models/product-catalog";
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { SharedModule } from "../../../../shared/shared.module";
type ProductOffering = components["schemas"]["ProductOffering"];

@Component({
  selector: 'app-order-info',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, SharedModule,
    FilteredPaginatedTableComponent, TableInputComponent, LoadingSpinnerComponent
  ],
  providers: [DatePipe],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.css'
})
export class OrderInfoComponent implements OnInit, AfterViewInit, OnDestroy {
  profile: any;
  partyId: any = '';
  showOrderDetails: boolean = false;
  orderToShow: any;
  loadingOrderDetails: boolean = false;
  dateRange = new FormControl();
  countries: any[] = countries;
  preferred: boolean = false;
  showError: boolean = false;
  errorMessage: string = '';
  customerName$!: Observable<string>;

  check_custom: boolean = false;

  buyerRole: string = environment.BUYER_ROLE;
  sellerRole: string = environment.SELLER_ROLE;

  isSeller: boolean = false;
  role: any = this.buyerRole

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  defaultSort: TableSort = { key: 'orderDate', direction: 'desc' };

  orderColumns: TableColumn[] = [
    { header: 'PRODUCT_INVENTORY._order_id', getValue: (item: any) => `...${item.id.slice(-6)}`, width: 'w-28', hideOnMobile: true, sortKey: 'id' },
    { header: 'PRODUCT_INVENTORY._status', type: 'badge', getValue: (item: any) => item.state ?? 'PRODUCT_ORDERS._unchecked', cellClass: (item: any) => this.orderStateClass(item.state), width: 'w-28', sortKey: 'state' },
    { header: 'PRODUCT_INVENTORY._bill', getValue: (item: any) => item.billingAccount?.name ?? '-', width: 'w-1/3', hideOnMobile: true },
    { header: 'PRODUCT_ORDERS._date', type: 'date', getValue: (item: any) => item.orderDate, sortKey: 'orderDate' },
    { header: 'PRODUCT_ORDERS._actions', type: 'icon-button', icon: faStickyNote, tooltip: 'PRODUCT_ORDERS._show_notes', dataCy: 'orderNotesButton', onClick: (item: any) => this.toggleDrawer(item), width: 'w-24' },
  ];

  orderItemColumns: TableColumn[] = [
    { header: 'PRODUCT_ORDERS._img', type: 'image', getValue: (item: any) => this.getProductImage(item), width: 'w-24' },
    { header: 'PRODUCT_ORDERS._name', getValue: (item: any) => item.name },
    { header: 'PRODUCT_ORDERS._price_plan', getValue: (item: any) => this.getPricePlanLabel(item) },
    {
      header: 'PRODUCT_ORDERS._state', type: 'badge', width: 'w-28',
      getValue: (item: any) => item.productOrderItem.state ?? 'Unchecked',
      cellClass: (item: any) => this.orderStateClass(item.productOrderItem.state),
    },
    {
      header: 'PRODUCT_ORDERS._items_action', type: 'badge', width: 'w-28',
      getValue: (item: any) => item.productOrderItem.action,
      cellClass: (item: any) => this.orderItemActionClass(item.productOrderItem.action),
    },
    {
      header: 'PRODUCT_ORDERS._actions', type: 'actions', width: 'w-40',
      actions: [
        {
          icon: faCheck, tooltip: 'PRODUCT_ORDERS._acknowledge_order', dataCy: 'acknowledgeOrder',
          buttonClass: 'bg-primary-100 hover:bg-blue-800 focus:ring-blue-300',
          onClick: (item: any) => this.openModal('acknowledged', item),
          showIf: (item: any) => this.canAcknowledgeOrReject(item),
        },
        {
          icon: faXmark, tooltip: 'PRODUCT_ORDERS._reject_order', dataCy: 'rejectOrder',
          buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
          onClick: (item: any) => this.openModal('cancelled', item),
          showIf: (item: any) => this.canAcknowledgeOrReject(item),
        },
        {
          icon: faPlay, tooltip: 'PRODUCT_ORDERS._start_treatment', dataCy: 'startOrderTreatment',
          buttonClass: 'bg-green-500 hover:bg-green-600 focus:ring-green-300',
          onClick: (item: any) => this.openModal('inProgress', item),
          showIf: (item: any) => this.isSellerTreatingManualItem(item) && item.productOrderItem.state === 'acknowledged',
        },
        {
          icon: faCircleCheck, tooltip: 'PRODUCT_ORDERS._complete_order', dataCy: 'completeOrder',
          buttonClass: 'bg-green-500 hover:bg-green-600 focus:ring-green-300',
          onClick: (item: any) => this.openModal('completed', item),
          showIf: (item: any) => this.isSellerTreatingManualItem(item) && item.productOrderItem.state === 'inProgress',
        },
        {
          icon: faCircleXmark, tooltip: 'PRODUCT_ORDERS._fail_order', dataCy: 'failOrder',
          buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300',
          onClick: (item: any) => this.openModal('failed', item),
          showIf: (item: any) => this.isSellerTreatingManualItem(item) && item.productOrderItem.state === 'inProgress',
        },
      ],
      emptyLabel: (item: any) => this.hasProcurementAutomaticTerm(item) && this.role !== this.sellerRole ? 'n/a' : null,
    },
  ];

  orderFilters: FormField[] = [
    {
      name: 'action',
      label: 'PRODUCT_ORDERS._filter_action',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: [],
      colSpan: 1,
      options: [
        { value: 'add', label: 'PRODUCT_ORDERS._action_add' },
        { value: 'modify', label: 'PRODUCT_ORDERS._action_modify' },
        { value: 'delete', label: 'PRODUCT_ORDERS._action_delete' },
      ],
    },
    {
      name: 'status',
      label: 'PRODUCT_ORDERS._filter_state',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: [],
      colSpan: 1,
      options: [
        { value: 'acknowledged', label: 'PRODUCT_ORDERS._acknowledged' },
        { value: 'inProgress', label: 'PRODUCT_ORDERS._in_progress' },
        { value: 'partial', label: 'PRODUCT_ORDERS._partial' },
        { value: 'completed', label: 'PRODUCT_ORDERS._completed' },
        { value: 'failed', label: 'PRODUCT_ORDERS._failed' },
        { value: 'pending', label: 'PRODUCT_ORDERS._pending' },
        { value: 'cancelled', label: 'PRODUCT_ORDERS._cancelled' },
      ],
    },
  ];

  // Confirm modal stuff
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  actionType: string = '';
  selectedItem: any = null;
  private modalInstance: any;

  // Note's drawer
  isDrawerOpen = false;
  drawerInstance: Drawer | null = null;
  selectedOrder: any = null;
  newNoteText = '';
  currentUser!: string;
  isLoading = false;
  isUpdating = false;

  @ViewChild('noteContainer') noteContainer!: ElementRef;

  userCache = new Map<string, string>(); // Caching userId -> username


  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })
  }

  @HostListener('document:click')
  onClick() {
    if (this.showOrderDetails == true) {
      this.showOrderDetails = false;
      this.cdr.detectChanges();
    }
    //initFlowbite();
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

  handleError(msg: string) {
    this.errorMessage = msg;
    this.showError = true;
    setTimeout(() => (this.showError = false), 3000);
  }

  async confirmAction() {
    return this.updateLifecycle(this.actionType, this.selectedItem);
  }

  async updateLifecycle(state: string, item: any) {
    if (!this.orderToShow) {
      console.error("No order selected! Is this possible?");
      return;
    }

    console.log('Transitioning to...', state, item);
    this.selectedItem = item;

    const prevState = this.selectedItem.productOrderItem['state']
    try {
      // Actualizar el estado en la UI antes de enviar el PATCH
      this.selectedItem.productOrderItem['state'] = state;

      // Crear objeto PATCH para actualizar el estado
      const statePatchData = {
        productOrderItem: this.orderToShow.productOrderItem
      };

      // Llamar al servicio para actualizar solo el estado
      const stateResponse: any = await this.orderService.updateOrder(this.orderToShow.id, statePatchData);
      console.log("Order state updated successfully:", stateResponse);

      this.orderToShow.state = stateResponse.state;
      // orderToShow is a separate (enriched) object from the row cached by the orders
      // table, so its state change doesn't propagate there on its own - patch it locally.
      this.paginatedTable?.patchItem((o: any) => o.id === this.orderToShow.id, { state: stateResponse.state });
    } catch (error) {
      this.selectedItem.productOrderItem['state'] = prevState

      this.handleError("Error updating order state");
      console.error("Error updating order:", error);
    }

    try {
      // Ahora creamos la nota después de la actualización exitosa
      const newNote = {
        text: `Order state updated to ${state}`,
        id: `urn:ngsi-ld:note:${uuidv4()}`,
        author: this.partyId,
        date: new Date().toISOString()
      };

      // Asegurar que el array de notas existe
      if (!this.orderToShow.note) {
        this.orderToShow.note = [];
      }

      // Agregar la nueva nota localmente
      this.orderToShow.note.push(newNote);

      // Crear objeto PATCH para actualizar solo la nota
      const notePatchData = {
        note: this.orderToShow.note
      };

      // Llamar al servicio para actualizar solo la nota
      const noteResponse = await this.orderService.updateOrder(this.orderToShow.id, notePatchData);
      console.log("Order note added successfully:", noteResponse);
    } catch (error) {
      console.error("Error updating order notes:", error);
    }

    // Cerrar el modal después de completar ambas actualizaciones
    this.closeModal();
  }

  ngOnInit() {
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
        this.currentUser = aux.user;
        let userRoles = aux.roles.map((elem: any) => {
          return elem.name
        })
        if (userRoles.includes(this.sellerRole)) {
          this.isSeller = true;
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
        let orgRoles = loggedOrg.roles.map((elem: any) => {
          return elem.name
        })
        if (orgRoles.includes(this.sellerRole)) {
          this.isSeller = true;
        }
      }
      //this.partyId = aux.partyId;
      const requestedRole = this.route.snapshot.queryParamMap.get('role');
      this.role = (requestedRole === this.sellerRole && this.isSeller) ? this.sellerRole : this.buyerRole;
      this.paginatedTable?.refresh(true);
    }
    initFlowbite();
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

  // Note's drawer functionality
  toggleDrawer(order: any): void {
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
  }

  closeDrawer(): void {
    if (this.drawerInstance) {
      this.drawerInstance.hide();
      //Clear note's textarea
      this.newNoteText = '';
    }
    this.isDrawerOpen = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent): void {
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

  fetchOrders = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = (filters['status'] ?? []) as string[];
    const action = (filters['action'] ?? []) as string[];
    params.orderBy = 'orderDate';
    params.orderDirection = 'desc';
    return this.paginationService.getOrdersPaged(params, status, this.partyId, this.role, action);
  }

  private orderStateClass(state: string): string {
    const base = 'text-xs font-medium me-2 px-2.5 py-0.5 rounded border';
    switch (state) {
      case 'inProgress':
      case 'acknowledged':
        return `bg-blue-100 dark:bg-blue-300 text-blue-600 border-blue-400 ${base}`;
      case 'completed':
        return `bg-blue-100 dark:bg-green-300 text-green-500 border-green-500 ${base}`;
      case 'partial':
        return `bg-blue-100 dark:bg-purple-300 text-purple-500 border-purple-500 ${base}`;
      case 'failed':
      case 'cancelled':
        return `bg-blue-100 dark:bg-red-300 text-red-500 border-red-500 ${base}`;
      case 'pending':
        return `bg-blue-100 dark:bg-yello-300 text-yellow-500 border-yellow-500 ${base}`;
      default:
        return `bg-amber-500 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border-amber-950 ${base}`;
    }
  }

  private orderItemActionClass(action: string): string {
    const base = 'text-xs font-medium me-2 px-2.5 py-0.5 rounded border';
    switch (action) {
      case 'add':
        return `bg-blue-100 dark:bg-blue-300 text-blue-600 border-blue-400 ${base}`;
      case 'delete':
        return `bg-blue-100 dark:bg-red-300 text-red-500 border-red-500 ${base}`;
      case 'modify':
        return `bg-blue-100 dark:bg-yellow-300 text-yellow-500 border-yellow-500 ${base}`;
      default:
        return '';
    }
  }

  private getPricePlanLabel(item: any): string {
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

  getTotalPrice(items: any[]) {
    let totalPrice = [];
    let insertCheck = false;
    this.check_custom = false;
    for (let i = 0; i < items.length; i++) {
      insertCheck = false;
      if (totalPrice.length == 0 && items[i].productOfferingPrice != undefined) {
        if (items[i].productOfferingPrice.priceType != 'custom') {
          totalPrice.push(items[i].productOfferingPrice);
        } else {
          this.check_custom = true;
        }
      } else {
        for (let j = 0; j < totalPrice.length; j++) {
          if (items[i].productOfferingPrice != undefined) {
            if (items[i].productOfferingPrice.priceType != 'custom') {
              if (items[i].productOfferingPrice.priceType == totalPrice[j].priceType && items[i].productOfferingPrice.unit == totalPrice[j].unit && items[i].productOfferingPrice.text == totalPrice[j].text) {
                totalPrice[j].price = totalPrice[j].price + items[i].productOfferingPrice.price;
                insertCheck = true;
              }
            } else {
              this.check_custom = true;
            }
          }
        }
        if (insertCheck == false) {
          if (items[i].productOfferingPrice != undefined) {
            if (items[i].productOfferingPrice.priceType != 'custom') {
              totalPrice.push(items[i].productOfferingPrice);
              insertCheck = true;
            } else {
              this.check_custom = true;
            }
          }
        }
      }
    }
    return totalPrice
  }

  async toggleShowDetails(order: any) {
    this.showOrderDetails = true;
    this.orderToShow = order;
    this.customerName$ = from(this.getCustomerName());
    this.loadingOrderDetails = true;
    try {
      this.orderToShow = await this.paginationService.enrichOrder(order);
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      this.loadingOrderDetails = false;
    }
  }

  onRoleChange(role: any) {
    this.role = role;
    this.router.navigate([], { relativeTo: this.route, queryParams: { role }, queryParamsHandling: 'merge' });
    this.paginatedTable?.refresh(true);
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
      // Send update request to the backend
      const patchData = { note: this.selectedOrder.note };

      await this.orderService.updateOrder(this.selectedOrder.id, patchData);
      console.log('Order notes updated successfully');
    } catch (error) {
      this.handleError("Error updating order notes");
      console.error('Error updating order notes:', error);
      // Remove the note if update fails
      this.selectedOrder.note.pop();
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
