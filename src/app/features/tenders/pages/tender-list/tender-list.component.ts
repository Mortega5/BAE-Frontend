import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faCircleQuestion, faCommentDots, faSwatchbook } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthGuard } from 'src/app/guard/auth.guard';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { QUOTE_CATEGORIES, QUOTE_STATUSES, tenderStatusLabelKey } from 'src/app/models/quote.constants';
import { Quote, QuoteStateType } from 'src/app/models/quote.model';
import { API_ROLES } from 'src/app/models/roles.constants';
import { TableColumn } from 'src/app/models/table-column.model';
import { Tender, TenderStateType } from 'src/app/models/tender.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ThemeService } from 'src/app/services/theme.service';
import { quoteStateBadgeVariant } from 'src/app/shared/badge/badge.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { CreateTenderModalComponent } from 'src/app/shared/create-tender-modal/create-tender-modal.component';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { TabDirective } from 'src/app/shared/tabs/tab.directive';
import { TabsComponent } from 'src/app/shared/tabs/tabs.component';
import { QuoteService } from '../../../quotes/services/quote.service';
import { TendersPaths } from '../../tenders.paths';

type TenderRole = 'customer' | 'seller';

/** A tender row with the names and state the table shows, resolved once when the role's tenders load. */
type TenderRow = Quote & { buyerName: string; primaryState: string };

const STATUS_FILTER_STATES: string[] = [
  QUOTE_STATUSES.PENDING, QUOTE_STATUSES.IN_PROGRESS, QUOTE_STATUSES.APPROVED,
  QUOTE_STATUSES.ACCEPTED, QUOTE_STATUSES.CANCELLED, QUOTE_STATUSES.REJECTED,
];

@Component({
  selector: 'app-tender-list',
  standalone: true,
  imports: [TranslateModule, FaIconComponent, ContentCardComponent, ButtonComponent, TabsComponent, TabDirective,
    FilteredPaginatedTableComponent, QuoteDetailsModalComponent, ChatModalComponent, CreateTenderModalComponent],
  templateUrl: './tender-list.component.html',
})
export class TenderListComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private quoteService = inject(QuoteService);
  private localStorage = inject(LocalStorageService);
  private notificationService = inject(NotificationService);
  private accountService = inject(AccountServiceService);
  private themeService = inject(ThemeService);
  private auth = inject(AuthGuard);

  protected readonly faCircleQuestion = faCircleQuestion;

  @ViewChild(FilteredPaginatedTableComponent) private table?: FilteredPaginatedTableComponent<TenderRow>;

  selectedRole: TenderRole = 'customer';
  currentUserId: string | null = null;
  isSeller = false;

  columns: TableColumn<TenderRow>[] = [];
  filters: FormField[] = [];

  showQuoteDetailsModal = false;
  selectedQuoteId: string | null = null;

  showChatModal = false;
  selectedChatQuoteId: string | null = null;

  showCreateTenderModal = false;

  /** Tenders of the selected role, loaded once per role: the status filter and paging only slice them. */
  private rows?: Promise<TenderRow[]>;
  private organizationNames = new Map<string, Promise<string>>();

  get guideUrl(): string | undefined {
    return this.themeService.getCurrentThemeConfig()?.links?.tailoredOfferingGuide;
  }

  ngOnInit() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux && aux.logged_as == aux.id) {
      this.currentUserId = aux.partyId;
    } else if (aux?.logged_as) {
      this.currentUserId = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as)?.partyId ?? null;
    }
    this.isSeller = this.auth.hasAnyRole(['seller']);
    // ?role=seller keeps the provider tab across reloads, same as quotes and product-orders
    if (this.route.snapshot.queryParamMap.get('role') === 'seller' && this.isSeller) {
      this.selectedRole = 'seller';
    }
    this.buildTable();
  }

  onRoleChange(role: string) {
    this.selectedRole = role as TenderRole;
    this.router.navigate([], { relativeTo: this.route, queryParams: { role }, queryParamsHandling: 'merge' });
    this.rows = undefined;
    this.buildTable();
    this.table?.refresh(true);
  }

  refreshTenders() {
    this.rows = undefined;
    this.table?.refresh();
  }

  fetchTenders = async (params: PageRequest, filters: Record<string, any>): Promise<PageResult<TenderRow>> => {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }
    this.rows ??= this.loadRows(this.currentUserId, this.selectedRole);
    let rows: TenderRow[];
    try {
      rows = await this.rows;
    } catch (error) {
      this.rows = undefined;
      throw error;
    }

    const statuses = (filters['status'] ?? []) as string[];
    const filtered = statuses.length > 0 ? rows.filter(row => statuses.includes(row.primaryState)) : rows;
    return {
      items: filtered.slice(params.offset, params.offset + params.limit),
      total: filtered.length,
    };
  };

  /** Buyers open the tender page; providers the details of the invitation they received. */
  openTender(row: TenderRow) {
    if (this.selectedRole === 'customer') {
      this.router.navigateByUrl(TendersPaths.detail(row.id!));
      return;
    }
    if (row.primaryState === QUOTE_STATUSES.CANCELLED) return;
    this.selectedQuoteId = row.id!;
    this.showQuoteDetailsModal = true;
  }

  closeQuoteDetailsModal() {
    this.showQuoteDetailsModal = false;
    this.selectedQuoteId = null;
  }

  onQuoteUpdated() {
    this.refreshTenders();
    this.notificationService.showSuccess('TENDERS._updated');
  }

  openChat(row: TenderRow) {
    this.selectedChatQuoteId = row.id!;
    this.showChatModal = true;
  }

  closeChatModal() {
    this.showChatModal = false;
    this.selectedChatQuoteId = null;
  }

  openCreateTenderModal() {
    this.showCreateTenderModal = true;
  }

  closeCreateTenderModal() {
    this.showCreateTenderModal = false;
    this.refreshTenders();
  }

  onTenderCreated() {
    this.refreshTenders();
    this.notificationService.showSuccess('TENDERS._created');
  }

  private buildTable() {
    const role = this.selectedRole;
    const statusLabel = (row: TenderRow) => tenderStatusLabelKey(row.category, role, row.primaryState);
    const title = (row: TenderRow) => row.description || 'TENDERS._no_title';

    if (role === 'customer') {
      this.columns = [
        { header: 'TENDERS._tender_title', getValue: title, cellClass: 'break-words' },
        {
          header: 'TENDERS._status_header', type: 'status-badge', width: 'w-[260px]',
          getValue: statusLabel, getStatus: row => quoteStateBadgeVariant(row.primaryState),
        },
        { header: 'TENDERS._start_date', type: 'date', format: 'dd/MM/yyyy', getValue: row => row.expectedFulfillmentStartDate, width: 'w-[150px]', hideOnMobile: true },
        { header: 'TENDERS._end_date', type: 'date', format: 'dd/MM/yyyy', getValue: row => row.effectiveQuoteCompletionDate, width: 'w-[150px]', hideOnMobile: true },
      ];
    } else {
      this.columns = [
        { header: 'TENDERS._request_date', type: 'date', format: 'dd/MM/yyyy', getValue: row => row.quoteDate, width: 'w-[150px]' },
        { header: 'TENDERS._buyer', getValue: row => row.buyerName, cellClass: 'break-words' },
        { header: 'TENDERS._tender_title', getValue: title, cellClass: 'break-words', hideOnMobile: true },
        {
          header: 'TENDERS._status_header', type: 'status-badge', width: 'w-[260px]',
          getValue: statusLabel, getStatus: row => quoteStateBadgeVariant(row.primaryState),
        },
        {
          header: 'TENDERS._actions', type: 'actions', width: 'w-28',
          actions: [{ icon: faCommentDots, tooltip: 'TENDERS._chat', onClick: row => this.openChat(row), dataCy: 'tenderChat' }],
        },
      ];
    }

    this.filters = [{
      name: 'status',
      label: 'TENDERS._filter_status',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      options: STATUS_FILTER_STATES.map(state => ({
        value: state,
        label: tenderStatusLabelKey(role === 'customer' ? QUOTE_CATEGORIES.COORDINATOR : QUOTE_CATEGORIES.TENDER, role, state),
      })),
    }];
  }

  private async loadRows(userId: string, role: TenderRole): Promise<TenderRow[]> {
    const tenders = role === 'customer'
      ? await firstValueFrom(this.quoteService.getCoordinatorQuotesByUser(userId))
      : await firstValueFrom(this.quoteService.getTenderingQuotesByUser(userId, API_ROLES.SELLER));
    let quotes = tenders.map(tender => this.mapTenderToQuote(tender));

    // Providers don't see invitations to a tender its buyer hasn't launched yet (still a draft)
    if (role === 'seller') {
      const coordinatorStates = await this.coordinatorStates(quotes);
      quotes = quotes.filter(quote =>
        quote.category !== QUOTE_CATEGORIES.TENDER || !quote.externalId
        || (coordinatorStates.has(quote.externalId) && coordinatorStates.get(quote.externalId) !== QUOTE_STATUSES.PENDING));
    }

    const rows = await Promise.all(quotes.map(async quote => {
      const buyer = quote.relatedParty?.find(party => party.role?.toLowerCase() === API_ROLES.BUYER.toLowerCase());
      return {
        ...quote,
        buyerName: buyer?.id ? await this.organizationName(buyer.id) : '-',
        primaryState: quote.quoteItem?.[0]?.state || quote.state || 'unknown',
      };
    }));

    // Newest first
    return rows.sort((a, b) =>
      (b.quoteDate ? new Date(b.quoteDate).getTime() : 0) - (a.quoteDate ? new Date(a.quoteDate).getTime() : 0));
  }

  /** States of the coordinator tenders the given tendering quotes belong to, by coordinator id. */
  private async coordinatorStates(quotes: Quote[]): Promise<Map<string, string>> {
    const ids = [...new Set(quotes
      .filter(quote => quote.category === QUOTE_CATEGORIES.TENDER && quote.externalId)
      .map(quote => quote.externalId!))];
    const entries = await Promise.all(ids.map(id =>
      firstValueFrom(this.quoteService.getQuoteById(id)).then(
        coordinator => [id, coordinator.quoteItem?.[0]?.state || coordinator.state || 'unknown'] as const,
        () => [id, 'unknown'] as const,
      )));
    return new Map(entries);
  }

  private organizationName(id: string): Promise<string> {
    if (!id.startsWith('urn:ngsi-ld:organization:')) {
      return Promise.resolve(id);
    }
    let name = this.organizationNames.get(id);
    if (!name) {
      name = this.accountService.getOrgInfo(id).then(
        (org: any) => org?.tradingName || org?.name || id,
        () => id,
      );
      this.organizationNames.set(id, name);
    }
    return name;
  }

  private mapTenderToQuote(tender: Tender): Quote {
    const quoteItem: any = { state: this.mapTenderStateToQuoteState(tender.state) };
    if (tender.attachment) {
      quoteItem.attachment = [{
        name: tender.attachment.name,
        mimeType: tender.attachment.mimeType,
        content: tender.attachment.content,
        url: tender.attachment.url,
        href: tender.attachment.href,
        path: tender.attachment.path,
        size: tender.attachment.size ? { amount: tender.attachment.size, units: 'bytes' } : undefined,
      }];
    }

    return {
      id: tender.id,
      href: '',
      description: tender.tenderNote || '',
      quoteDate: tender.createdAt || new Date().toISOString(),
      effectiveQuoteCompletionDate: tender.effectiveQuoteCompletionDate,
      expectedFulfillmentStartDate: tender.expectedFulfillmentStartDate,
      state: this.mapTenderStateToQuoteState(tender.state),
      // The service says 'tendering', the Quote model 'tender'
      category: tender.category === 'tendering' ? QUOTE_CATEGORIES.TENDER : QUOTE_CATEGORIES.COORDINATOR,
      externalId: tender.external_id,
      relatedParty: [
        ...tender.selectedProviders.map(id => ({ id, role: API_ROLES.SELLER, name: tender.provider, '@referredType': 'Organization' })),
        ...(tender.buyerPartyId ? [{ id: tender.buyerPartyId, role: API_ROLES.BUYER, '@referredType': 'Organization' }] : []),
      ],
      quoteItem: [quoteItem],
      note: [],
    };
  }

  private mapTenderStateToQuoteState(tenderState: TenderStateType): QuoteStateType {
    switch (tenderState) {
      case 'draft': return 'pending';
      case 'pre-launched': return 'inProgress';
      case 'pending': return 'pending';
      case 'sent': return 'approved';
      case 'closed': return 'accepted';
      case 'cancelled': return 'cancelled';
      case 'rejected': return 'rejected';
      default: return 'pending';
    }
  }
}
