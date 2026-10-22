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
import { QUOTE_STATUSES, tailoredStatusLabelKeys } from 'src/app/models/quote.constants';
import { Quote } from 'src/app/models/quote.model';
import { API_ROLES } from 'src/app/models/roles.constants';
import { TableColumn } from 'src/app/models/table-column.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { ThemeService } from 'src/app/services/theme.service';
import { quoteStateBadgeVariant } from 'src/app/shared/badge/badge.component';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { FilteredPaginatedTableComponent } from 'src/app/shared/forms/filtered-paginated-table/filtered-paginated-table.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { TabDirective } from 'src/app/shared/tabs/tab.directive';
import { TabsComponent } from 'src/app/shared/tabs/tabs.component';
import { QuoteService } from '../../services/quote.service';

type QuoteRole = 'customer' | 'seller';

/** A quote row with the names the table shows, resolved once when the role's quotes load. */
type QuoteRow = Quote & { otherPartyName: string; productName: string; primaryState: string };

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [TranslateModule, FaIconComponent, ContentCardComponent, ButtonComponent, TabsComponent, TabDirective,
    FilteredPaginatedTableComponent, QuoteDetailsModalComponent, ChatModalComponent],
  templateUrl: './quote-list.component.html',
})
export class QuoteListComponent implements OnInit {
  private quoteService = inject(QuoteService);
  private localStorage = inject(LocalStorageService);
  private notificationService = inject(NotificationService);
  private accountService = inject(AccountServiceService);
  private productService = inject(ApiServiceService);
  private auth = inject(AuthGuard);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private themeService = inject(ThemeService);

  protected readonly faCircleQuestion = faCircleQuestion;

  @ViewChild(FilteredPaginatedTableComponent) private table?: FilteredPaginatedTableComponent<QuoteRow>;

  selectedRole: QuoteRole = 'customer';

  get guideUrl(): string | undefined {
    return this.themeService.getCurrentThemeConfig()?.links?.tailoredOfferingGuide;
  }
  currentUserId: string | null = null;
  isSeller = false;

  columns: TableColumn<QuoteRow>[] = [];
  filters: FormField[] = [];

  showQuoteDetailsModal = false;
  selectedQuoteId: string | null = null;

  showChatModal = false;
  selectedChatQuoteId: string | null = null;

  /** Quotes of the selected role, loaded once per role: the status filter and paging only slice them. */
  private rows?: Promise<QuoteRow[]>;
  private organizationNames = new Map<string, Promise<string>>();
  private productNames = new Map<string, Promise<string>>();

  ngOnInit() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux.logged_as == aux.id) {
      this.currentUserId = aux.partyId;
    } else {
      const loggedOrg = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as);
      this.currentUserId = loggedOrg?.partyId ?? null;
    }
    this.isSeller = this.auth.hasAnyRole(['seller']);
    // ?role=seller keeps the provider tab across reloads, same as product-orders
    if (this.route.snapshot.queryParamMap.get('role') === 'seller' && this.isSeller) {
      this.selectedRole = 'seller';
    }
    this.buildTable();
  }

  onRoleChange(role: string) {
    this.selectedRole = role as QuoteRole;
    this.router.navigate([], { relativeTo: this.route, queryParams: { role }, queryParamsHandling: 'merge' });
    this.rows = undefined;
    // Column headers and status labels depend on the role
    this.buildTable();
    this.table?.refresh(true);
  }

  refreshQuotes() {
    this.rows = undefined;
    this.table?.refresh();
  }

  fetchQuotes = async (params: PageRequest, filters: Record<string, any>): Promise<PageResult<QuoteRow>> => {
    if (!this.currentUserId) {
      throw new Error('User not authenticated');
    }
    this.rows ??= this.loadRows(this.currentUserId, this.selectedRole);
    let rows: QuoteRow[];
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

  viewDetails(quote: QuoteRow) {
    if (this.isQuoteCancelled(quote)) return;
    this.selectedQuoteId = quote.id!;
    this.showQuoteDetailsModal = true;
  }

  closeQuoteDetailsModal() {
    this.showQuoteDetailsModal = false;
    this.selectedQuoteId = null;
  }

  onQuoteUpdated() {
    this.refreshQuotes();
    this.notificationService.showSuccess('QUOTES._updated');
  }

  openChat(quote: QuoteRow) {
    this.selectedChatQuoteId = quote.id!;
    this.showChatModal = true;
  }

  closeChatModal() {
    this.showChatModal = false;
    this.selectedChatQuoteId = null;
  }

  private buildTable() {
    const labels = tailoredStatusLabelKeys(this.selectedRole);
    this.columns = [
      { header: 'QUOTES._request_date', type: 'date', format: 'dd/MM/yyyy', getValue: quote => quote.quoteDate, width: 'w-[150px]' },
      {
        header: this.selectedRole === 'customer' ? 'QUOTES._provider' : 'QUOTES._customer',
        getValue: quote => quote.otherPartyName,
        cellClass: 'break-words',
      },
      { header: 'QUOTES._product', getValue: quote => quote.productName, cellClass: 'break-words', hideOnMobile: true },
      {
        header: 'QUOTES._status_header',
        type: 'status-badge',
        getValue: quote => labels[quote.primaryState] ?? quote.primaryState,
        getStatus: quote => quoteStateBadgeVariant(quote.primaryState),
        width: 'w-[260px]',
      },
      {
        header: 'QUOTES._actions',
        type: 'actions',
        width: 'w-28',
        actions: [
          { icon: faCommentDots, tooltip: 'QUOTES._chat', onClick: quote => this.openChat(quote), dataCy: 'quoteChat' },
        ],
      },
    ];
    this.filters = [{
      name: 'status',
      label: 'QUOTES._filter_status',
      type: 'select',
      icon: faSwatchbook,
      multiple: true,
      options: Object.entries(labels).map(([value, label]) => ({ value, label })),
    }];
  }

  private async loadRows(userId: string, role: QuoteRole): Promise<QuoteRow[]> {
    const quotes = await firstValueFrom(this.quoteService.getQuotesByUserAndRole(userId, role));
    const otherRole = role === 'customer' ? API_ROLES.SELLER : API_ROLES.BUYER;

    const rows = await Promise.all(quotes.map(async quote => {
      const otherParty = quote.relatedParty?.find(party => party.role?.toLowerCase() === otherRole.toLowerCase());
      const [otherPartyName, productName] = await Promise.all([
        otherParty?.id ? this.organizationName(otherParty.id) : Promise.resolve('-'),
        this.productName(quote),
      ]);
      return { ...quote, otherPartyName, productName, primaryState: this.getPrimaryState(quote) };
    }));

    // Newest first
    return rows.sort((a, b) =>
      (b.quoteDate ? new Date(b.quoteDate).getTime() : 0) - (a.quoteDate ? new Date(a.quoteDate).getTime() : 0));
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

  private productName(quote: Quote): Promise<string> {
    const item = quote.quoteItem?.[0];
    if (item?.productOffering?.name) {
      return Promise.resolve(item.productOffering.name);
    }
    const productId = item?.productOffering?.id;
    if (!productId) {
      return Promise.resolve(item?.product?.name ?? '-');
    }
    let name = this.productNames.get(productId);
    if (!name) {
      name = this.productService.getProductById(productId).then(
        (product: any) => product?.name || '-',
        () => '-',
      );
      this.productNames.set(productId, name);
    }
    return name;
  }

  /** The actual state lives in the first quote item; the quote's own state is a fallback. */
  private getPrimaryState(quote: Quote): string {
    return quote.quoteItem?.[0]?.state || quote.state || 'unknown';
  }

  private isQuoteCancelled(quote: Quote): boolean {
    return quote.quoteItem?.some(item => item.state === QUOTE_STATUSES.CANCELLED) || false;
  }
}
