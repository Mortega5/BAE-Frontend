import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { faIdCard, faSort, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { components } from "src/app/models/product-catalog";
import { TableColumn } from 'src/app/models/table-column.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
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

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<Catalog>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  partyId: any;
  private destroy$ = new Subject<void>();

  catalogColumns: TableColumn<Catalog>[];

  catalogFilters: FormField[] = [
    {
      name: 'status',
      label: 'OFFERINGS._filter_state',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: ['Active', 'Launched'],
      options: [
        { value: 'Active', label: 'OFFERINGS._active' },
        { value: 'Launched', label: 'OFFERINGS._launched' },
        { value: 'Retired', label: 'OFFERINGS._retired' },
        { value: 'Obsolete', label: 'OFFERINGS._obsolete' },
      ],
    },
  ];

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
        width: 'w-2/3',
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

  fetchCatalogs = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<Catalog>> => {
    const status = (filters['status'] ?? []) as string[];
    return this.api.getCatalogsByUserPaged(params, this.filter, status, this.partyId);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
