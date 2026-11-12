import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStickyNote, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { TranslateModule } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { orderStateBadgeVariant } from 'src/app/shared/badge/badge.component';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { OrderDetailsComponent } from 'src/app/shared/order-details/order-details.component';
import { environment } from 'src/environments/environment';
import { SharedModule } from "../../../../shared/shared.module";

@Component({
  selector: 'app-order-info',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, SharedModule,
    FilteredPaginatedTableComponent, OrderDetailsComponent
  ],
  templateUrl: './order-info.component.html',
  styleUrl: './order-info.component.css'
})
export class OrderInfoComponent implements OnInit, OnDestroy {
  partyId: any = '';
  buyerRole: string = environment.BUYER_ROLE;
  sellerRole: string = environment.SELLER_ROLE;

  isSeller: boolean = false;
  role: any = this.buyerRole

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;
  @ViewChild(OrderDetailsComponent) orderDetails?: OrderDetailsComponent;

  defaultSort: TableSort = { key: 'orderDate', direction: 'desc' };

  orderColumns: TableColumn[] = [
    { header: 'PRODUCT_INVENTORY._order_id', getValue: (item: any) => item.id.slice(-36), hideOnMobile: true, sortKey: 'id' },
    { header: 'PRODUCT_INVENTORY._status', type: 'status-badge', getValue: (item: any) => item.state ?? 'PRODUCT_ORDERS._unchecked', getStatus: (item: any) => orderStateBadgeVariant(item.state), width: 'w-[180px]', sortKey: 'state' },
    { header: 'PRODUCT_INVENTORY._bill', getValue: (item: any) => item.billingAccount?.name ?? '-', hideOnMobile: true },
    { header: 'PRODUCT_ORDERS._date', type: 'date', getValue: (item: any) => item.orderDate, sortKey: 'orderDate', width: 'w-[220px]' },
    { header: 'PRODUCT_ORDERS._actions', type: 'icon-button', icon: faStickyNote, tooltip: 'PRODUCT_ORDERS._show_notes', dataCy: 'orderNotesButton', onClick: (item: any) => this.orderDetails?.openNotes(item), width: 'w-[100px]' },
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



  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
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


  ngOnInit() {
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
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




  fetchOrders = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = (filters['status'] ?? []) as string[];
    const action = (filters['action'] ?? []) as string[];
    params.orderBy = 'orderDate';
    params.orderDirection = 'desc';
    return this.paginationService.getOrdersPaged(params, status, this.partyId, this.role, action);
  }




  /** The modal changed the state of an order: the row of the table follows without reading the page again. */
  onOrderUpdated(update: { id: string; state: string }) {
    this.paginatedTable?.patchItem((o: any) => o.id === update.id, { state: update.state });
  }

  onRoleChange(role: any) {
    this.role = role;
    this.router.navigate([], { relativeTo: this.route, queryParams: { role }, queryParamsHandling: 'merge' });
    this.paginatedTable?.refresh(true);
  }


}
