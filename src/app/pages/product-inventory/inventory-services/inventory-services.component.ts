import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductInventoryPaths } from 'src/app/pages/product-inventory/product-inventory.paths';
import {EventMessageService} from "src/app/services/event-message.service";
import {faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TableColumn } from 'src/app/models/table-column.model';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { BadgeStatus } from 'src/app/shared/badge/badge.component';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';

/** TMF638 service `state` values, with their label key and badge color. */
const SERVICE_STATES: { value: string; label: string; badge: BadgeStatus }[] = [
  { value: 'feasibilityChecked', label: 'PRODUCT_INVENTORY._feasibility', badge: 'info' },
  { value: 'designed', label: 'PRODUCT_INVENTORY._designed', badge: 'info' },
  { value: 'reserved', label: 'PRODUCT_INVENTORY._reserved', badge: 'info' },
  { value: 'inactive', label: 'PRODUCT_INVENTORY._inactive', badge: 'warning' },
  { value: 'active', label: 'PRODUCT_INVENTORY._active', badge: 'success' },
  { value: 'terminated', label: 'PRODUCT_INVENTORY._terminated', badge: 'danger' },
];

@Component({
  selector: 'inventory-services',
  templateUrl: './inventory-services.component.html',
  styleUrl: './inventory-services.component.css'
})
export class InventoryServicesComponent implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  serviceId: any = undefined;
  prodId: any = undefined;

  partyId:any='';
  showDetails:boolean=false;
  selectedServ:any;
  private destroy$ = new Subject<void>();

  serviceFilters: FormField[] = [
    {
      name: 'status',
      label: 'OFFERINGS._filter_state',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: [],
      options: SERVICE_STATES.map(s => ({ value: s.value, label: s.label })),
    },
  ];

  serviceColumns: TableColumn[] = [
    {
      header: 'OFFERINGS._name',
      getValue: (serv: any) => serv.name ?? '-',
      width: 'min-w-[120px]',
      cellClass: (serv: any) => this.hasLongWord(serv.name, 20) ? 'break-all' : 'break-words',
    },
    {
      header: 'OFFERINGS._status',
      type: 'status-badge',
      width: 'w-[150px]',
      getValue: (serv: any) => SERVICE_STATES.find(s => s.value === serv.state)?.label ?? serv.state ?? '-',
      getStatus: (serv: any) => SERVICE_STATES.find(s => s.value === serv.state)?.badge ?? 'neutral',
    },
    { header: 'PRODUCT_INVENTORY._start_date', hideOnMobile: true, type: 'date', width: 'w-[200px]', getValue: (serv: any) => serv.startDate },
  ];

  constructor(
    private inventoryService: ProductInventoryServiceService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private router: Router,
    private route: ActivatedRoute,
    private eventMessage: EventMessageService,
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initInventory();
        this.paginatedTable?.refresh(true);
      }
    })
  }

  ngOnInit() {
    this.serviceId = this.route.snapshot.queryParamMap.get('openServiceId') ?? undefined;
    this.prodId = this.route.snapshot.queryParamMap.get('openProdId') ?? undefined;
    if(this.serviceId!=undefined){
      this.api.getServiceSpec(this.serviceId).then(serv => {
        this.selectService(serv)
      })
    }
    this.initInventory();
  }

  ngOnDestroy(){
    this.destroy$.next();
    this.destroy$.complete();
  }

  initInventory(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  fetchServices = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    return this.inventoryService.getServiceInventoryPaged(params, (filters['status'] ?? []) as string[], this.partyId);
  }

  selectService(serv:any){
    this.selectedServ=serv;
    this.showDetails=true;
  }

  back(){
    if(this.prodId!=undefined){
      this.router.navigate([ProductInventoryPaths.products()], { queryParams: { openProdId: this.prodId } });
    } else {
      this.showDetails=false;
    }
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
