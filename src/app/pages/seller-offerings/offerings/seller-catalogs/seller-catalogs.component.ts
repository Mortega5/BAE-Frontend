import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { faIdCard, faSort, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TableColumn } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { components } from "src/app/models/product-catalog";
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';
import { lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';
type Catalog = components["schemas"]["Catalog"];

@Component({
  selector: 'seller-catalogs',
  templateUrl: './seller-catalogs.component.html',
  styleUrl: './seller-catalogs.component.css'
})
export class SellerCatalogsComponent implements OnInit, OnDestroy {

  protected readonly faIdCard = faIdCard;
  protected readonly faSort = faSort;
  protected readonly faSwatchbook = faSwatchbook;

  @ViewChild(PaginatedTableComponent) paginatedTable?: PaginatedTableComponent<Catalog>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  partyId: any;
  status: any[] = ['Active', 'Launched'];
  private destroy$ = new Subject<void>();

  catalogColumns: TableColumn<Catalog>[];

  constructor(
    private router: Router,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService
  ) {
    this.catalogColumns = [
      {
        header: 'OFFERINGS._name',
        getValue: (item: Catalog) => item.name ?? '-',
        cellClass: (item: Catalog) => this.hasLongWord(item.name, 20) ? 'break-all' : 'break-words',
      },
      {
        header: 'OFFERINGS._status',
        getValue: (item: Catalog) => item.lifecycleStatus ?? '-',
        type: 'badge',
        width: 'w-28',
        cellClass: (item: Catalog) => lifecycleStatusClass(item.lifecycleStatus ?? ''),
      },
      {
        header: 'OFFERINGS._role',
        getValue: (item: Catalog) => item.relatedParty?.at(0)?.role ?? '-',
        width: 'w-28',
      },
    ];

    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initCatalogs();
        }
      })
  }

  private searchInputListener = (_e: Event) => {
    console.log(`Input updated`)
    if (this.searchField.value == '') {
      this.filter = undefined;
      this.getCatalogs(false);
    }
  }

  ngOnInit() {
    this.initCatalogs();
    const input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', this.searchInputListener);
    }
  }

  ngOnDestroy() {
    const input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.removeEventListener('input', this.searchInputListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCreate() {
    this.eventMessage.emitSellerCreateCatalog(true);
  }

  goToUpdate(cat: any) {
    this.eventMessage.emitSellerUpdateCatalog(cat);
  }

  initCatalogs() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux.logged_as == aux.id) {
      this.partyId = aux.partyId;
    } else {
      let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
      this.partyId = loggedOrg.partyId
    }

    this.paginatedTable?.refresh(true);
    let input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', e => {
        // Easy way to get the value of the element who trigger the current `e` event
        console.log(`Input updated`)
        if (this.searchField.value == '') {
          this.filter = undefined;
          this.paginatedTable?.refresh(true);
        }
      });
    }
    initFlowbite();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  fetchCatalogs = (params: PageRequest): Promise<PageResult<Catalog>> => {
    return this.api.getCatalogsByUserPaged(params, this.filter, this.status, this.partyId);
  }

  onStateFilterChange(filter: string) {
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
    this.paginatedTable?.refresh(true);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
