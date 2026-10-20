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

/** TMF639 resource `resourceStatus` values, with their label key and badge color. */
const RESOURCE_STATES: { value: string; label: string; badge: BadgeStatus }[] = [
  { value: 'standby', label: 'PRODUCT_INVENTORY._standby', badge: 'info' },
  { value: 'alarm', label: 'PRODUCT_INVENTORY._alarm', badge: 'danger' },
  { value: 'available', label: 'PRODUCT_INVENTORY._available', badge: 'success' },
  { value: 'reserved', label: 'PRODUCT_INVENTORY._reserved', badge: 'info' },
  { value: 'suspended', label: 'PRODUCT_INVENTORY._suspended', badge: 'warning' },
  { value: 'unknown', label: 'PRODUCT_INVENTORY._unknown', badge: 'neutral' },
];

@Component({
  selector: 'inventory-resources',
  templateUrl: './inventory-resources.component.html',
  styleUrl: './inventory-resources.component.css'
})
export class InventoryResourcesComponent implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  resourceId: any = undefined;
  prodId: any = undefined;

  partyId:any='';
  showDetails:boolean=false;
  selectedRes:any;
  private destroy$ = new Subject<void>();

  resourceFilters: FormField[] = [
    {
      name: 'status',
      label: 'OFFERINGS._filter_state',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: [],
      options: RESOURCE_STATES.map(s => ({ value: s.value, label: s.label })),
    },
  ];

  resourceColumns: TableColumn[] = [
    {
      header: 'OFFERINGS._name',
      getValue: (res: any) => res.name ?? '-',
      width: 'min-w-[120px]',
      cellClass: (res: any) => this.hasLongWord(res.name, 20) ? 'break-all' : 'break-words',
    },
    {
      header: 'OFFERINGS._status',
      type: 'status-badge',
      width: 'w-[150px]',
      getValue: (res: any) => RESOURCE_STATES.find(s => s.value === res.resourceStatus)?.label ?? res.resourceStatus ?? '-',
      getStatus: (res: any) => RESOURCE_STATES.find(s => s.value === res.resourceStatus)?.badge ?? 'neutral',
    },
    { header: 'PRODUCT_INVENTORY._start_date', hideOnMobile: true, type: 'date', width: 'w-[200px]', getValue: (res: any) => res.startOperatingDate },
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
    this.resourceId = this.route.snapshot.queryParamMap.get('openResourceId') ?? undefined;
    this.prodId = this.route.snapshot.queryParamMap.get('openProdId') ?? undefined;
    if(this.resourceId!=undefined){
      this.api.getResourceSpec(this.resourceId).then(res => {
        this.selectResource(res)
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

  fetchResources = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    return this.inventoryService.getResourceInventoryPaged(params, (filters['status'] ?? []) as string[], this.partyId);
  }

  selectResource(res:any){
    this.selectedRes=res;
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
