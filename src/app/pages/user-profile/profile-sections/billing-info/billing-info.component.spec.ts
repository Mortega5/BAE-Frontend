import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { BillingAccountFormComponent } from 'src/app/shared/billing-account-form/billing-account-form.component';

import { BillingInfoComponent } from './billing-info.component';

describe('BillingInfoComponent', () => {
  let component: BillingInfoComponent;
  let fixture: ComponentFixture<BillingInfoComponent>;

  const sampleBill = {
    id: 'bill-1', name: 'Acme', email: 'acme@example.com', selected: false,
    postalAddress: { street: 'Main St 1', postCode: '12345', city: 'Springfield', stateOrProvince: 'IL', country: 'US' },
    telephoneNumber: '555-1234', telephoneType: 'Mobile',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot(), TableInputComponent],
      declarations: [BillingInfoComponent, BillingAccountFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BillingInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty-state alert (not the table) when there are no billing accounts', () => {
    component.loading = false;
    component.billing_accounts = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-input')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('BILLING._no_billing');
  });

  it('should show the table once there is at least one billing account', () => {
    component.loading = false;
    component.billing_accounts = [sampleBill as any];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-table-input')).toBeTruthy();
  });

  it('billingColumns should format the postal address and phone columns', () => {
    const columns = component.billingColumns;
    const addressColumn = columns.find(c => c.header === 'BILLING._postalAddress');
    const phoneColumn = columns.find(c => c.header === 'BILLING._phone');

    expect(addressColumn?.getValue?.(sampleBill)).toBe('Main St 1, 12345 (Springfield) IL, US');
    expect(phoneColumn?.getValue?.(sampleBill)).toBe('(Mobile) 555-1234');
  });

  it('billingColumns should include an actions column only when not read-only', () => {
    component.isReadOnly = false;
    expect((component as any).buildBillingColumns().some((c: any) => c.type === 'actions')).toBeTrue();

    component.isReadOnly = true;
    expect((component as any).buildBillingColumns().some((c: any) => c.type === 'actions')).toBeFalse();
  });

  it('selectBill should be wired as the table rowClick handler', () => {
    spyOn(component, 'selectBill');
    component.loading = false;
    component.billing_accounts = [sampleBill as any];
    fixture.detectChanges();

    const tableInput = fixture.debugElement.query(By.css('app-table-input'));
    tableInput.triggerEventHandler('rowClick', sampleBill);

    expect(component.selectBill).toHaveBeenCalledWith(sampleBill as any);
  });

  it('openAddBilling should open the modal in add mode', () => {
    component.billToUpdate = sampleBill as any;
    component.showBillingModal = false;

    component.openAddBilling();

    expect(component.billToUpdate).toBeUndefined();
    expect(component.showBillingModal).toBeTrue();
  });

  it('toggleEditBill should open the modal in edit mode with the given bill', () => {
    component.toggleEditBill(sampleBill as any);

    expect(component.billToUpdate).toEqual(sampleBill as any);
    expect(component.showBillingModal).toBeTrue();
  });

  it('cancelBillingModal should close the modal and clear the selected bill', () => {
    component.billToUpdate = sampleBill as any;
    component.showBillingModal = true;

    component.cancelBillingModal();

    expect(component.billToUpdate).toBeUndefined();
    expect(component.showBillingModal).toBeFalse();
  });

  it('Escape key should close the modal when it is open', () => {
    component.showBillingModal = true;

    component.onEscape();

    expect(component.showBillingModal).toBeFalse();
  });

  it('Escape key should do nothing when the modal is already closed', () => {
    component.showBillingModal = false;
    component.billToUpdate = sampleBill as any;

    component.onEscape();

    expect(component.billToUpdate).toEqual(sampleBill as any);
  });

  it('should render the billing modal only when showBillingModal is true', () => {
    component.showBillingModal = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-billing-account-form')).toBeNull();

    component.showBillingModal = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-billing-account-form')).toBeTruthy();
  });

  it('requestCloseBillingModal should close directly when the form is untouched', () => {
    component.showBillingModal = true;
    fixture.detectChanges();

    component.requestCloseBillingModal();

    expect(component.showBillingModal).toBeFalse();
    expect(component.showDiscardConfirm).toBeFalse();
  });

  it('requestCloseBillingModal should ask for confirmation when the form has unsaved changes', () => {
    component.showBillingModal = true;
    fixture.detectChanges();
    component.billingAccountFormRef!.billingForm.markAsDirty();

    component.requestCloseBillingModal();

    expect(component.showBillingModal).toBeTrue();
    expect(component.showDiscardConfirm).toBeTrue();
  });

  it('confirmDiscardBillingModal should close the modal and hide the confirmation', () => {
    component.showBillingModal = true;
    component.showDiscardConfirm = true;

    component.confirmDiscardBillingModal();

    expect(component.showBillingModal).toBeFalse();
    expect(component.showDiscardConfirm).toBeFalse();
  });

  it('cancelDiscardBillingModal should only hide the confirmation, keeping the modal open', () => {
    component.showBillingModal = true;
    component.showDiscardConfirm = true;

    component.cancelDiscardBillingModal();

    expect(component.showBillingModal).toBeTrue();
    expect(component.showDiscardConfirm).toBeFalse();
  });
});
