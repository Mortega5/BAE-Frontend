import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { QuoteService } from 'src/app/features/quotes/services/quote.service';
import { Quote } from 'src/app/models/quote.model';
import { QUOTE_CATEGORIES, QUOTE_STATUSES } from 'src/app/models/quote.constants';
import { API_ROLES } from 'src/app/models/roles.constants';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { QuoteDetailsModalComponent } from './quote-details-modal.component';

describe('QuoteDetailsModalComponent', () => {
  let fixture: ComponentFixture<QuoteDetailsModalComponent>;
  let component: QuoteDetailsModalComponent;
  let quoteService: jasmine.SpyObj<QuoteService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const coordinatorQuote: Quote = {
    id: 'coordinator-1',
    category: QUOTE_CATEGORIES.COORDINATOR,
    description: 'Coordinator tender',
    state: QUOTE_STATUSES.IN_PROGRESS,
    quoteItem: [{ state: QUOTE_STATUSES.IN_PROGRESS }],
  };

  beforeEach(async () => {
    quoteService = jasmine.createSpyObj<QuoteService>('QuoteService', [
      'addAttachmentToQuote',
      'addNoteToQuote',
      'broadcastMessage',
      'getQuoteById',
      'getTenderingQuotesByExternalId',
    ]);
    notificationService = jasmine.createSpyObj<NotificationService>('NotificationService', ['showError', 'showSuccess']);

    quoteService.addNoteToQuote.and.callFake((id) => of({ id, quoteItem: [] } as Quote));
    quoteService.broadcastMessage.and.returnValue(of({}));
    quoteService.getQuoteById.and.returnValue(of(coordinatorQuote));
    quoteService.getTenderingQuotesByExternalId.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [QuoteDetailsModalComponent, TranslateModule.forRoot()],
      providers: [
        { provide: QuoteService, useValue: quoteService },
        { provide: NotificationService, useValue: notificationService },
        {
          provide: LocalStorageService,
          useValue: {
            getObject: () => ({ logged_as: 'user-1', id: 'user-1', partyId: 'buyer-1', organizations: [] }),
          },
        },
        { provide: AccountServiceService, useValue: { getOrgInfo: () => Promise.resolve({ tradingName: 'Known Org' }) } },
        { provide: ApiServiceService, useValue: { getProductById: () => Promise.resolve({ name: 'Product' }) } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QuoteDetailsModalComponent);
    component = fixture.componentInstance;
  });

  it('does not show the footer chat action for coordinator quote details', () => {
    component.isOpen = true;
    component.currentUserRole = 'customer';
    component.currentUserId = 'buyer-1';
    component.quoteId = 'coordinator-1';
    component.quote = coordinatorQuote;

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="quoteDetailsChat"]')).toBeNull();
  });

  it('uses a neutral badge for closed coordinator tenders', () => {
    component.quote = {
      ...coordinatorQuote,
      state: QUOTE_STATUSES.ACCEPTED,
      quoteItem: [{ state: QUOTE_STATUSES.ACCEPTED }],
    };

    expect(component.getStatusLabel()).toBe('TENDERS.STATUS.COORDINATOR.accepted');
    expect(component.getStatusBadge()).toBe('neutral');
  });

  it('labels tailored quotes with i18n keys for the current view', () => {
    component.quote = { id: 'quote-1', category: QUOTE_CATEGORIES.TAILORED, quoteItem: [{ state: QUOTE_STATUSES.PENDING }] } as Quote;

    component.currentUserRole = 'customer';
    expect(component.getStatusLabel()).toBe('QUOTES._status.request-sent-awaiting-feedback');
    expect(component.getStatusExplanation()).toBe('QUOTES.STATUS_INFO.pending.buyer._explanation');

    component.currentUserRole = 'seller';
    expect(component.getStatusLabel()).toBe('QUOTES._status.request-received-pending-feedback');
    expect(component.getAvailableActionsText()).toBe('QUOTES.STATUS_INFO.pending.provider._actions');
  });

  it('runs the pending action only when the confirm dialog resolves to true', () => {
    const callback = jasmine.createSpy('callback');
    component.confirmDialogCallback = callback;
    component.showConfirmDialog = true;

    component.onConfirmResolved(false);
    expect(callback).not.toHaveBeenCalled();
    expect(component.showConfirmDialog).toBeFalse();

    component.onConfirmResolved(true);
    expect(callback).toHaveBeenCalled();
  });

  it('broadcasts from coordinator quote details by adding notes to related tendering quotes', () => {
    const relatedQuotes: Quote[] = [
      { id: 'provider-quote-1', category: QUOTE_CATEGORIES.TENDER, quoteItem: [] },
      { id: 'provider-quote-2', category: QUOTE_CATEGORIES.TENDER, quoteItem: [] },
    ];
    quoteService.getTenderingQuotesByExternalId.and.returnValue(of(relatedQuotes));
    component.quote = coordinatorQuote;
    component.currentUserId = 'buyer-1';
    component.broadcastMessage = 'Hello providers';

    component.sendBroadcastMessage();
    component.confirmDialogCallback?.();

    expect(quoteService.getTenderingQuotesByExternalId)
      .toHaveBeenCalledWith('buyer-1', 'coordinator-1', API_ROLES.BUYER);
    expect(quoteService.addNoteToQuote).toHaveBeenCalledTimes(2);
    expect(quoteService.addNoteToQuote).toHaveBeenCalledWith('provider-quote-1', 'Hello providers', 'buyer-1');
    expect(quoteService.addNoteToQuote).toHaveBeenCalledWith('provider-quote-2', 'Hello providers', 'buyer-1');
    expect(quoteService.broadcastMessage).not.toHaveBeenCalled();
    expect(notificationService.showSuccess).toHaveBeenCalledWith('QUOTES.DETAILS._broadcast_sent');
  });

  it('explains tender and coordinator states with i18n keys, and nothing where there is no text', () => {
    component.currentUserRole = 'seller';
    component.quote = { id: 'q', category: QUOTE_CATEGORIES.TENDER, quoteItem: [{ state: QUOTE_STATUSES.APPROVED }] } as Quote;
    expect(component.getStatusExplanation()).toBe('TENDERS.STATUS_INFO.TENDER.approved.provider._explanation');

    component.currentUserRole = 'customer';
    component.quote = { id: 'c', category: QUOTE_CATEGORIES.COORDINATOR, quoteItem: [{ state: QUOTE_STATUSES.IN_PROGRESS }] } as Quote;
    expect(component.getAvailableActionsText()).toBe('TENDERS.STATUS_INFO.COORDINATOR.inProgress.buyer._actions');

    component.quote = { id: 'c', category: QUOTE_CATEGORIES.COORDINATOR, quoteItem: [{ state: QUOTE_STATUSES.REJECTED }] } as Quote;
    expect(component.getStatusExplanation()).toBe('');

    component.currentUserRole = 'seller';
    component.quote = { id: 'c', category: QUOTE_CATEGORIES.COORDINATOR, quoteItem: [{ state: QUOTE_STATUSES.IN_PROGRESS }] } as Quote;
    expect(component.getStatusExplanation()).toBe('');
  });

  it('uploads the PDF picked in the attachment component and ignores a cleared value', () => {
    const quote = { id: 'quote-1', category: QUOTE_CATEGORIES.TAILORED, quoteItem: [{ state: QUOTE_STATUSES.APPROVED }] } as Quote;
    quoteService.addAttachmentToQuote.and.returnValue(of(quote));
    component.quote = quote;
    component.currentUserId = 'seller-1';

    component.onAttachmentPicked(null);
    expect(quoteService.addAttachmentToQuote).not.toHaveBeenCalled();

    const file = new File(['%PDF'], 'proposal.pdf', { type: 'application/pdf' });
    component.onAttachmentPicked({ name: 'proposal.pdf', url: 'blob:x', attachmentType: 'application/pdf', file });

    expect(quoteService.addAttachmentToQuote).toHaveBeenCalledWith('quote-1', file);
    expect(notificationService.showSuccess).toHaveBeenCalledWith('QUOTES.DETAILS._uploaded');
  });
});
