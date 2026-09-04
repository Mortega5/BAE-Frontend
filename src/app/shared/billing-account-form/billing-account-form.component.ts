import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Validators } from '@angular/forms';
import moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { LoginInfo, billingAccountCart } from 'src/app/models/interfaces';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { environment } from 'src/environments/environment';
import { euCountries } from '../../models/country.const';
import { EventMessageService } from "../../services/event-message.service";
import { LocalStorageService } from "../../services/local-storage.service";

@Component({
  selector: 'app-billing-account-form',
  templateUrl: './billing-account-form.component.html',
  styleUrl: './billing-account-form.component.css'
})
export class BillingAccountFormComponent implements OnInit, OnDestroy {

  @Input() billAcc: billingAccountCart | undefined;
  @Input() preferred: boolean | undefined;
  /** Hide the built-in submit button when the caller drives create/update from its own
   * modal footer (e.g. billing-info's app-card footer) via a template reference instead. */
  @Input() showActions: boolean = true;

  readonly billingFields: FormField[] = [
    {
      type: 'string', name: 'name', label: 'BILLING._title', required: true, colSpan: 2, dataCy: 'billingTitle',
      validators: [Validators.maxLength(250)], errorMessages: { maxlength: 'BILLING._too_long' },
    },
    {
      type: 'string', name: 'city', label: 'BILLING._city', required: true, dataCy: 'billingCity', colSpan: 1,
      validators: [Validators.maxLength(250)], errorMessages: { maxlength: 'BILLING._too_long' },
    },
    {
      type: 'string', name: 'stateOrProvince', label: 'BILLING._state', required: true, dataCy: 'billingState', colSpan: 1,
      validators: [Validators.maxLength(250)], errorMessages: { maxlength: 'BILLING._too_long' },
    },
    {
      type: 'select', name: 'country', label: 'BILLING._country', required: true, defaultValue: 'AT', dataCy: 'billingCountry', colSpan: 1,
      options: euCountries.map(country => ({ value: country.code, label: country.name })),
    },
    {
      type: 'string', name: 'postCode', label: 'BILLING._post_code', required: true, dataCy: 'billingZip', colSpan: 1,
      validators: [Validators.maxLength(250)], errorMessages: { maxlength: 'BILLING._too_long' },
    },
    {
      type: 'textarea', name: 'street', label: 'BILLING._street', required: true, colSpan: 2, rows: 4, dataCy: 'billingAddress',
      validators: [Validators.maxLength(1000)], errorMessages: { maxlength: 'BILLING._too_long_larger' },
    },
    {
      type: 'string', name: 'email', label: 'BILLING._email', required: true, colSpan: 2, dataCy: 'billingEmail',
      validators: [Validators.email, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$'), Validators.maxLength(320)],
      errorMessages: { email: 'BILLING._email_format', pattern: 'BILLING._email_format', maxlength: 'BILLING._too_long_email' },
    },
    {
      type: 'select', name: 'telephoneType', label: 'BILLING._phone_type', defaultValue: 'Mobile',
      options: [
        { value: 'Mobile', label: 'Mobile' }, { value: 'Landline', label: 'Landline' }, { value: 'Office', label: 'Office' },
        { value: 'Home', label: 'Home' }, { value: 'Other', label: 'Other' },
      ],
      colSpan: 1
    },
    {
      type: 'phoneNumber', name: 'telephoneNumber', label: 'BILLING._phone', required: true, dataCy: 'billingPhone', colSpan: 1,
      errorMessages: { invalidPhoneNumber: 'BILLING._invalid_phone' },
    },
  ];
  billingForm = buildFormGroup(this.billingFields);

  partyId: any;
  partyInfo: any = {
    id: '',
    name: '',
    href: ''
  }
  loading: boolean = false;
  is_create: boolean = false;

  errorMessage: any = '';
  showError: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private accountService: AccountServiceService,
    private eventMessage: EventMessageService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initUserData();
        }
      })
  }

  ngOnInit() {
    this.is_create = this.billAcc == undefined;
    this.initUserData();
    if (!this.is_create) {
      this.setDefaultValues();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initUserData() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
        this.partyInfo = {
          id: this.partyId,
          name: aux.user,
          href: this.partyId,
          role: environment.SELLER_ROLE
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        this.partyInfo = {
          id: this.partyId,
          name: loggedOrg.name,
          href: this.partyId,
          role: environment.SELLER_ROLE
        }
      }
    }
  }

  setDefaultValues() {
    if (this.billAcc != undefined) {
      this.billingForm.controls['name'].setValue(this.billAcc.name);
      this.billingForm.controls['email'].setValue(this.billAcc.email);
      this.billingForm.controls['country'].setValue(this.billAcc.postalAddress.country);
      this.billingForm.controls['city'].setValue(this.billAcc.postalAddress.city);
      this.billingForm.controls['stateOrProvince'].setValue(this.billAcc.postalAddress.stateOrProvince);
      this.billingForm.controls['street'].setValue(this.billAcc.postalAddress.street);
      this.billingForm.controls['postCode'].setValue(this.billAcc.postalAddress.postCode);
      this.billingForm.controls['telephoneType'].setValue(this.billAcc.telephoneType);
      // The prefix/national-number split is handled internally by app-phone-number-input's writeValue.
      this.billingForm.controls['telephoneNumber'].setValue(this.billAcc.telephoneNumber);
    }
    this.cdr.detectChanges()
  }

  resetBillingForm(): void {
    this.billingForm.reset({
      telephoneType: 'Mobile'
    });

    Object.values(this.billingForm.controls).forEach(control => {
      control.setErrors(null); // clear errors
      control.markAsPristine();
      control.markAsUntouched();
      control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
    });
  }

  createBilling() {
    if (this.billingForm.invalid) return;
    this.loading = true;
    let billacc = {
      name: this.billingForm.value.name,
      contact: [{
        contactMedium: [
          {
            mediumType: 'Email',
            preferred: this.preferred,
            characteristic: {
              contactType: 'Email',
              emailAddress: this.billingForm.value.email
            }
          },
          {
            mediumType: 'PostalAddress',
            preferred: this.preferred,
            characteristic: {
              contactType: 'PostalAddress',
              city: this.billingForm.value.city,
              country: this.billingForm.value.country,
              postCode: this.billingForm.value.postCode,
              stateOrProvince: this.billingForm.value.stateOrProvince,
              street1: this.billingForm.value.street
            }
          },
          {
            mediumType: 'TelephoneNumber',
            preferred: this.preferred,
            characteristic: {
              contactType: this.billingForm.value.telephoneType,
              phoneNumber: this.billingForm.value.telephoneNumber
            }
          }
        ]
      }],
      relatedParty: [this.partyInfo],
      state: "Defined"
    }
    this.accountService.postBillingAccount(billacc).subscribe({
      next: data => {
        this.eventMessage.emitBillAccChange(true);
        this.resetBillingForm();
        this.loading = false;
      },
      error: error => {
        this.loading = false;
        console.error('There was an error while creating!', error);
        if (error.error.error) {
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while creating billing account!';
        }
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    });
  }

  updateBilling() {
    if (this.billingForm.invalid || this.billAcc == undefined) return;
    let bill_body = {
      name: this.billingForm.value.name,
      contact: [{
        contactMedium: [
          {
            mediumType: 'Email',
            preferred: this.billAcc.selected,
            characteristic: {
              contactType: 'Email',
              emailAddress: this.billingForm.value.email
            }
          },
          {
            mediumType: 'PostalAddress',
            preferred: this.billAcc.selected,
            characteristic: {
              contactType: 'PostalAddress',
              city: this.billingForm.value.city,
              country: this.billingForm.value.country,
              postCode: this.billingForm.value.postCode,
              stateOrProvince: this.billingForm.value.stateOrProvince,
              street1: this.billingForm.value.street
            }
          },
          {
            mediumType: 'TelephoneNumber',
            preferred: this.billAcc.selected,
            characteristic: {
              contactType: this.billingForm.value.telephoneType,
              phoneNumber: this.billingForm.value.telephoneNumber
            }
          }
        ]
      }],
      relatedParty: [this.partyInfo],
      state: "Defined"
    }
    this.accountService.updateBillingAccount(this.billAcc.id, bill_body).subscribe({
      next: data => {
        this.eventMessage.emitBillAccChange(false);
        this.resetBillingForm();
      },
      error: error => {
        console.error('There was an error while updating!', error);
        if (error.error.error) {
          this.errorMessage = 'Error: ' + error.error.error;
        } else {
          this.errorMessage = 'There was an error while updating billing account!';
        }
        this.showError = true;
        setTimeout(() => {
          this.showError = false;
        }, 3000);
      }
    });
  }
}
