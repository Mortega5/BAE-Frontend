import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { API_PRODUCT_MARKER } from 'src/app/models/api-access.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { findButtonIcon } from 'src/app/config/popular-icons';
import { EventMessageService } from 'src/app/services/event-message.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { expandLifecycleStatusFilter, lifecycleStatusBadgeVariant, lifecycleStatusLabel } from 'src/app/shared/badge/badge.component';
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';
import { environment } from 'src/environments/environment';
import { SellerOfferingsPaths } from '../../seller-offerings/seller-offerings.paths';

type ProductKind = 'product' | 'dataset' | 'api';

interface CreateShortcut {
  label: string;
  description: string;
  icon: string;
  dataCy: string;
  path: string;
}

/** The overview of a user who sells: shortcuts to create a product, the received orders to attend and the latest
 * products. */
@Component({
  selector: 'app-seller-overview',
  templateUrl: './seller-overview.component.html',
})
export class SellerOverviewComponent implements OnInit, OnDestroy {
  partyId: any;

  readonly sellerRole = environment.SELLER_ROLE;
  readonly shortcuts: CreateShortcut[] = this.buildShortcuts();
  readonly pageSizeOptions = [5];

  @ViewChild('productsTable') private productsTable?: PaginatedTableComponent<any>;

  private destroy$ = new Subject<void>();

  readonly productColumns: TableColumn<any>[] = [
    { header: 'OFFERINGS._name', getValue: (item: any) => item.name ?? '-', cellClass: 'break-words' },
    { header: 'WORKSPACE._type', type: 'badge', getValue: (item: any) => `WORKSPACE._type_${item.kind}`, hideOnMobile: true, width: 'w-[140px]' },
    {
      header: 'OFFERINGS._status', type: 'status-badge', getValue: (item: any) => lifecycleStatusLabel(item.lifecycleStatus ?? ''),
      getStatus: (item: any) => lifecycleStatusBadgeVariant(item.lifecycleStatus ?? ''), width: 'w-[140px]',
    },
    { header: 'OFFERINGS._last_update', type: 'date', hideOnMobile: true, getValue: (item: any) => item.lastUpdate, width: 'w-[200px]' },
  ];

  constructor(
    private router: Router,
    private localStorage: LocalStorageService,
    private eventMessage: EventMessageService,
    private api: ApiServiceService,
  ) {
    this.eventMessage.messages$.pipe(takeUntil(this.destroy$)).subscribe(ev => {
      if (ev.type === 'ChangedSession') {
        this.initPartyInfo();
        this.productsTable?.refresh(true);
      }
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
    this.partyId = aux.logged_as == aux.id
      ? aux.partyId
      : aux.organizations?.find((element: { id: any }) => element.id == aux.logged_as)?.partyId;
  }

  /** The latest offers the user touched, each told apart as a product, a dataset or an API from its product spec. */
  fetchLatestProducts = async (params: PageRequest): Promise<PageResult<any>> => {
    params.orderBy = 'lastUpdate';
    params.orderDirection = 'desc';
    const status = expandLifecycleStatusFilter(['Active', 'Launched', 'Retired']);
    const page = await this.api.getProductOfferByOwnerPaged(params, undefined, status, this.partyId, undefined);
    const items = await Promise.all(page.items.map(async offer => ({ ...offer, kind: await this.kindOf(offer) })));
    return { items, total: page.total };
  };

  private async kindOf(offer: any): Promise<ProductKind> {
    try {
      const spec = await this.api.getProductSpecification(offer.productSpecification?.id);
      const characteristics: any[] = spec?.productSpecCharacteristic ?? [];
      if (characteristics.some(c => c.name === API_PRODUCT_MARKER)) return 'api';
      if (characteristics.some(c => c.valueType === 'dataset')) return 'dataset';
    } catch {
      // The row is still worth showing, as a plain product
    }
    return 'product';
  }

  iconOf(name: string) {
    return findButtonIcon(name);
  }

  /** Reads the latest products again; the table shows its own loading. */
  refreshProducts(): void {
    this.productsTable?.refresh(true);
  }

  goToProducts(): void {
    this.router.navigate([SellerOfferingsPaths.offers.list()]);
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  /** Opens the offer in the section it belongs to, so going back returns to it. */
  openProduct(offer: any): void {
    const edit = offer.kind === 'dataset' && environment.DATASETS_ENABLED ? SellerOfferingsPaths.datasets.edit
      : offer.kind === 'api' && environment.API_ACCESS_ENABLED ? SellerOfferingsPaths.apis.edit
        : SellerOfferingsPaths.offers.edit;
    this.router.navigate([edit(offer.id)]);
  }

  /** One shortcut per kind of product the marketplace has enabled, and the one for a product of no particular kind. */
  private buildShortcuts(): CreateShortcut[] {
    const shortcuts: CreateShortcut[] = [
      { label: 'WORKSPACE._create_plain_product', description: 'WORKSPACE._create_plain_product_desc', icon: 'layer-group', dataCy: 'createProduct', path: SellerOfferingsPaths.offers.new() },
    ];
    if (environment.DATASETS_ENABLED) {
      shortcuts.push({ label: 'WORKSPACE._create_dataset', description: 'WORKSPACE._create_dataset_desc', icon: 'database', dataCy: 'createDataset', path: SellerOfferingsPaths.datasets.new() });
    }
    if (environment.API_ACCESS_ENABLED) {
      shortcuts.push({ label: 'WORKSPACE._create_api', description: 'WORKSPACE._create_api_desc', icon: 'code', dataCy: 'createApi', path: SellerOfferingsPaths.apis.new() });
    }
    return shortcuts;
  }
}
