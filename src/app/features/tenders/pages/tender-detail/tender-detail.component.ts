import { DatePipe } from '@angular/common';
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { faCommentDots, faDownload } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { QUOTE_CATEGORIES, QUOTE_STATUSES, tenderStatusLabelKey } from 'src/app/models/quote.constants';
import { Quote, QuoteStateType } from 'src/app/models/quote.model';
import { API_ROLES } from 'src/app/models/roles.constants';
import { TableColumn } from 'src/app/models/table-column.model';
import { Tender, TenderAttachment, TenderStateType } from 'src/app/models/tender.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { BadgeComponent, BadgeStatus, quoteStateBadgeVariant } from 'src/app/shared/badge/badge.component';
import { ButtonComponent, ButtonVariant } from 'src/app/shared/button/button.component';
import { ChatModalComponent } from 'src/app/shared/chat-modal/chat-modal.component';
import { ConfirmModalComponent } from 'src/app/shared/confirm-modal/confirm-modal.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { CreateTenderModalComponent } from 'src/app/shared/create-tender-modal/create-tender-modal.component';
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { NotFoundStateComponent } from 'src/app/shared/not-found-state/not-found-state.component';
import { QuoteDetailsModalComponent } from 'src/app/shared/quote-details-modal/quote-details-modal.component';
import { environment } from 'src/environments/environment';
import { QuoteService } from '../../../quotes/services/quote.service';
import { TendersPaths } from '../../tenders.paths';

/** A provider's offer in this tender, with the provider name resolved once on load. */
type OfferRow = Quote & { providerName: string; primaryState: string };

/** Buyer's page for one tender: its request, its actions, and the offers of the invited providers. */
@Component({
  selector: 'app-tender-detail',
  standalone: true,
  imports: [DatePipe, TranslateModule, ContentCardComponent, ButtonComponent, BadgeComponent, LoadingSpinnerComponent,
    NotFoundStateComponent, PaginatedTableComponent, ConfirmModalComponent, QuoteDetailsModalComponent, ChatModalComponent,
    CreateTenderModalComponent],
  templateUrl: './tender-detail.component.html',
})
export class TenderDetailComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private quoteService = inject(QuoteService);
  private localStorage = inject(LocalStorageService);
  private notificationService = inject(NotificationService);
  private accountService = inject(AccountServiceService);

  protected readonly devButtonsEnabled = environment.TENDER_DEV_BUTTONS_OPEN_CLOSE_ENABLED;

  @ViewChild(PaginatedTableComponent) private offersTable?: PaginatedTableComponent;

  currentUserId: string | null = null;
  tender: Quote | null = null;
  loading = true;
  notFound = false;

  offerColumns: TableColumn<OfferRow>[] = [];

  // The quote details modal shows either the tender itself (coordinator) or one provider offer
  showQuoteDetailsModal = false;
  selectedQuoteId: string | null = null;

  showChatModal = false;
  selectedChatQuoteId: string | null = null;

  showEditModal = false;
  tenderToEdit: Tender | null = null;

  showConfirm = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmLabel = '';
  confirmVariant: ButtonVariant = 'primary';
  private confirmAction: (() => void) | null = null;

  /** Offers loaded once per tender load: paging only slices them. */
  private offers?: Promise<OfferRow[]>;

  get state(): string {
    return this.tender?.quoteItem?.[0]?.state || this.tender?.state || 'unknown';
  }

  get statusLabel(): string {
    return tenderStatusLabelKey(QUOTE_CATEGORIES.COORDINATOR, 'customer', this.state);
  }

  get statusBadge(): BadgeStatus {
    // A closed tender is finished, not a success
    return this.state === QUOTE_STATUSES.ACCEPTED ? 'neutral' : quoteStateBadgeVariant(this.state);
  }

  /** Drafts haven't sent any invitation yet, so there are no offers to list. */
  get isDraft(): boolean {
    return this.state === QUOTE_STATUSES.PENDING;
  }

  get attachmentName(): string | undefined {
    return this.tender?.quoteItem?.find(item => item.attachment?.length)?.attachment?.[0]?.name;
  }

  ngOnInit() {
    const aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (aux && aux.logged_as == aux.id) {
      this.currentUserId = aux.partyId;
    } else if (aux?.logged_as) {
      this.currentUserId = aux.organizations.find((element: { id: any }) => element.id == aux.logged_as)?.partyId ?? null;
    }

    this.offerColumns = [
      { header: 'TENDERS._provider', getValue: offer => offer.providerName, cellClass: 'break-words' },
      {
        header: 'TENDERS._status_header', type: 'status-badge', width: 'w-[260px]',
        getValue: offer => tenderStatusLabelKey(QUOTE_CATEGORIES.TENDER, 'customer', offer.primaryState),
        getStatus: offer => quoteStateBadgeVariant(offer.primaryState),
      },
      {
        header: 'TENDERS._actions', type: 'actions', width: 'w-32',
        actions: [
          { icon: faCommentDots, tooltip: 'TENDERS._chat', onClick: offer => this.openChat(offer), dataCy: 'offerChat' },
          {
            icon: faDownload, tooltip: 'TENDERS._download', onClick: offer => this.downloadAttachment(offer), dataCy: 'offerAttachment',
            showIf: offer => !!offer.quoteItem?.some(item => item.attachment?.length),
          },
        ],
      },
    ];

    void this.loadTender();
  }

  async loadTender() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound = true;
      this.loading = false;
      return;
    }
    this.loading = true;
    try {
      const tender = await firstValueFrom(this.quoteService.getQuoteById(id));
      if (tender?.category !== QUOTE_CATEGORIES.COORDINATOR) {
        this.notFound = true;
      } else {
        this.tender = tender;
        this.offers = undefined;
        this.offersTable?.refresh(true);
      }
    } catch {
      this.notFound = true;
    } finally {
      this.loading = false;
    }
  }

  fetchOffers = async (params: PageRequest): Promise<PageResult<OfferRow>> => {
    if (!this.tender?.id || !this.currentUserId || this.isDraft) {
      return { items: [], total: 0 };
    }
    this.offers ??= this.loadOffers(this.tender.id, this.currentUserId);
    let offers: OfferRow[];
    try {
      offers = await this.offers;
    } catch (error) {
      this.offers = undefined;
      throw error;
    }
    return { items: offers.slice(params.offset, params.offset + params.limit), total: offers.length };
  };

  goBack() {
    this.router.navigateByUrl(TendersPaths.root());
  }

  openTenderDetails() {
    this.selectedQuoteId = this.tender?.id ?? null;
    this.showQuoteDetailsModal = true;
  }

  openOffer(offer: OfferRow) {
    if (offer.primaryState === QUOTE_STATUSES.CANCELLED) return;
    this.selectedQuoteId = offer.id!;
    this.showQuoteDetailsModal = true;
  }

  closeQuoteDetailsModal() {
    this.showQuoteDetailsModal = false;
    this.selectedQuoteId = null;
  }

  onQuoteUpdated() {
    this.notificationService.showSuccess('TENDERS._updated');
    void this.loadTender();
  }

  openChat(offer: OfferRow) {
    this.selectedChatQuoteId = offer.id!;
    this.showChatModal = true;
  }

  closeChatModal() {
    this.showChatModal = false;
    this.selectedChatQuoteId = null;
  }

  downloadAttachment(quote: Quote) {
    this.quoteService.downloadAttachment(quote).subscribe({
      next: () => this.notificationService.showSuccess('TENDERS._download_started'),
      error: (error: any) => this.notificationService.showError('TENDERS._download_error', { details: error?.message }),
    });
  }

  editTender() {
    const tender = this.tender;
    if (!tender) return;

    const att = tender.quoteItem?.find(item => item.attachment?.length)?.attachment?.[0];
    const attachment: TenderAttachment | undefined = att ? {
      name: att.name || 'attachment.pdf',
      mimeType: att.mimeType || 'application/pdf',
      content: att.content,
      url: att.url,
      href: att.href,
      path: att.path,
      size: att.size?.amount,
    } : undefined;

    this.tenderToEdit = {
      id: tender.id,
      category: 'coordinator',
      state: this.toTenderState(this.state as QuoteStateType),
      responseDeadline: tender.expectedFulfillmentStartDate || tender.effectiveQuoteCompletionDate || new Date().toISOString(),
      tenderNote: tender.description || '',
      attachment,
      selectedProviders: tender.relatedParty?.filter(p => p.role?.toLowerCase() === API_ROLES.SELLER.toLowerCase()).map(p => p.id) || [],
      effectiveQuoteCompletionDate: tender.effectiveQuoteCompletionDate,
      expectedFulfillmentStartDate: tender.expectedFulfillmentStartDate,
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.tenderToEdit = null;
    void this.loadTender();
  }

  /** [dev] Launch the tender now: approved + start date today. */
  startTender() {
    this.askConfirm('TENDERS._confirm_start_title', 'TENDERS._confirm_start_msg', 'TENDERS._dev_start', 'primary', () =>
      this.runDevTransition(QUOTE_STATUSES.APPROVED, 'expectedFulfillment', 'TENDERS._started', 'TENDERS._start_error'));
  }

  /** [dev] Close the tender now: accepted + end date today. */
  closeTender() {
    this.askConfirm('TENDERS._confirm_close_title', 'TENDERS._confirm_close_msg', 'TENDERS._dev_close', 'primary', () =>
      this.runDevTransition(QUOTE_STATUSES.ACCEPTED, 'effective', 'TENDERS._closed', 'TENDERS._close_error'));
  }

  onConfirmResolved(confirmed: boolean) {
    const action = this.confirmAction;
    this.showConfirm = false;
    this.confirmAction = null;
    if (confirmed) action?.();
  }

  private askConfirm(title: string, message: string, label: string, variant: ButtonVariant, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmLabel = label;
    this.confirmVariant = variant;
    this.confirmAction = action;
    this.showConfirm = true;
  }

  private runDevTransition(status: string, dateType: 'expectedFulfillment' | 'effective', success: string, failure: string) {
    const id = this.tender?.id;
    if (!id) return;
    const today = new Date();
    const formatted = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;
    this.quoteService.updateQuoteStatus(id, status).pipe(
      switchMap(() => this.quoteService.updateQuoteDate(id, formatted, dateType)),
    ).subscribe({
      next: () => {
        this.notificationService.showSuccess(success);
        void this.loadTender();
      },
      error: (error: any) => this.notificationService.showError(failure, { details: error?.message }),
    });
  }

  private async loadOffers(tenderId: string, userId: string): Promise<OfferRow[]> {
    const quotes = await firstValueFrom(this.quoteService.getTenderingQuotesByExternalId(userId, tenderId, API_ROLES.BUYER));
    return Promise.all(quotes.map(async quote => {
      const provider = quote.relatedParty?.find(party => party.role?.toLowerCase() === API_ROLES.SELLER.toLowerCase());
      return {
        ...quote,
        providerName: provider?.id ? await this.organizationName(provider.id) : '-',
        primaryState: quote.quoteItem?.[0]?.state || quote.state || 'unknown',
      };
    }));
  }

  private organizationName(id: string): Promise<string> {
    if (!id.startsWith('urn:ngsi-ld:organization:')) {
      return Promise.resolve(id);
    }
    return this.accountService.getOrgInfo(id).then(
      (org: any) => org?.tradingName || org?.name || id,
      () => id,
    );
  }

  private toTenderState(state: QuoteStateType): TenderStateType {
    switch (state) {
      case 'pending': return 'draft';
      case 'inProgress': return 'pre-launched';
      case 'approved': return 'sent';
      case 'accepted': return 'closed';
      case 'cancelled': return 'cancelled';
      case 'rejected': return 'rejected';
      default: return 'draft';
    }
  }
}
