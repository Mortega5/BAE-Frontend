import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit, HostListener, OnDestroy } from '@angular/core';
import { ProductInventoryServiceService } from 'src/app/services/product-inventory-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductInventoryPaths } from 'src/app/pages/product-inventory/product-inventory.paths';
import { PaginationService } from 'src/app/services/pagination.service';
import {EventMessageService} from "src/app/services/event-message.service";
import {faIdCard, faSort, faSwatchbook} from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { environment } from 'src/environments/environment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TableColumn } from 'src/app/models/table-column.model';

@Component({
  selector: 'inventory-services',
  templateUrl: './inventory-services.component.html',
  styleUrl: './inventory-services.component.css'
})
export class InventoryServicesComponent implements OnInit, OnDestroy {

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  serviceId: any = undefined;
  prodId: any = undefined;

  partyId:any='';
  loading: boolean = false;
  services:any[]=[];
  nextServices:any[]=[];
  status:any[]=[];
  loading_more: boolean = false;
  page_check:boolean = true;
  page: number=0;
  INVENTORY_LIMIT: number = environment.INVENTORY_SERV_LIMIT;
  showDetails:boolean=false;
  selectedServ:any;
  private destroy$ = new Subject<void>();

  serviceColumns: TableColumn[] = [
    { header: 'PRODUCT_INVENTORY._id', getValue: (serv: any) => serv.id, cellClass: 'text-primary-100 dark:text-primary-50 font-medium break-all' },
    {
      header: 'OFFERINGS._name',
      getValue: (serv: any) => serv.name,
      cellClass: (serv: any) => this.hasLongWord(serv.name, 20) ? 'break-all' : 'break-words',
    },
    { header: 'OFFERINGS._status', hideOnMobile: true, getValue: (serv: any) => serv.state },
    { header: 'PRODUCT_INVENTORY._start_date', hideOnMobile: true, type: 'date', getValue: (serv: any) => serv.startDate },
  ];

  constructor(
    private inventoryService: ProductInventoryServiceService,
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
    .pipe(takeUntil(this.destroy$))
    .subscribe(ev => {
      if(ev.type === 'ChangedSession') {
        this.initInventory();
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
    this.loading=true;

    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
      this.getInventory(false);
    }
    initFlowbite();
  }

  async getInventory(next:boolean){
    if(next==false){
      this.loading=true;
    }

    let options = {
      "partyId": this.partyId,
      "filters": this.status
    }
    
    try {
      const data = await this.paginationService.getItemsPaginated(this.page, this.INVENTORY_LIMIT, next, this.services, this.nextServices, options,
        this.inventoryService.getServiceInventory.bind(this.inventoryService));
      this.page_check=data.page_check;
      this.services=data.items;
      this.nextServices=data.nextItems;
      this.page=data.page;
    } finally {
      this.loading=false;
      this.loading_more=false;
    }
  }
  async next(){
    this.loading_more = true;
    await this.getInventory(true);
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

  onStateFilterChange(filter:string){
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
      console.log('elimina filtro')
      console.log(this.status)
    } else {
      console.log('añade filtro')
      console.log(this.status)
      this.status.push(filter)
    }
    this.getInventory(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if(str){
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }   
  }

}
