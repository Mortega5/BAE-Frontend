import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AuthGuard } from 'src/app/guard/auth.guard';
import { Quote } from 'src/app/models/quote.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { QuoteService } from '../../services/quote.service';
import { QuoteListComponent, quoteStateBadgeVariant } from './quote-list.component';

const SELLER = 'urn:ngsi-ld:organization:seller';
const BUYER = 'urn:ngsi-ld:organization:buyer';

function quote(id: string, state: string, quoteDate: string): Quote {
  return {
    id,
    quoteDate,
    relatedParty: [{ id: SELLER, role: 'Seller' }, { id: BUYER, role: 'Buyer' }],
    quoteItem: [{ id: 'item', state, productOffering: { id: 'urn:offer' } }],
  } as Quote;
}

describe('QuoteListComponent', () => {
  let fixture: ComponentFixture<QuoteListComponent>;
  let component: QuoteListComponent;
  let quoteService: jasmine.SpyObj<QuoteService>;
  let router: jasmine.SpyObj<Router>;
  let queryRole: string | null;

  async function setup() {
    quoteService = jasmine.createSpyObj<QuoteService>('QuoteService', ['getQuotesByUserAndRole']);
    quoteService.getQuotesByUserAndRole.and.returnValue(of([
      quote('urn:quote:old', 'pending', '2026-01-01T00:00:00Z'),
      quote('urn:quote:new', 'cancelled', '2026-02-01T00:00:00Z'),
    ]));

    await TestBed.configureTestingModule({
      imports: [QuoteListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: QuoteService, useValue: quoteService },
        { provide: LocalStorageService, useValue: { getObject: () => ({ id: 'me', logged_as: 'me', partyId: BUYER, organizations: [] }) } },
        { provide: AccountServiceService, useValue: { getOrgInfo: (id: string) => Promise.resolve({ tradingName: id === SELLER ? 'Seller Org' : 'Buyer Org' }) } },
        { provide: ApiServiceService, useValue: { getProductById: () => Promise.resolve({ name: 'Product A' }) } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['showSuccess']) },
        { provide: AuthGuard, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryRole ? { role: queryRole } : {}) } } },
      ],
    })
      .overrideComponent(QuoteListComponent, { set: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(QuoteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    queryRole = null;
  });

  it('loads the session party quotes as customer, newest first, with the other party and product names', async () => {
    await setup();
    const page = await component.fetchQuotes({ limit: 10, offset: 0 }, {});

    expect(quoteService.getQuotesByUserAndRole).toHaveBeenCalledWith(BUYER, 'customer');
    expect(page.total).toBe(2);
    expect(page.items.map(row => row.id)).toEqual(['urn:quote:new', 'urn:quote:old']);
    expect(page.items[0].otherPartyName).toBe('Seller Org');
    expect(page.items[0].productName).toBe('Product A');
  });

  it('filters by status and pages on the client, fetching only once per role', async () => {
    await setup();
    const page = await component.fetchQuotes({ limit: 10, offset: 0 }, { status: ['pending'] });
    await component.fetchQuotes({ limit: 1, offset: 1 }, {});

    expect(page.items.map(row => row.id)).toEqual(['urn:quote:old']);
    expect(quoteService.getQuotesByUserAndRole).toHaveBeenCalledTimes(1);
  });

  it('reloads as provider, keeps it in the URL and shows the buyer as the other party', async () => {
    await setup();
    component.onRoleChange('seller');
    const page = await component.fetchQuotes({ limit: 10, offset: 0 }, {});

    expect(quoteService.getQuotesByUserAndRole).toHaveBeenCalledWith(BUYER, 'seller');
    expect(page.items[0].otherPartyName).toBe('Buyer Org');
    expect(component.columns[1].header).toBe('QUOTES._customer');
    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { role: 'seller' } }));
  });

  it('opens on the provider tab when the URL says so', async () => {
    queryRole = 'seller';
    await setup();

    expect(component.selectedRole).toBe('seller');
  });

  it('does not open the details of a cancelled quote', async () => {
    await setup();
    const page = await component.fetchQuotes({ limit: 10, offset: 0 }, {});

    component.viewDetails(page.items[0]);
    expect(component.showQuoteDetailsModal).toBeFalse();

    component.viewDetails(page.items[1]);
    expect(component.showQuoteDetailsModal).toBeTrue();
    expect(component.selectedQuoteId).toBe('urn:quote:old');
  });

  it('maps quote states to badge colors', () => {
    expect(quoteStateBadgeVariant('pending')).toBe('warning');
    expect(quoteStateBadgeVariant('inProgress')).toBe('info');
    expect(quoteStateBadgeVariant('accepted')).toBe('success');
    expect(quoteStateBadgeVariant('cancelled')).toBe('danger');
    expect(quoteStateBadgeVariant('whatever')).toBe('neutral');
  });
});
