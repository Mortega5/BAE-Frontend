import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { faSwatchbook } from "@fortawesome/pro-solid-svg-icons";
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { ResourceSpecServiceService } from 'src/app/services/resource-spec-service.service';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';
import { SellerOfferingsPaths } from '../../seller-offerings.paths';

@Component({
  selector: 'seller-resource-spec',
  templateUrl: './seller-resource-spec.component.html',
  styleUrl: './seller-resource-spec.component.css'
})
export class SellerResourceSpecComponent implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  sort: any = undefined;
  partyId: any;
  private destroy$ = new Subject<void>();

  resSpecColumns: TableColumn<any>[];
  defaultSort: TableSort = { key: 'lastUpdate', direction: 'desc' };

  resSpecFilters: FormField[] = [
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
    private resSpecService: ResourceSpecServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private router: Router
  ) {
    this.resSpecColumns = [
      {
        header: 'OFFERINGS._name',
        getValue: (item: any) => item.name ?? '-',
        width: 'w-1/2',
        sortKey: 'name',
        cellClass: (item: any) => this.hasLongWord(item.name, 20) ? 'break-all' : 'break-words',
      },
      {
        header: 'OFFERINGS._type',
        getValue: (item: any) => item['@type'] ?? 'ResourceSpecification',
        width: 'w-1/3',
        hideOnMobile: true,
        type: 'text'
      },
      {
        header: 'OFFERINGS._status',
        getValue: (item: any) => item.lifecycleStatus ?? '-',
        type: 'badge',
        width: 'w-[140px]',
        sortKey: 'lifecycleStatus',
        cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus ?? ''),
      },
      {
        header: 'OFFERINGS._last_update',
        type: 'date',
        sortKey: 'lastUpdate',
        getValue: (item: any) => item.lastUpdate,
        width: 'w-[220px]',
      },
    ];

    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initResources();
        }
      })
  }

  ngOnInit() {
    this.initResources();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToCreate() {
    this.router.navigate([SellerOfferingsPaths.resourceSpecs.new()])
  }

  goToUpdate(resId: string) {
    this.router.navigate([SellerOfferingsPaths.resourceSpecs.edit(resId)])
  }

  initResources() {
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

  fetchResSpecs = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = (filters['status'] ?? []) as string[];
    return this.resSpecService.getResourceSpecByUserPaged(params, this.filter, status, this.partyId);
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }
}
