import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { faCirclePlus, faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PriceServiceService } from 'src/app/services/price-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { BADGE_BASE, lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';

@Component({
  selector: 'seller-offer',
  templateUrl: './seller-offer.component.html',
  styleUrl: './seller-offer.component.css'
})
export class SellerOfferComponent implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  sort: any = undefined;
  isBundle: any = undefined;
  partyId: any;
  customMap: Record<string, boolean> = {};
  private destroy$ = new Subject<void>();

  offerColumns: TableColumn<any>[];

  offerFilters: FormField[] = [
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
    private api: ApiServiceService,
    private priceService: PriceServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService
  ) {
    this.offerColumns = [
      {
        header: 'OFFERINGS._name',
        getValue: (item: any) => item.name ?? '-',
        cellClass: (item: any) => this.hasLongWord(item.name, 20) ? 'break-all' : 'break-words',
      },
      {
        header: 'OFFERINGS._status',
        getValue: (item: any) => item.lifecycleStatus ?? '-',
        type: 'badge',
        width: 'w-24',
        cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus ?? ''),
      },
      {
        header: 'OFFERINGS._type',
        getValue: (item: any) => item.isBundle ? 'OFFERINGS._bundle' : 'OFFERINGS._simple',
        type: 'badge',
        width: 'w-24',
        hideOnMobile: true,
        cellClass: (item: any) => `${BADGE_BASE} ${item.isBundle ? 'text-green-500 border-green-500' : 'text-blue-600 border-blue-400'}`,
      },
      {
        header: 'OFFERINGS._last_update',
        type: 'date',
        getValue: (item: any) => item.lastUpdate,
        width: 'w-60',
        hideOnMobile: true,
      },
      {
        header: 'OFFERINGS._actions',
        type: 'icon-button',
        icon: faCirclePlus,
        width: '  w-24',
        tooltip: 'OFFERINGS._create_custom_offer',
        showIf: (item: any) => !!this.customMap[item.id],
        onClick: (item: any) => this.goToCreateCustom(item),
      },
    ];

    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initOffers();
        }
      })
  }

  private searchInputListener = (_e: Event) => {
    console.log(`Input updated`)
    if (this.searchField.value == '') {
      this.filter = undefined;
      this.getOffers(false);
    }
  }

  ngOnInit() {
    this.initOffers();
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
    this.eventMessage.emitSellerCreateOffer(true);
  }

  goToUpdate(offer: any) {
    this.eventMessage.emitSellerUpdateOffer(offer);
  }

  goToCreateCustom(offer: any) {
    this.eventMessage.emitSellerCreateCustomOffer(offer);
  }

  initOffers() {
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

  fetchOffers = async (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = (filters['status'] ?? []) as string[];
    params.orderBy = this.sort || 'lastUpdate';
    params.orderDirection = this.sort ? undefined : 'desc';
    const result = await this.api.getProductOfferByOwnerPaged(params, this.filter, status, this.partyId, this.isBundle);

    this.customMap = {};
    for (const offer of result.items) {
      this.customMap[offer.id] = await this.priceService.isCustomOffering(offer);
    }

    return result;
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
