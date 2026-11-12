import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { BillingAccountFormComponent } from './billing-account-form.component';

describe('BillingAccountFormComponent', () => {
  let component: BillingAccountFormComponent;
  let fixture: ComponentFixture<BillingAccountFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      schemas: [NO_ERRORS_SCHEMA],
      declarations: [BillingAccountFormComponent],
      imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BillingAccountFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('hints what goes in every text field the user fills in', () => {
    const typed = component.billingFields.filter(field => ['string', 'textarea', 'phoneNumber'].includes(field.type));

    expect(typed.length).toBeGreaterThan(0);
    for (const field of typed) {
      expect((field as any).placeholder).withContext(`placeholder of ${field.name}`).toMatch(/^BILLING\._[a-z_]+_placeholder$/);
    }
  });
});
