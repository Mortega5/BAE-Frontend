import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSwatchbook } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { expandLifecycleStatusFilter, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { SellerOfferingsPaths } from '../../seller-offerings.paths';

@Component({
  selector: 'seller-usage-spec',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule,
    ButtonComponent, ContentCardComponent, FilteredPaginatedTableComponent
  ],
  templateUrl: './seller-usage-spec.component.html',
  styleUrl: './seller-usage-spec.component.css'
})
export class SellerUsageSpecComponent implements OnInit, OnDestroy {

  @ViewChild(FilteredPaginatedTableComponent) paginatedTable?: FilteredPaginatedTableComponent<any>;

  searchField = new FormControl();
  filter: Record<string, string> | undefined = undefined;
  partyId: any = '';
  private destroy$ = new Subject<void>();

  usageSpecColumns: TableColumn<any>[] = [
    {
      header: 'USAGE_SPECS._name',
      getValue: (usage: any) => usage.name,
      sortKey: 'name',
      cellClass: (usage: any) => this.hasLongWord(usage.name, 20) ? 'break-all' : 'break-words',
    },
    {
      header: 'USAGE_SPECS._description',
      hideOnMobile: true,
      getValue: (usage: any) => usage.description,
    },
    {
      header: 'OFFERINGS._status',
      getValue: (usage: any) => lifecycleStatusLabel(usage.lifecycleStatus ?? ''),
      type: 'status-badge',
      width: 'w-[150px]',
      sortKey: 'lifecycleStatus',
      getStatus: (usage: any) => lifecycleStatusBadgeVariant(usage.lifecycleStatus ?? ''),
    },
  ];

  usageSpecFilters: FormField[] = [
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
      ],
    },
  ];

  defaultSort: TableSort = { key: 'name', direction: 'asc' };

  constructor(
    private usageService: UsageServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private router: Router
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initUsageSpecs();
        }
      })
  }

  ngOnInit() {
    this.initUsageSpecs();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initUsageSpecs() {
    this.initPartyInfo();
    this.paginatedTable?.refresh(true);
    let input = document.querySelector('[type=search]')
    if (input != undefined) {
      input.addEventListener('input', e => {
        if (this.searchField.value == '') {
          this.filter = undefined;
          this.paginatedTable?.refresh(true);
        }
      });
    }
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  fetchUsageSpecs = (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = expandLifecycleStatusFilter((filters['status'] ?? []) as string[]);
    return this.usageService.getUsageSpecByUserPaged(params, this.filter, status, this.partyId);
  }

  goToCreate() {
    this.router.navigate([SellerOfferingsPaths.usageSpecs.new()])
  }

  goToUpdate(usageSpecId: string) {
    this.router.navigate([SellerOfferingsPaths.usageSpecs.edit(usageSpecId)])
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

}
