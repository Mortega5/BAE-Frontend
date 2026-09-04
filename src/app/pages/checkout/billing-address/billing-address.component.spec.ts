import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { BillingAccountFormComponent } from 'src/app/shared/billing-account-form/billing-account-form.component';

import { BillingAddressComponent } from './billing-address.component';

describe('BillingAddressComponent', () => {
  let component: BillingAddressComponent;
  let fixture: ComponentFixture<BillingAddressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [BillingAddressComponent, BillingAccountFormComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BillingAddressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('Escape key should close the edit modal when it is open', () => {
    component.editBill = true;

    component.onEscape();

    expect(component.editBill).toBeFalse();
  });

  it('should render the edit modal with the billing form only when editBill is true', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-billing-account-form')).toBeNull();

    component.editBill = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-billing-account-form')).toBeTruthy();
  });
});
