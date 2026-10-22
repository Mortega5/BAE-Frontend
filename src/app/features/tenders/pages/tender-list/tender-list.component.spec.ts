import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AuthGuard } from 'src/app/guard/auth.guard';
import { Quote } from 'src/app/models/quote.model';
import { Tender } from 'src/app/models/tender.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { ThemeService } from 'src/app/services/theme.service';
import { QuoteService } from '../../../quotes/services/quote.service';
import { TendersPaths } from '../../tenders.paths';
import { TenderListComponent } from './tender-list.component';

const ME = 'urn:ngsi-ld:organization:me';
const BUYER = 'urn:ngsi-ld:organization:buyer';

function tender(id: string, category: Tender['category'], state: Tender['state'], createdAt: string, extra: Partial<Tender> = {}): Tender {
  return { id, category, state, createdAt, responseDeadline: createdAt, selectedProviders: [], tenderNote: `Tender ${id}`, ...extra };
}

describe('TenderListComponent', () => {
  let fixture: ComponentFixture<TenderListComponent>;
  let component: TenderListComponent;
  let quoteService: jasmine.SpyObj<QuoteService>;
  let router: jasmine.SpyObj<Router>;
  let queryRole: string | null;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [TenderListComponent, TranslateModule.forRoot()],
      providers: [
        { provide: QuoteService, useValue: quoteService },
        { provide: LocalStorageService, useValue: { getObject: () => ({ id: 'me', logged_as: 'me', partyId: ME, organizations: [] }) } },
        { provide: AccountServiceService, useValue: { getOrgInfo: () => Promise.resolve({ tradingName: 'Buyer Org' }) } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']) },
        { provide: ThemeService, useValue: { getCurrentThemeConfig: () => null } },
        { provide: AuthGuard, useValue: { hasAnyRole: () => true } },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(queryRole ? { role: queryRole } : {}) } } },
      ],
    })
      .overrideComponent(TenderListComponent, { set: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(TenderListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(() => {
    quoteService = jasmine.createSpyObj<QuoteService>('QuoteService',
      ['getCoordinatorQuotesByUser', 'getTenderingQuotesByUser', 'getQuoteById']);
    quoteService.getCoordinatorQuotesByUser.and.returnValue(of([
      tender('urn:quote:old', 'coordinator', 'draft', '2026-01-01T00:00:00Z'),
      tender('urn:quote:new', 'coordinator', 'sent', '2026-02-01T00:00:00Z'),
    ]));
    quoteService.getTenderingQuotesByUser.and.returnValue(of([
      tender('urn:quote:invite-live', 'tendering', 'pending', '2026-01-01T00:00:00Z', { external_id: 'urn:quote:live', buyerPartyId: BUYER }),
      tender('urn:quote:invite-draft', 'tendering', 'pending', '2026-02-01T00:00:00Z', { external_id: 'urn:quote:draft', buyerPartyId: BUYER }),
    ]));
    quoteService.getQuoteById.and.callFake((id: string) =>
      of({ id, quoteItem: [{ state: id === 'urn:quote:draft' ? 'pending' : 'inProgress' }] } as Quote));
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
    queryRole = null;
  });

  it('lists the buyer tenders newest first, filtered by status on the client', async () => {
    await setup();

    const all = await component.fetchTenders({ limit: 10, offset: 0 }, {});
    const launched = await component.fetchTenders({ limit: 10, offset: 0 }, { status: ['approved'] });

    expect(quoteService.getCoordinatorQuotesByUser).toHaveBeenCalledTimes(1);
    expect(all.items.map(row => row.id)).toEqual(['urn:quote:new', 'urn:quote:old']);
    expect(launched.items.map(row => row.id)).toEqual(['urn:quote:new']);
  });

  it('opens the tender page when a buyer clicks a row', async () => {
    await setup();
    const page = await component.fetchTenders({ limit: 10, offset: 0 }, {});

    component.openTender(page.items[0]);

    expect(router.navigateByUrl).toHaveBeenCalledWith(TendersPaths.detail('urn:quote:new'));
  });

  it('hides provider invitations whose tender is still a draft and names the buyer', async () => {
    queryRole = 'seller';
    await setup();

    const page = await component.fetchTenders({ limit: 10, offset: 0 }, {});

    expect(component.selectedRole).toBe('seller');
    expect(page.items.map(row => row.id)).toEqual(['urn:quote:invite-live']);
    expect(page.items[0].buyerName).toBe('Buyer Org');
  });

  it('opens the invitation details for a provider instead of navigating', async () => {
    queryRole = 'seller';
    await setup();
    const page = await component.fetchTenders({ limit: 10, offset: 0 }, {});

    component.openTender(page.items[0]);

    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.showQuoteDetailsModal).toBeTrue();
    expect(component.selectedQuoteId).toBe('urn:quote:invite-live');
  });

  it('keeps the selected tab in the URL', async () => {
    await setup();

    component.onRoleChange('seller');

    expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { role: 'seller' } }));
    expect(component.columns[1].header).toBe('TENDERS._buyer');
  });
});
