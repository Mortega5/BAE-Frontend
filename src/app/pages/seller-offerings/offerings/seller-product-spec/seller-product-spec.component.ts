import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField, TableColumn } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { BADGE_BASE, lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';

@Component({
  selector: 'seller-product-spec',
  templateUrl: './seller-product-spec.component.html',
  styleUrl: './seller-product-spec.component.css',
  providers: [DatePipe]
})
export class SellerProductSpecComponent implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  sort: any = undefined;
  isBundle: any = undefined;
  partyId: any;
  private destroy$ = new Subject<void>();

  prodSpecColumns: TableColumn<any>[];

  prodSpecFilters: FormField[] = [
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
    private prodSpecService: ProductSpecServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private datePipe: DatePipe
  ) {
    this.prodSpecColumns = [
      {
        header: 'OFFERINGS._name',
        getValue: (item: any) => item.name ?? '-',
        width: 'w-4/10',
        cellClass: (item: any) => this.hasLongWord(item.name, 20) ? 'break-all' : 'break-words',
      },
      {
        header: 'OFFERINGS._type',
        getValue: (item: any) => item['@type'] ?? 'ProductSpecification',
        type: 'text',
        width: 'w-3/10'
      },
      {
        header: 'OFFERINGS._status',
        getValue: (item: any) => item.lifecycleStatus ?? '-',
        type: 'badge',
        width: 'w-28',
        cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus ?? ''),
      },
      {
        header: 'OFFERINGS._type',
        getValue: (item: any) => item.isBundle ? 'OFFERINGS._bundle' : 'OFFERINGS._simple',
        type: 'badge',
        width: 'w-28',
        cellClass: (item: any) => `${BADGE_BASE} ${item.isBundle ? 'text-green-500 border-green-500' : 'text-blue-600 border-blue-400'}`,
      },
      {
        header: 'OFFERINGS._last_update',
        getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-',
        width: 'w-2/10',
      },
    ];

    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initProdSpecs();
        }
      })
  }

  private searchInputListener = (_e: Event) => {
    console.log(`Input updated`)
    if (this.searchField.value == '') {
      this.filter = undefined;
      this.getProdSpecs(false);
    }
  }

  ngOnInit() {
    this.initProdSpecs();
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
    this.eventMessage.emitSellerCreateProductSpec(true);
  }

  goToUpdate(prod: any) {
    this.eventMessage.emitSellerUpdateProductSpec(prod);
  }

  initProdSpecs() {
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

  fetchProdSpecs = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = (filters['status'] ?? []) as string[];
    return this.prodSpecService.getProdSpecByUserPaged(params, this.filter, status, this.partyId, this.sort, this.isBundle);
  }

  filterInventoryByKeywords() {

  }

  onSortChange(event: any) {
    this.sort = event.target.value == 'name' ? 'name' : undefined;
    this.paginatedTable?.refresh(true);
  }

  onTypeChange(event: any) {
    if (event.target.value == 'simple') {
      this.isBundle = false;
    } else if (event.target.value == 'bundle') {
      this.isBundle = true;
    } else {
      this.isBundle = undefined;
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
