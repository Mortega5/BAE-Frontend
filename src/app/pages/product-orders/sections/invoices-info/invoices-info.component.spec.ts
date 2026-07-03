import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Subject, of, throwError } from 'rxjs';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import { InvoicesService } from 'src/app/services/invoices-service';
import { EventMessageService } from 'src/app/services/event-message.service';
import { environment } from 'src/environments/environment';

import { InvoicesInfoComponent } from './invoices-info.component';

describe('InvoiceInfoComponent', () => {
  let component: InvoicesInfoComponent;
  let fixture: ComponentFixture<InvoicesInfoComponent>;
  let messages$: Subject<any>;
  let localStorageSpy: jasmine.SpyObj<LocalStorageService>;
  let invoicesServiceSpy: jasmine.SpyObj<InvoicesService>;
  let eventMessageSpy: jasmine.SpyObj<EventMessageService>;

  beforeEach(async () => {
    messages$ = new Subject<any>();
    localStorageSpy = jasmine.createSpyObj<LocalStorageService>('LocalStorageService', ['getObject']);
    invoicesServiceSpy = jasmine.createSpyObj<InvoicesService>('InvoicesService', ['getInvoicesPaged', 'getAppliedCustomerBillingRates', 'updateInvoice']);
    eventMessageSpy = jasmine.createSpyObj<EventMessageService>(
      'EventMessageService',
      [],
      { messages$: messages$.asObservable() }
    );

    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'user-1',
      partyId: 'party-user',
      expire: Math.floor(Date.now() / 1000) + 300,
      roles: [{ name: environment.SELLER_ROLE }],
      organizations: [],
    } as any);

    invoicesServiceSpy.getInvoicesPaged.and.resolveTo({ items: [], total: 0 });
    invoicesServiceSpy.getAppliedCustomerBillingRates.and.resolveTo([]);
    invoicesServiceSpy.updateInvoice.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [InvoicesInfoComponent, HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()],
      providers: [
        { provide: LocalStorageService, useValue: localStorageSpy },
        { provide: InvoicesService, useValue: invoicesServiceSpy },
        { provide: EventMessageService, useValue: eventMessageSpy },
      ]
    })
    .overrideComponent(InvoicesInfoComponent, {
      set: { template: '' },
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoicesInfoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('constructor subscription should react to ChangedSession and ngOnDestroy should unsubscribe', () => {
    const initSpy = spyOn(component, 'initPartyInfo');

    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);

    component.ngOnDestroy();
    messages$.next({ type: 'ChangedSession' });
    expect(initSpy).toHaveBeenCalledTimes(1);
  });

  it('initPartyInfo should set partyId and seller role for direct user login', () => {
    component.initPartyInfo();

    expect(component.partyId).toBe('party-user');
    expect(component.isSeller).toBeTrue();
  });

  it('initPartyInfo should set partyId from logged organization', () => {
    localStorageSpy.getObject.and.returnValue({
      id: 'user-1',
      logged_as: 'org-1',
      partyId: 'party-user',
      expire: Math.floor(Date.now() / 1000) + 300,
      roles: [{ name: 'Buyer' }],
      organizations: [
        {
          id: 'org-1',
          partyId: 'party-org',
          roles: [{ name: environment.SELLER_ROLE }],
        },
      ],
    } as any);

    component.initPartyInfo();

    expect(component.partyId).toBe('party-org');
    expect(component.isSeller).toBeTrue();
  });

  it('fetchInvoices should delegate to invoicesService with partyId and role', async () => {
    component.partyId = 'party-1';
    component.role = 'Seller';

    await component.fetchInvoices({ limit: 10, offset: 0 });

    expect(invoicesServiceSpy.getInvoicesPaged).toHaveBeenCalledWith({ limit: 10, offset: 0 }, 'party-1', 'Seller');
  });

  it('toggleShowDetails should load applied rates and stop loading', async () => {
    const invoice = { id: 'inv-1', billNo: 'INV-001' };
    invoicesServiceSpy.getAppliedCustomerBillingRates.and.resolveTo([{ id: 'rate-1' }] as any);
    component.isEditingBillNo = true;

    await component.toggleShowDetails(invoice);

    expect(component.showInvoiceDetails).toBeTrue();
    expect(component.invoiceToShow).toEqual(invoice);
    expect(component.appliedCustomerBillingRates).toEqual([{ id: 'rate-1' }]);
    expect(component.loadingACBRs).toBeFalse();
    expect(component.isEditingBillNo).toBeFalse();
  });

  it('toggleShowDetails should handle errors and stop loading', async () => {
    invoicesServiceSpy.getAppliedCustomerBillingRates.and.rejectWith(new Error('failed'));

    await component.toggleShowDetails({ id: 'inv-1' });

    expect(component.loadingACBRs).toBeFalse();
    expect(component.appliedCustomerBillingRates).toEqual([]);
  });

  it('onRoleChange should update role and refresh the table', () => {
    const refreshSpy = jasmine.createSpy('refresh');
    (component as any).paginatedTable = { refresh: refreshSpy };

    component.onRoleChange('Seller');

    expect(component.role).toBe('Seller');
    expect(refreshSpy).toHaveBeenCalledWith(true);
  });

  it('editInvoice should enable editing mode for the invoice in view', () => {
    component.invoiceToShow = { billNo: 'INV-001' };

    component.editInvoice();

    expect(component.isEditingBillNo).toBeTrue();
    expect(component.editableInvoiceName).toBe('INV-001');
  });

  it('cancelEditBillNo should disable editing mode and revert the input', () => {
    component.invoiceToShow = { billNo: 'INV-001' };
    component.isEditingBillNo = true;
    component.editableInvoiceName = 'unsaved edit';

    component.cancelEditBillNo();

    expect(component.isEditingBillNo).toBeFalse();
    expect(component.editableInvoiceName).toBe('INV-001');
  });

  it('saveInvoice should persist new billNo and disable editing mode', () => {
    const invoice = { id: 'inv-1', billNo: 'OLD' };
    component.invoiceToShow = invoice;
    invoicesServiceSpy.updateInvoice.and.returnValue(of({}));

    component.editableInvoiceName = 'NEW';
    component.saveInvoice();

    expect(invoicesServiceSpy.updateInvoice).toHaveBeenCalledWith({ billNo: 'NEW' }, 'inv-1');
    expect(invoice.billNo).toBe('NEW');
    expect(component.isEditingBillNo).toBeFalse();
  });

  it('saveInvoice should revert billNo when update fails', () => {
    const invoice = { id: 'inv-1', billNo: 'OLD' };
    component.invoiceToShow = invoice;
    invoicesServiceSpy.updateInvoice.and.returnValue(throwError(() => new Error('error')));

    component.editableInvoiceName = 'NEW';
    component.saveInvoice();

    expect(invoice.billNo).toBe('OLD');
    expect(component.isEditingBillNo).toBeFalse();
  });

  it('downloadInvoice should open invoice URL in new tab', () => {
    const openSpy = spyOn(window, 'open');

    component.downloadInvoice({ id: 'inv-1' });

    expect(openSpy).toHaveBeenCalledWith(
      `${environment.BASE_URL}/invoicing/invoices/inv-1?format=xml-html`,
      '_blank'
    );
  });

  it('onClick should hide details modal and call detectChanges', () => {
    const cdrSpy = spyOn((component as any).cdr, 'detectChanges');
    component.showInvoiceDetails = true;

    component.onClick();

    expect(component.showInvoiceDetails).toBeFalse();
    expect(cdrSpy).toHaveBeenCalled();
  });
});
