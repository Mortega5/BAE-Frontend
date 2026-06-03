
import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { faIdCard, faSort, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginationService } from 'src/app/services/pagination.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
import { RESOURCE_STATUS_TYPES, ResourceStatusType, SoftwareResource } from '../../../../models/software.model';

@Component({
  selector: 'app-seller-software',
  templateUrl: './seller-software.html',
  styleUrl: './seller-software.css'
})
export class SellerSoftware {

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;
  protected readonly resourceStatusTypes = RESOURCE_STATUS_TYPES;

  searchField = new FormControl();
  software: SoftwareResource[] = [];
  nextPage: SoftwareResource[] = [];
  page: number = 0;
  // TODO: update
  CATALOG_LIMIT: number = environment.CATALOG_LIMIT;
  loading: boolean = false;
  loading_more: boolean = false;
  page_check: boolean = true;
  filter: any = undefined;
  partyId: any;
  status: ResourceStatusType[] = ['standby', 'available'];
  private destroy$ = new Subject<void>();

  constructor(
    private api: ApiServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private paginationService: PaginationService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initSoftware();
        }
      })
  }

  ngOnInit() {
    this.initSoftware();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCreate() {
    this.eventMessage.emitSellerSoftwareCreate(true);
  }

  goToUpdate(software: any) {
    this.eventMessage.emitSellerSoftwareUpdate(software);
  }

  initSoftware() {
    this.loading = true;
    this.software = [];
    this.nextPage = [];
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux.logged_as == aux.id) {
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.getSoftware(false);
    let input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if (this.searchField.value == '') {
          this.filter = undefined;
          this.getSoftware(false);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  async getSoftware(next: boolean) {
    if (next == false) {
      this.loading = true;
    }

    //async getItemsPaginated(page:number, pageSize:any, next:boolean, items:any[], nextItems:any[], options:any
    let options = {
      "keywords": this.filter,
      "filters": this.status,
      "partyId": this.partyId
    }

    this.paginationService.getItemsPaginated(this.page, this.CATALOG_LIMIT, next, this.software, this.nextPage, options,
      this.api.getSoftwareResourceByUser.bind(this.api)).then(data => {
        this.page_check = data.page_check;
        this.software = data.items;
        this.nextPage = data.nextItems;
        this.page = data.page;
        this.loading = false;
        this.loading_more = false;
      })
  }

  async next() {
    await this.getSoftware(true);
  }

  filterInventoryByKeywords() {

  }

  onStateFilterChange(filter: ResourceStatusType) {
    const index = this.status.findIndex(item => item === filter);
    if (index !== -1) {
      this.status.splice(index, 1);
      console.log(this.status)
    } else {
      console.log(this.status)
      this.status.push(filter)
    }
    this.loading = true;
    this.page = 0;
    this.software = [];
    this.nextPage = [];
    this.getSoftware(false);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
