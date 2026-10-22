import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import { QUOTE_CATEGORIES } from 'src/app/models/quote.constants';
import { Quote } from 'src/app/models/quote.model';
import { API_ROLES } from 'src/app/models/roles.constants';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { NotificationService } from 'src/app/services/notification.service';
import { QuoteService } from '../../../quotes/services/quote.service';
import { TenderDetailComponent } from './tender-detail.component';

const ME = 'urn:ngsi-ld:organization:me';
const PROVIDER = 'urn:ngsi-ld:organization:provider';

describe('TenderDetailComponent', () => {
  let fixture: ComponentFixture<TenderDetailComponent>;
  let component: TenderDetailComponent;
  let quoteService: jasmine.SpyObj<QuoteService>;
  let tenderState: string;

  async function setup() {
    await TestBed.configureTestingModule({
      imports: [TenderDetailComponent, TranslateModule.forRoot()],
      providers: [
        // The embedded modals inject their own HTTP services
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: QuoteService, useValue: quoteService },
        { provide: LocalStorageService, useValue: { getObject: () => ({ id: 'me', logged_as: 'me', partyId: ME, organizations: [] }) } },
        { provide: AccountServiceService, useValue: { getOrgInfo: () => Promise.resolve({ tradingName: 'Provider Org' }) } },
        { provide: NotificationService, useValue: jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']) },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigateByUrl']) },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'urn:quote:tender' }) } } },
      ],
    })
      .overrideComponent(TenderDetailComponent, { set: { schemas: [NO_ERRORS_SCHEMA] } })
      .compileComponents();

    fixture = TestBed.createComponent(TenderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    tenderState = 'approved';
    quoteService = jasmine.createSpyObj<QuoteService>('QuoteService', ['getQuoteById', 'getTenderingQuotesByExternalId']);
    quoteService.getQuoteById.and.callFake(() => of({
      id: 'urn:quote:tender', category: QUOTE_CATEGORIES.COORDINATOR, description: 'My tender',
      quoteItem: [{ state: tenderState }],
    } as Quote));
    quoteService.getTenderingQuotesByExternalId.and.returnValue(of([
      { id: 'urn:quote:offer', category: QUOTE_CATEGORIES.TENDER, relatedParty: [{ id: PROVIDER, role: 'Seller' }], quoteItem: [{ state: 'approved' }] } as Quote,
    ]));
  });

  it('loads the tender and lists its provider offers with the provider name', async () => {
    await setup();

    const page = await component.fetchOffers({ limit: 10, offset: 0 });

    expect(component.tender?.description).toBe('My tender');
    expect(quoteService.getTenderingQuotesByExternalId).toHaveBeenCalledWith(ME, 'urn:quote:tender', API_ROLES.BUYER);
    expect(page.items[0].providerName).toBe('Provider Org');
  });

  it('lists no offers while the tender is a draft', async () => {
    tenderState = 'pending';
    await setup();

    const page = await component.fetchOffers({ limit: 10, offset: 0 });

    expect(component.isDraft).toBeTrue();
    expect(page.total).toBe(0);
    expect(quoteService.getTenderingQuotesByExternalId).not.toHaveBeenCalled();
  });

  it('shows not found for an unknown id or a quote that is not a tender', async () => {
    quoteService.getQuoteById.and.returnValue(throwError(() => new Error('404')));
    await setup();

    expect(component.notFound).toBeTrue();
  });

  it('opens a provider offer in the details modal', async () => {
    await setup();
    const page = await component.fetchOffers({ limit: 10, offset: 0 });

    component.openOffer(page.items[0]);

    expect(component.showQuoteDetailsModal).toBeTrue();
    expect(component.selectedQuoteId).toBe('urn:quote:offer');
  });
});
