import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { SellerOfferingsPaths } from 'src/app/pages/seller-offerings/seller-offerings.paths';
import { switchMap } from 'rxjs/operators';
import { forkJoin, Observable, of } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { NotificationService } from '../../services/notification.service';
import { AccountServiceService } from '../../services/account-service.service';
import { ApiServiceService } from '../../services/product-service.service';
import { Quote } from '../../models/quote.model';
import { TENDERING_STATUS_MESSAGES, COORDINATOR_STATUS_MESSAGES, QUOTE_CHAT_MESSAGES, QUOTE_CATEGORIES, QUOTE_STATUSES, TENDER_COORDINATOR_STATUSES_LABELS, TENDER_RELATED_QUOTES_LABELS_CUSTOMER, TENDER_RELATED_QUOTES_LABELS_PROVIDER, tailoredStatusLabelKeys } from '../../models/quote.constants';
import { API_ROLES } from '../../models/roles.constants';
import { ChatModalComponent } from '../chat-modal/chat-modal.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ButtonComponent, ButtonVariant } from '../button/button.component';
import { ContentCardComponent } from '../content-card/content-card.component';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { BadgeComponent, BadgeStatus, quoteStateBadgeVariant } from '../badge/badge.component';

@Component({
  selector: 'app-quote-details-modal',
  standalone: true,
  imports: [DatePipe, FormsModule, TranslateModule, ChatModalComponent, ConfirmModalComponent, ButtonComponent,
    ContentCardComponent, LoadingSpinnerComponent, BadgeComponent],
  templateUrl: './quote-details-modal.component.html',
})
export class QuoteDetailsModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() quoteId: string | null = null;
  @Input() currentUserRole: 'customer' | 'seller' = 'customer';
  @Input() currentUserId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() quoteUpdated = new EventEmitter<Quote>();

  quote: Quote | null = null;
  coordinatorQuote: Quote | null = null; // For tendering quotes, store the coordinator quote
  isLoading = false;
  error: string | null = null;
  isProcessing = false;
  isUploading = false;

  // Confirmation dialogs
  showConfirmDialog = false;
  confirmDialogTitle = '';
  confirmDialogMessage = '';
  confirmDialogCallback: (() => void) | null = null;
  confirmDialogButtonText = 'CONFIRM_MODAL._confirm';
  confirmDialogVariant: ButtonVariant = 'primary';

  // Data enrichment
  buyerName = '-';
  buyerVatId = '-';
  buyerOperatorName = '-';
  buyerOperatorVatId = '-';
  sellerName = '-';
  sellerVatId = '-';
  sellerOperatorName = '-';
  sellerOperatorVatId = '-';
  productName = '-';

  // Expected date picker
  showExpectedDatePicker = false;
  selectedExpectedDate = '';

  // Chat modal
  showChatModal = false;

  // Broadcast message modal
  showBroadcastModal = false;
  broadcastMessage = '';
  isBroadcastSending = false;

  // Expose constants to template
  readonly QUOTE_CATEGORIES = QUOTE_CATEGORIES;
  readonly QUOTE_STATUSES = QUOTE_STATUSES;

  // Services
  private quoteService = inject(QuoteService);
  private notificationService = inject(NotificationService);
  private accountService = inject(AccountServiceService);
  private productService = inject(ApiServiceService);
  private router = inject(Router);

  get minDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  ngOnInit() {
    if (this.isOpen && this.quoteId) {
      this.loadQuote(this.quoteId);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.isOpen && this.quoteId) {
      this.loadQuote(this.quoteId);
    } else if (!this.isOpen) {
      this.resetState();
    }
  }

  private resetState() {
    this.quote = null;
    this.coordinatorQuote = null;
    this.error = null;
    this.buyerName = '-';
    this.buyerVatId = '-';
    this.buyerOperatorName = '-';
    this.buyerOperatorVatId = '-';
    this.sellerName = '-';
    this.sellerVatId = '-';
    this.sellerOperatorName = '-';
    this.sellerOperatorVatId = '-';
    this.productName = '-';
    this.showExpectedDatePicker = false;
    this.selectedExpectedDate = '';
  }

  loadQuote(id: string) {
    this.isLoading = true;
    this.error = null;

    this.quoteService.getQuoteById(id).subscribe({
      next: (quote) => {
        this.quote = quote;

        // If this is a tendering quote and has a coordinator (externalId), load the coordinator quote
        if (quote.category === QUOTE_CATEGORIES.TENDER && quote.externalId) {
          this.quoteService.getQuoteById(quote.externalId).subscribe({
            next: (coordinatorQuote) => {
              this.coordinatorQuote = coordinatorQuote;
              console.log('Loaded coordinator quote:', coordinatorQuote);
              this.isLoading = false;
              this.enrichQuoteData();
            },
            error: (error: Error) => {
              console.error('Failed to load coordinator quote:', error);
              // Continue without coordinator quote
              this.isLoading = false;
              this.enrichQuoteData();
            }
          });
        } else {
          this.isLoading = false;
          this.enrichQuoteData();
        }
      },
      error: (error: Error) => {
        this.error = 'QUOTES.DETAILS._load_error';
        this.isLoading = false;
        this.notificationService.showError(this.error);
      }
    });
  }

  /**
   * Check if an ID is an organization URN that can be fetched from the API
   */
  private isOrganizationId(id: string | undefined): boolean {
    return !!id && id.startsWith('urn:ngsi-ld:organization:');
  }

  /**
   * Fetch party name from API if it's an organization ID, otherwise use the ID as-is
   */
  private fetchPartyName(
    partyId: string | undefined,
    onSuccess: (name: string) => void,
    fallbackValue: string = '-'
  ) {
    if (!partyId) {
      onSuccess(fallbackValue);
      return;
    }

    if (this.isOrganizationId(partyId)) {
      this.accountService.getOrgInfo(partyId).then(
        (org: any) => {
          onSuccess(org?.tradingName || org?.name || partyId);
        },
        () => {
          onSuccess(partyId);
        }
      );
    } else {
      // Not an organization ID, use the ID value directly
      onSuccess(partyId);
    }
  }

  private enrichQuoteData() {
    if (!this.quote) return;

    // Extract all 4 parties from relatedParty
    const partyWithRole = (role: string) =>
      this.quote!.relatedParty?.find(p => p.role?.toLowerCase() === role.toLowerCase());
    const buyer = partyWithRole(API_ROLES.BUYER);
    const buyerOperator = partyWithRole(API_ROLES.BUYER_OPERATOR);
    const seller = partyWithRole(API_ROLES.SELLER);
    const sellerOperator = partyWithRole(API_ROLES.SELLER_OPERATOR);

    // VAT IDs travel in the relatedParty name as DIDs: strip the "did:elsi:" prefix
    const cleanVatId = (vatId: string | undefined): string => {
      if (!vatId) return '-';
      return vatId.replace(/^did:elsi:/, '');
    };

    // Get VAT IDs from relatedParty name field and clean them
    this.buyerVatId = cleanVatId(buyer?.name);
    this.buyerOperatorVatId = cleanVatId(buyerOperator?.name);
    this.sellerVatId = cleanVatId(seller?.name);
    this.sellerOperatorVatId = cleanVatId(sellerOperator?.name);

    // Fetch party names (only calls API for organization IDs)
    // For operators without org IDs, name stays as 'N/A'
    this.fetchPartyName(buyer?.id, (name) => this.buyerName = name);
    if (this.isOrganizationId(buyerOperator?.id)) {
      this.fetchPartyName(buyerOperator?.id, (name) => this.buyerOperatorName = name);
    }
    this.fetchPartyName(seller?.id, (name) => this.sellerName = name);
    if (this.isOrganizationId(sellerOperator?.id)) {
      this.fetchPartyName(sellerOperator?.id, (name) => this.sellerOperatorName = name);
    }

    // Fetch product info
    const productOfferingId = this.quote.quoteItem?.[0]?.productOffering?.id;
    if (productOfferingId) {
      // First check if name is already in the quote data
      const existingName = this.quote.quoteItem?.[0]?.productOffering?.name;
      if (existingName) {
        this.productName = existingName;
      } else {
        this.productService.getProductById(productOfferingId).then(
          (product: any) => {
            this.productName = product?.name || productOfferingId;
          },
          () => {
            this.productName = productOfferingId;
          }
        );
      }
    }
  }

  getPrimaryState(): string {
    if (!this.quote) return 'unknown';
    if (Array.isArray(this.quote.quoteItem) && this.quote.quoteItem.length > 0) {
      return this.quote.quoteItem[0].state || 'unknown';
    }
    return this.quote.state || 'unknown';
  }

  /** Tailored labels are i18n keys; tender/coordinator ones are still plain English
   * (shared with tender-list) and pass through the translate pipe unchanged. */
  getStatusLabel(): string {
    const state = this.getPrimaryState();
    if (!this.quote) return state;

    const category = this.getQuoteCategory();
    if (category !== QUOTE_CATEGORIES.COORDINATOR && category !== QUOTE_CATEGORIES.TENDER) {
      return tailoredStatusLabelKeys(this.currentUserRole)[state] ?? state;
    }

    const labels: Record<string, string> = category === QUOTE_CATEGORIES.COORDINATOR
      ? TENDER_COORDINATOR_STATUSES_LABELS
      : this.currentUserRole === 'customer' ? TENDER_RELATED_QUOTES_LABELS_CUSTOMER : TENDER_RELATED_QUOTES_LABELS_PROVIDER;
    const key = Object.entries(QUOTE_STATUSES).find(([, value]) => value === state)?.[0];
    return (key && labels[key]) || state;
  }

  // Returns the state of the coordinator quote (for tendering quotes)
  getCoordinatorState(): string | null {
    if (!this.coordinatorQuote) return null;
    if (Array.isArray(this.coordinatorQuote.quoteItem) && this.coordinatorQuote.quoteItem.length > 0) {
      return this.coordinatorQuote.quoteItem[0].state || null;
    }
    return this.coordinatorQuote.state || null;
  }

  getStatusBadge(): BadgeStatus {
    const state = this.getPrimaryState();
    // A closed tender is finished, not a success of this quote
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR && state === QUOTE_STATUSES.ACCEPTED) {
      return 'neutral';
    }
    return quoteStateBadgeVariant(state);
  }

  getQuoteCategory(): string {
    return this.quote?.category || 'tailored';
  }

  getModalTitle(): string {
    return this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR ? 'QUOTES.DETAILS._title_tender' : 'QUOTES.DETAILS._title_quote';
  }

  getStatusExplanation(): string {
    return this.statusInfo('explanation');
  }

  getAvailableActionsText(): string {
    return this.statusInfo('availableActions');
  }

  /** Tailored texts are i18n keys (QUOTES.STATUS_INFO); tender/coordinator ones are still
   * plain English constants shared with tender-list. */
  private statusInfo(field: 'explanation' | 'availableActions'): string {
    const state = this.getPrimaryState();
    const role = this.currentUserRole === 'customer' ? 'buyer' : 'provider';
    const category = this.getQuoteCategory();

    if (category !== QUOTE_CATEGORIES.COORDINATOR && category !== QUOTE_CATEGORIES.TENDER) {
      return `QUOTES.STATUS_INFO.${state}.${role}._${field === 'explanation' ? 'explanation' : 'actions'}`;
    }
    const messages = category === QUOTE_CATEGORIES.COORDINATOR ? COORDINATOR_STATUS_MESSAGES : TENDERING_STATUS_MESSAGES;
    return messages[state]?.[role]?.[field] || '';
  }

  isQuoteFinalized(): boolean {
    const state = this.getPrimaryState();
    return state === QUOTE_STATUSES.CANCELLED || state === QUOTE_STATUSES.ACCEPTED || state === QUOTE_STATUSES.REJECTED;
  }

  hasAttachment(): boolean {
    return this.quote?.quoteItem?.some(qi => qi.attachment && qi.attachment.length > 0) || false;
  }

  getAttachmentName(): string {
    return this.quote?.quoteItem?.[0]?.attachment?.[0]?.name || 'attachment.pdf';
  }

  hasCoordinatorAttachment(): boolean {
    // Only show coordinator attachment for tendering quotes from provider side
    if (this.getQuoteCategory() !== QUOTE_CATEGORIES.TENDER) return false;
    return this.coordinatorQuote?.quoteItem?.some(qi => qi.attachment && qi.attachment.length > 0) || false;
  }

  getCoordinatorAttachmentName(): string {
    const attachment = this.coordinatorQuote?.quoteItem?.[0]?.attachment?.[0];
    return attachment?.name || 'tender-request.pdf';
  }

  /** Tender quotes show their coordinator's dates; coordinator quotes their own. */
  private get tenderDatesSource(): Quote | null {
    return this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER && this.coordinatorQuote ? this.coordinatorQuote : this.quote;
  }

  getTenderStartDate(): string | undefined {
    return this.tenderDatesSource?.expectedFulfillmentStartDate;
  }

  getTenderEndDate(): string | undefined {
    return this.tenderDatesSource?.effectiveQuoteCompletionDate;
  }

  canUploadAttachment(): boolean {
    if (this.currentUserRole !== 'seller') return false;
    // For tendering quotes, only allow upload when the coordinator is in 'approved' (launched) state
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER) {
      return this.getCoordinatorState() === QUOTE_STATUSES.APPROVED;
    }
    const state = this.getPrimaryState();
    return state === QUOTE_STATUSES.IN_PROGRESS || state === QUOTE_STATUSES.APPROVED;
  }

  canEditExpectedDate(): boolean {
    if (this.currentUserRole !== 'seller') return false;
    const state = this.getPrimaryState();
    return !this.isQuoteFinalized() && (state === QUOTE_STATUSES.PENDING || state === QUOTE_STATUSES.IN_PROGRESS || state === QUOTE_STATUSES.APPROVED);
  }

  canRejectOrCancel(): boolean {
    const state = this.getPrimaryState();
    if (this.currentUserRole === 'seller') {
      // Sellers can cancel quotes in pending, inProgress, or approved states
      return state === QUOTE_STATUSES.PENDING || state === QUOTE_STATUSES.IN_PROGRESS || state === QUOTE_STATUSES.APPROVED;
    } else {
      // Customers can reject quotes only in approved state
      return state === QUOTE_STATUSES.APPROVED;
    }
  }

  canAcceptQuote(): boolean {
    // Provider can only accept if expected date is set
    if (this.currentUserRole === 'seller') {
      return !!this.quote?.expectedQuoteCompletionDate;
    }
    return true;
  }

  getAcceptButtonTooltip(): string {
    if (this.currentUserRole === 'seller' && !this.quote?.expectedQuoteCompletionDate) {
      return 'QUOTES.DETAILS._expected_date_required';
    }
    return '';
  }

  /** Provider accepting a pending request (tender invites: only while the tender is running). */
  get canProviderAccept(): boolean {
    return this.currentUserRole === 'seller' && this.getPrimaryState() === QUOTE_STATUSES.PENDING
      && this.getQuoteCategory() !== QUOTE_CATEGORIES.COORDINATOR
      && (this.getQuoteCategory() !== QUOTE_CATEGORIES.TENDER || this.getCoordinatorState() === QUOTE_STATUSES.IN_PROGRESS);
  }

  /** Customer accepting the provider's proposal (tender offers: only once the tender is closed). */
  get canCustomerAccept(): boolean {
    return this.currentUserRole === 'customer' && this.getPrimaryState() === QUOTE_STATUSES.APPROVED
      && this.getQuoteCategory() !== QUOTE_CATEGORIES.COORDINATOR
      && (this.getQuoteCategory() !== QUOTE_CATEGORIES.TENDER || this.getCoordinatorState() === QUOTE_STATUSES.ACCEPTED);
  }

  /** Coordinator customer messaging every invited provider (not while the tender is still a draft). */
  get canBroadcast(): boolean {
    return this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR && this.currentUserRole === 'customer'
      && this.getPrimaryState() !== QUOTE_STATUSES.PENDING;
  }

  get canCancel(): boolean {
    const state = this.getPrimaryState();
    return state !== QUOTE_STATUSES.ACCEPTED && state !== QUOTE_STATUSES.CANCELLED;
  }

  get canCreateOffer(): boolean {
    return this.currentUserRole === 'seller' && this.getPrimaryState() === QUOTE_STATUSES.ACCEPTED;
  }

  get providerAcceptHelp(): string {
    return this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER ? 'QUOTES.DETAILS._accept_tender_invite' : 'QUOTES.DETAILS._accept_quote_provider';
  }

  get cancelLabel(): string {
    return this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR ? 'QUOTES.DETAILS._cancel_tender' : 'QUOTES.DETAILS._cancel_quote';
  }

  get cancelHelp(): string {
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR) return 'QUOTES.DETAILS._cancel_tender_help';
    if (this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER && this.currentUserRole === 'seller'
      && this.getPrimaryState() === QUOTE_STATUSES.PENDING) {
      return 'QUOTES.DETAILS._decline_tender_invite';
    }
    return 'QUOTES.DETAILS._cancel_quote_provider';
  }

  downloadAttachment() {
    if (!this.quote) return;
    this.quoteService.downloadAttachment(this.quote).subscribe({
      next: () => this.notificationService.showSuccess('QUOTES.DETAILS._download_started'),
      error: (error: any) => this.notificationService.showError('QUOTES.DETAILS._download_error', { details: error?.message })
    });
  }

  downloadCoordinatorAttachment() {
    if (!this.coordinatorQuote) return;
    this.quoteService.downloadAttachment(this.coordinatorQuote).subscribe({
      next: () => this.notificationService.showSuccess('QUOTES.DETAILS._download_started'),
      error: (error: any) => this.notificationService.showError('QUOTES.DETAILS._download_error', { details: error?.message })
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.quote?.id) return;

    const file = input.files[0];
    if (file.type !== 'application/pdf') {
      this.notificationService.showError('QUOTES.DETAILS._only_pdf');
      return;
    }

    // Check file size (10MB = 10 * 1024 * 1024 bytes)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.notificationService.showError('QUOTES.DETAILS._too_big');
      return;
    }

    this.isUploading = true;
    const fileName = file.name;
    const quoteId = this.quote.id;

    this.quoteService.addAttachmentToQuote(quoteId, file).pipe(
      // Add note for attachment upload
      switchMap((updatedQuote) => {
        this.quote = updatedQuote;
        return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.ATTACHMENT_UPLOADED(fileName), this.currentUserId).pipe(
          switchMap(() => {
            // Auto-approve if in progress
            if (this.getPrimaryState() === QUOTE_STATUSES.IN_PROGRESS) {
              return this.quoteService.updateQuoteStatus(quoteId, QUOTE_STATUSES.APPROVED).pipe(
                switchMap((approvedQuote) => {
                  this.quote = approvedQuote;
                  return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(QUOTE_STATUSES.APPROVED), this.currentUserId);
                })
              );
            }
            return [updatedQuote];
          })
        );
      })
    ).subscribe({
      next: () => {
        this.isUploading = false;
        this.notificationService.showSuccess('QUOTES.DETAILS._uploaded');
        if (this.getPrimaryState() === QUOTE_STATUSES.APPROVED) {
          this.notificationService.showSuccess('QUOTES.DETAILS._approved_sent');
        }
        this.quoteUpdated.emit(this.quote!);
      },
      error: (error) => {
        this.isUploading = false;
        this.notificationService.showError('QUOTES.DETAILS._upload_error');
      }
    });
  }

  acceptQuote() {
    if (!this.quote?.id || this.isProcessing) return;

    this.confirmDialogTitle = 'QUOTES.DETAILS._confirm_accept_request_title';
    this.confirmDialogMessage = 'QUOTES.DETAILS._confirm_accept_request_msg';
    this.confirmDialogButtonText = 'QUOTES.DETAILS._accept';
    this.confirmDialogVariant = 'primary';
    this.confirmDialogCallback = () => {
      this.isProcessing = true;
      const quoteId = this.quote!.id!;

      this.quoteService.updateQuoteStatus(quoteId, QUOTE_STATUSES.IN_PROGRESS).pipe(
        switchMap((updatedQuote) => {
          this.quote = updatedQuote;
          return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(QUOTE_STATUSES.IN_PROGRESS), this.currentUserId);
        })
      ).subscribe({
        next: () => {
          this.isProcessing = false;
          this.notificationService.showSuccess('QUOTES.DETAILS._request_accepted');
          this.quoteUpdated.emit(this.quote!);
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.showError('QUOTES.DETAILS._accept_error');
        }
      });
      this.showConfirmDialog = false;
    };
    this.showConfirmDialog = true;
  }

  acceptProposal() {
    if (!this.quote?.id || this.isProcessing) return;

    const isTender = this.getQuoteCategory() === QUOTE_CATEGORIES.TENDER;

    this.confirmDialogTitle = isTender ? 'QUOTES.DETAILS._confirm_accept_tender_title' : 'QUOTES.DETAILS._confirm_accept_proposal_title';
    this.confirmDialogMessage = isTender ? 'QUOTES.DETAILS._confirm_accept_tender_msg' : 'QUOTES.DETAILS._confirm_accept_proposal_msg';
    this.confirmDialogButtonText = 'QUOTES.DETAILS._accept';
    this.confirmDialogVariant = 'primary';
    this.confirmDialogCallback = () => {
      this.isProcessing = true;
      const quoteId = this.quote!.id!;
      const externalId = this.quote!.externalId;

      this.quoteService.updateQuoteStatus(quoteId, QUOTE_STATUSES.ACCEPTED).pipe(
        switchMap((updatedQuote) => {
          this.quote = updatedQuote;
          return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(QUOTE_STATUSES.ACCEPTED), this.currentUserId);
        })
      ).subscribe({
        next: () => {
          if (isTender && externalId) {
            this.quoteService.getTenderingQuotesByExternalId(this.currentUserId, externalId, API_ROLES.BUYER).subscribe({
              next: (siblings) => {
                const toReject = siblings.filter(s => {
                  if (s.id === quoteId) return false;
                  const state = s.quoteItem?.[0]?.state ?? s.state;
                  return state !== QUOTE_STATUSES.ACCEPTED && state !== QUOTE_STATUSES.CANCELLED && state !== QUOTE_STATUSES.REJECTED;
                });
                if (toReject.length > 0) {
                  forkJoin(toReject.map(s => this.quoteService.updateQuoteStatus(s.id!, QUOTE_STATUSES.REJECTED))).subscribe({
                    next: () => {
                      this.isProcessing = false;
                      this.notificationService.showSuccess('QUOTES.DETAILS._offer_accepted');
                      this.quoteUpdated.emit(this.quote!);
                    },
                    error: () => {
                      this.isProcessing = false;
                      this.notificationService.showError('QUOTES.DETAILS._offer_accepted_reject_failed');
                      this.quoteUpdated.emit(this.quote!);
                    }
                  });
                } else {
                  this.isProcessing = false;
                  this.notificationService.showSuccess('QUOTES.DETAILS._proposal_accepted');
                  this.quoteUpdated.emit(this.quote!);
                }
              },
              error: () => {
                this.isProcessing = false;
                this.notificationService.showError('QUOTES.DETAILS._offer_accepted_reject_failed');
                this.quoteUpdated.emit(this.quote!);
              }
            });
          } else {
            this.isProcessing = false;
            this.notificationService.showSuccess('QUOTES.DETAILS._proposal_accepted');
            this.quoteUpdated.emit(this.quote!);
          }
        },
        error: (error) => {
          this.isProcessing = false;
          this.notificationService.showError('QUOTES.DETAILS._accept_proposal_error');
        }
      });
      this.showConfirmDialog = false;
    };
    this.showConfirmDialog = true;
  }

  cancelQuote() {
    if (!this.quote?.id || this.isProcessing) return;

    const isCoordinator = this.getQuoteCategory() === QUOTE_CATEGORIES.COORDINATOR;

    this.confirmDialogTitle = isCoordinator ? 'QUOTES.DETAILS._cancel_tender' : 'QUOTES.DETAILS._cancel_quote';
    this.confirmDialogMessage = isCoordinator ? 'QUOTES.DETAILS._confirm_cancel_tender_msg' : 'QUOTES.DETAILS._confirm_cancel_quote_msg';
    this.confirmDialogButtonText = this.confirmDialogTitle;
    this.confirmDialogVariant = 'danger';
    this.confirmDialogCallback = () => {
      this.isProcessing = true;
      this.showConfirmDialog = false;

      if (isCoordinator) {
        this.cancelCoordinatorWithCascade();
      } else {
        this.cancelSingleQuote(this.quote!.id!);
      }
    };
    this.showConfirmDialog = true;
  }

  private cancelSingleQuote(quoteId: string) {
    const newStatus = QUOTE_STATUSES.CANCELLED;
    this.quoteService.updateQuoteStatus(quoteId, newStatus).pipe(
      switchMap((updatedQuote) => {
        this.quote = updatedQuote;
        return this.quoteService.addNoteToQuote(quoteId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(newStatus), this.currentUserId);
      })
    ).subscribe({
      next: () => {
        this.isProcessing = false;
        this.notificationService.showSuccess('QUOTES.DETAILS._quote_cancelled');
        this.quoteUpdated.emit(this.quote!);
        this.closeModal();
      },
      error: () => {
        this.isProcessing = false;
        this.notificationService.showError('QUOTES.DETAILS._cancel_error');
      }
    });
  }

  private cancelCoordinatorWithCascade() {
    const coordinatorId = this.quote!.id!;
    const newStatus = QUOTE_STATUSES.CANCELLED;

    // Step 1: Fetch all related tendering quotes for this coordinator
    this.quoteService.getTenderingQuotesByExternalId(this.currentUserId, coordinatorId, API_ROLES.BUYER).subscribe({
      next: (relatedQuotes) => {
        console.log(`Found ${relatedQuotes.length} related tendering quotes to cancel`);

        // Step 2: Cancel all related tendering quotes in parallel
        const cancelRelatedObservables = relatedQuotes.map(relatedQuote =>
          this.quoteService.updateQuoteStatus(relatedQuote.id!, newStatus)
        );

        const cancelAll$ = cancelRelatedObservables.length > 0
          ? forkJoin(cancelRelatedObservables)
          : of([]);

        cancelAll$.pipe(
          // Step 3: Once all related quotes are cancelled, cancel the coordinator itself
          switchMap(() => this.quoteService.updateQuoteStatus(coordinatorId, newStatus)),
          switchMap((updatedCoordinator) => {
            this.quote = updatedCoordinator;
            return this.quoteService.addNoteToQuote(coordinatorId, QUOTE_CHAT_MESSAGES.STATUS_CHANGE(newStatus), this.currentUserId);
          })
        ).subscribe({
          next: () => {
            this.isProcessing = false;
            this.notificationService.showSuccess('QUOTES.DETAILS._tender_cancelled');
            this.quoteUpdated.emit(this.quote!);
            this.closeModal();
          },
          error: () => {
            this.isProcessing = false;
            this.notificationService.showError('QUOTES.DETAILS._tender_cancel_error');
          }
        });
      },
      error: () => {
        this.isProcessing = false;
        this.notificationService.showError('QUOTES.DETAILS._related_fetch_error');
      }
    });
  }

  saveExpectedDate() {
    if (!this.quote?.id || !this.selectedExpectedDate) return;

    const dateObj = new Date(this.selectedExpectedDate);
    const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

    this.quoteService.updateQuoteDate(this.quote.id, formattedDate, 'expected').subscribe({
      next: (updatedQuote) => {
        this.quote = updatedQuote;
        this.showExpectedDatePicker = false;
        this.selectedExpectedDate = '';
        this.notificationService.showSuccess('QUOTES.DETAILS._expected_date_updated');
        this.quoteUpdated.emit(updatedQuote);
      },
      error: (error) => {
        this.notificationService.showError('QUOTES.DETAILS._expected_date_error');
      }
    });
  }

  createOffer() {
    if (!this.quote?.id) return;
    this.closeModal();
    this.router.navigate([SellerOfferingsPaths.root()], { state: { quoteId: this.quote.id } });
  }

  // Coordinator-specific actions
  openBroadcastMessage() {
    if (!this.quote?.id) return;
    this.broadcastMessage = '';
    this.showBroadcastModal = true;
  }

  closeBroadcastModal() {
    this.showBroadcastModal = false;
    this.broadcastMessage = '';
    this.isBroadcastSending = false;
  }

  sendBroadcastMessage() {
    if (!this.quote?.id || !this.currentUserId || !this.broadcastMessage) {
      return;
    }

    this.confirmDialogTitle = 'QUOTES.DETAILS._broadcast';
    this.confirmDialogMessage = 'QUOTES.DETAILS._confirm_broadcast_msg';
    this.confirmDialogButtonText = 'QUOTES.DETAILS._send';
    this.confirmDialogVariant = 'primary';

    this.confirmDialogCallback = () => {
      this.executeBroadcastMessage();
      this.showConfirmDialog = false;
    };
    this.showConfirmDialog = true;
  }

  private executeBroadcastMessage() {
    if (!this.quote?.id || !this.currentUserId || !this.broadcastMessage) return;

    this.isBroadcastSending = true;

    this.quoteService.getTenderingQuotesByExternalId(this.currentUserId, this.quote.id, API_ROLES.BUYER).pipe(
      switchMap((quotes) => {
        const quotesToMessage = quotes.filter(q => q.category === QUOTE_CATEGORIES.TENDER && q.id);

        if (quotesToMessage.length === 0) {
          this.notificationService.showError('QUOTES.DETAILS._broadcast_none');
          this.isBroadcastSending = false;
          return of(null);
        }

        const requests = quotesToMessage.map(q =>
          this.quoteService.addNoteToQuote(q.id!, this.broadcastMessage, this.currentUserId)
        ) as Observable<Quote>[];

        return forkJoin(requests);
      })
    ).subscribe({
      next: (result) => {
        if (!result) return;
        this.notificationService.showSuccess('QUOTES.DETAILS._broadcast_sent');
        this.closeBroadcastModal();
      },
      error: (error: Error) => {
        console.error('Failed to broadcast message:', error);
        this.notificationService.showError('QUOTES.DETAILS._broadcast_error');
        this.isBroadcastSending = false;
      }
    });
  }

  onConfirmResolved(confirmed: boolean) {
    if (confirmed && this.confirmDialogCallback) {
      this.confirmDialogCallback();
    } else {
      this.showConfirmDialog = false;
    }
  }

  closeModal() {
    this.close.emit();
  }

  openChat() {
    this.showChatModal = true;
  }

  closeChatModal() {
    this.showChatModal = false;
  }
}
