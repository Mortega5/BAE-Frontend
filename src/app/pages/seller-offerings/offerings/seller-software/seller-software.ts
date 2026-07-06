
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ApiServiceService } from 'src/app/services/product-service.service';
import { RESOURCE_STATUS_TYPES, ResourceStatusType, SoftwareResource } from '../../../../models/software.model';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { resourceStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';

@Component({
  selector: 'app-seller-software',
  templateUrl: './seller-software.html',
  styleUrl: './seller-software.css'
})
export class SellerSoftware implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<SoftwareResource>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  partyId: any;
  private destroy$ = new Subject<void>();

  softwareColumns: TableColumn<SoftwareResource>[];

  softwareFilters: FormField[] = [
    {
      name: 'status',
      label: 'OFFERINGS._filter_state',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      defaultValue: ['standby', 'available'],
      options: RESOURCE_STATUS_TYPES.map(status => ({
        value: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
      })),
    },
  ];

  constructor(
    private api: ApiServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService
  ) {
    this.softwareColumns = [
      {
        header: 'OFFERINGS._name',
        getValue: (item: SoftwareResource) => item.name ?? '-',
        width: 'w-1/2',
        cellClass: (item: SoftwareResource) => this.hasLongWord(item.name, 20) ? 'break-all' : 'break-words',
      },
      {
        header: 'OFFERINGS._status',
        getValue: (item: SoftwareResource) => item.resourceStatus ?? '-',
        type: 'badge',
        width: 'w-1/4',
        cellClass: (item: SoftwareResource) => resourceStatusClass(item.resourceStatus ?? ''),
      },
      {
        header: 'OFFERINGS._type',
        getValue: (item: SoftwareResource) => item['@type'] ?? '-',
        width: 'w-1/4',
        cellClass: () => 'break-all',
      },
    ];

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

  fetchSoftware = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<SoftwareResource>> => {
    const status = (filters['status'] ?? []) as ResourceStatusType[];
    return this.api.getSoftwareResourceByUserPaged(params, this.filter, status, this.partyId);
  }

  filterInventoryByKeywords() {

  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
