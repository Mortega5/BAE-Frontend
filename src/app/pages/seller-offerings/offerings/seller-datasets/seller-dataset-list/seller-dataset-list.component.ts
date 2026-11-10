import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { faSwatchbook } from '@fortawesome/pro-solid-svg-icons';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { fetchAllPages, PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ProductSpecServiceService } from 'src/app/services/product-spec-service.service';
import { expandLifecycleStatusFilter, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { SellerOfferingsPaths } from '../../../seller-offerings.paths';

/** Only the product specs that sell a dataset: the proxy marks them with a characteristic of value type `dataset`. */
export const DATASET_PRODUCTS_FILTER = { 'productSpecCharacteristic.atValueType': 'dataset' };

/** The datasets the seller sells: the offers whose product is a dataset. An offer does not carry the marker of its
 * product, and the offers cannot be filtered by it, so the dataset products are read first and the seller's offers
 * are kept when they point at one of them. Creating one opens the offer form in dataset mode. */
@Component({
  selector: 'seller-dataset-list',
  templateUrl: './seller-dataset-list.component.html',
  styleUrl: './seller-dataset-list.component.css',
})
export class SellerDatasetListComponent implements OnInit, OnDestroy {
  partyId: any;
  private destroy$ = new Subject<void>();

  readonly defaultSort: TableSort = { key: 'lastUpdate', direction: 'desc' };
  readonly filters: FormField[] = [{
    name: 'status', label: 'OFFERINGS._filter_state', type: 'select', icon: faSwatchbook, multiple: true, defaultValue: ['Active', 'Launched'],
    options: [
      { value: 'Active', label: 'OFFERINGS._active' },
      { value: 'Launched', label: 'OFFERINGS._launched' },
      { value: 'Retired', label: 'OFFERINGS._retired' },
    ],
  }];
  readonly columns: TableColumn<any>[] = [
    {
      header: 'OFFERINGS._name', getValue: (item: any) => item.name ?? '-', sortKey: 'name',
      cellClass: (item: any) => this.hasLongWord(item.name) ? 'break-all' : 'break-words',
    },
    { header: 'DATASETS._version', getValue: (item: any) => item.version ?? '-', hideOnMobile: true, width: 'w-[120px]' },
    {
      header: 'OFFERINGS._status', getValue: (item: any) => lifecycleStatusLabel(item.lifecycleStatus ?? ''), type: 'status-badge',
      width: 'w-[140px]', sortKey: 'lifecycleStatus', getStatus: (item: any) => lifecycleStatusBadgeVariant(item.lifecycleStatus ?? ''),
    },
    { header: 'OFFERINGS._last_update', type: 'date', hideOnMobile: true, sortKey: 'lastUpdate', getValue: (item: any) => item.lastUpdate, width: 'w-[200px]' },
  ];

  constructor(
    private prodSpecService: ProductSpecServiceService,
    private api: ApiServiceService,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private router: Router,
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ChangedSession') this.initPartyInfo();
    });
  }

  ngOnInit(): void {
    this.initPartyInfo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initPartyInfo(): void {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux.logged_as == aux.id) {
      this.partyId = aux.partyId;
    } else {
      this.partyId = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as)?.partyId;
    }
  }

  /** Both lists are loaded in full and the page is cut here, since the marker is only on the product. */
  fetchDatasets = async (params: PageRequest, filters: Record<string, any>): Promise<PageResult<any>> => {
    const status = expandLifecycleStatusFilter((filters['status'] ?? []) as string[]);
    const [products, offers] = await Promise.all([
      fetchAllPages(page => this.prodSpecService.getProdSpecByUserPaged(page, DATASET_PRODUCTS_FILTER, [], this.partyId, undefined)),
      fetchAllPages(page => this.api.getProductOfferByOwnerPaged(page, undefined, status, this.partyId, false)),
    ]);
    const datasetProducts = new Set(products.map(product => product.id));
    const items = offers.filter(offer => datasetProducts.has(offer.productSpecification?.id));

    if (params.orderBy) {
      const direction = params.orderDirection === 'desc' ? -1 : 1;
      items.sort((a, b) => direction * String(a[params.orderBy!] ?? '').localeCompare(String(b[params.orderBy!] ?? '')));
    }
    return { items: items.slice(params.offset, params.offset + params.limit), total: items.length };
  };

  goToCreate(): void {
    this.router.navigate([SellerOfferingsPaths.datasets.new()]);
  }

  goToUpdate(id: string): void {
    this.router.navigate([SellerOfferingsPaths.offers.edit(id)]);
  }

  private hasLongWord(text: string | undefined, threshold = 20): boolean {
    return !!text && text.split(/\s+/).some(word => word.length > threshold);
  }
}
