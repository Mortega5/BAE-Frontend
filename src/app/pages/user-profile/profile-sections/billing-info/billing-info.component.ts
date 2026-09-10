import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BillingAccountFormComponent } from 'src/app/shared/billing-account-form/billing-account-form.component';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { faEdit } from '@fortawesome/pro-solid-svg-icons';
import { initFlowbite } from 'flowbite';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { countries } from 'src/app/models/country.const';
import { billingAccountCart } from 'src/app/models/interfaces';
import { components } from "src/app/models/product-catalog";
import { TableColumn } from 'src/app/models/table-column.model';
import { AccountServiceService } from 'src/app/services/account-service.service';
import { EventMessageService } from "src/app/services/event-message.service";
import { LocalStorageService } from "src/app/services/local-storage.service";
import { NotificationService } from 'src/app/services/notification.service';
import { ProductOrderService } from 'src/app/services/product-order-service.service';
import { ApiServiceService } from 'src/app/services/product-service.service';
import { environment } from 'src/environments/environment';
type ProductOffering = components["schemas"]["ProductOffering"];

@Component({
  selector: 'billing-info',
  templateUrl: './billing-info.component.html',
  styleUrl: './billing-info.component.css'
})
export class BillingInfoComponent implements OnInit, OnDestroy {

  loading: boolean = false;
  orders: any[] = [];
  profile: any;
  partyId: any = '';
  partyInfo: any = {
    id: '',
    name: '',
    href: ''
  }
  billing_accounts: billingAccountCart[] = [];
  selectedBilling: any;
  billToDelete: any;
  billToUpdate: any;
  showBillingModal: boolean = false;
  showDiscardConfirm: boolean = false;
  @ViewChild('billingAccountForm') billingAccountFormRef?: BillingAccountFormComponent;
  deleteBill: boolean = false;
  showOrderDetails: boolean = false;
  orderToShow: any;
  dateRange = new FormControl();
  selectedDate: any;
  countries: any[] = countries;
  preferred: boolean = false;
  isReadOnly: boolean = false;
  billingColumns: TableColumn[] = this.buildBillingColumns();

  private destroy$ = new Subject<void>();

  constructor(
    private localStorage: LocalStorageService,
    private api: ApiServiceService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private accountService: AccountServiceService,
    private orderService: ProductOrderService,
    private eventMessage: EventMessageService,
    private notificationService: NotificationService
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'BillAccChanged') {
          this.getBilling();
          this.cancelBillingModal();
        }
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showDiscardConfirm) {
      this.showDiscardConfirm = false;
      return;
    }
    if (this.showBillingModal) this.requestCloseBillingModal();
  }

  @HostListener('document:click')
  onClick() {
    if (this.deleteBill == true) {
      this.deleteBill = false;
      this.cdr.detectChanges();
    }
    if (this.showOrderDetails == true) {
      this.showOrderDetails = false;
      this.cdr.detectChanges();
    }
  }

  ngOnInit() {
    this.loading = true;
    let today = new Date();
    today.setMonth(today.getMonth() - 1);
    this.selectedDate = today.toISOString();
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if (aux.logged_as !== aux.id) {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId;
        console.log('loggedOrg info')
        console.log(loggedOrg)
        this.partyInfo = {
          id: this.partyId,
          name: loggedOrg.name,
          href: this.partyId,
          role: environment.SELLER_ROLE
        }

        // Check if user has orgAdmin role for edit permission
        if (loggedOrg && loggedOrg.roles) {
          const orgRoles = loggedOrg.roles.map((role: any) => role.name);
          const hasOrgAdminRole = orgRoles.some((role: any) => role === environment.ORG_ADMIN_ROLE);
          this.isReadOnly = !hasOrgAdminRole;
        }
      } else {
        this.partyId = aux.partyId;
        console.log('init party info')
        console.log(aux)
        this.partyInfo = {
          id: this.partyId,
          name: aux.user,
          href: this.partyId,
          role: environment.SELLER_ROLE
        }
        this.isReadOnly = false;
      }
      this.billingColumns = this.buildBillingColumns();
      this.getBilling();
    }
    initFlowbite();
  }

  getBilling() {
    let isBillSelected = false;
    this.accountService.getBillingAccount().then(data => {
      this.billing_accounts = [];
      for (let i = 0; i < data.length; i++) {
        isBillSelected = false;
        let email = ''
        let phone = ''
        let phoneType = ''
        let address = {
          "city": '',
          "country": '',
          "postCode": '',
          "stateOrProvince": '',
          "street": ''
        }
        for (let j = 0; j < data[i].contact[0].contactMedium.length; j++) {
          if (data[i].contact[0].contactMedium[j].mediumType == 'Email') {
            email = data[i].contact[0].contactMedium[j].characteristic.emailAddress
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'PostalAddress') {
            address = {
              "city": data[i].contact[0].contactMedium[j].characteristic.city,
              "country": data[i].contact[0].contactMedium[j].characteristic.country,
              "postCode": data[i].contact[0].contactMedium[j].characteristic.postCode,
              "stateOrProvince": data[i].contact[0].contactMedium[j].characteristic.stateOrProvince,
              "street": data[i].contact[0].contactMedium[j].characteristic.street1
            }
          } else if (data[i].contact[0].contactMedium[j].mediumType == 'TelephoneNumber') {
            phone = data[i].contact[0].contactMedium[j].characteristic.phoneNumber
            phoneType = data[i].contact[0].contactMedium[j].characteristic.contactType
          }
          if (data[i].contact[0].contactMedium[j].preferred == true) {
            isBillSelected = true;
          }
        }
        console.log(data[i])
        this.billing_accounts.push({
          "id": data[i].id,
          "href": data[i].href,
          "name": data[i].name,
          "email": email,
          "postalAddress": address,
          "telephoneNumber": phone,
          "telephoneType": phoneType,
          "selected": isBillSelected
        })
        if (isBillSelected) {
          this.selectedBilling = {
            "id": data[i].id,
            "href": data[i].href,
            "name": data[i].name,
            "email": email,
            "postalAddress": address,
            "telephoneNumber": phone,
            "selected": true
          }
        }
      }
      this.loading = false;
      if (this.billing_accounts.length > 0) {
        this.preferred = false;
      } else {
        this.preferred = true;
      }
      console.log(this.billing_accounts)
      this.cdr.detectChanges();
    })

    this.cdr.detectChanges();
    initFlowbite();
  }

  selectBill(baddr: billingAccountCart) {
    const index = this.billing_accounts.findIndex(item => item.id === baddr.id);
    for (let i = 0; i < this.billing_accounts.length; i++) {
      if (i == index) {
        this.billing_accounts[i].selected = true;
        this.selectedBilling = this.billing_accounts[i];
      } else {
        this.billing_accounts[i].selected = false;
      }
      if (this.billing_accounts[i].selected == false) {
        this.updateBilling(this.billing_accounts[i])
      }
    }
    for (let i = 0; i < this.billing_accounts.length; i++) {
      if (this.billing_accounts[i].selected == true) {
        this.updateBilling(this.billing_accounts[i])
      }
    }
    this.cdr.detectChanges();
  }

  updateBilling(bill: billingAccountCart) {
    let bill_body = {
      name: bill.name,
      contact: [{
        contactMedium: [
          {
            mediumType: 'Email',
            preferred: bill.selected,
            characteristic: {
              contactType: 'Email',
              emailAddress: bill.email
            }
          },
          {
            mediumType: 'PostalAddress',
            preferred: bill.selected,
            characteristic: {
              contactType: 'PostalAddress',
              city: bill.postalAddress.city,
              country: bill.postalAddress.country,
              postCode: bill.postalAddress.postCode,
              stateOrProvince: bill.postalAddress.stateOrProvince,
              street1: bill.postalAddress.street
            }
          },
          {
            mediumType: 'TelephoneNumber',
            preferred: bill.selected,
            characteristic: {
              contactType: bill.telephoneType,
              phoneNumber: bill.telephoneNumber
            }
          }
        ]
      }],
      relatedParty: [this.partyInfo],
      state: "Defined"
    }
    // Note: selectBill() above calls this once per billing account (to unset the old
    // preferred one and set the new one), so a success toast per call would spam the
    // user for what is a single logical action from their perspective — only the
    // failure case is surfaced here.
    this.accountService.updateBillingAccount(bill.id, bill_body).subscribe({
      next: data => {
        this.eventMessage.emitBillAccChange(false);
      },
      error: error => {
        console.error('There was an error while updating!', error);
        this.notificationService.showError('BILLING._preferred_error', { details: error?.error?.error || error?.error?.message || error?.message });
      }
    });
  }

  onDeletedBill(baddr: billingAccountCart) {
    console.log('--- DELETE BILLING ADDRESS ---')
    //this.accountService.deleteBillingAccount(baddr.id).subscribe(() => this.getBilling());
    this.deleteBill = false;
    this.cdr.detectChanges();
  }

  toggleEditBill(bill: billingAccountCart) {
    this.billToUpdate = bill;
    this.showBillingModal = true;
    this.cdr.detectChanges();
  }

  openAddBilling(): void {
    this.billToUpdate = undefined;
    this.showBillingModal = true;
  }

  cancelBillingModal(): void {
    this.billToUpdate = undefined;
    this.showBillingModal = false;
  }

  /** Closes the modal directly when nothing was touched, otherwise asks for confirmation first. */
  requestCloseBillingModal(): void {
    if (this.billingAccountFormRef?.billingForm.dirty) {
      this.showDiscardConfirm = true;
      return;
    }
    this.cancelBillingModal();
  }

  confirmDiscardBillingModal(): void {
    this.showDiscardConfirm = false;
    this.cancelBillingModal();
  }

  cancelDiscardBillingModal(): void {
    this.showDiscardConfirm = false;
  }

  toggleDeleteBill(bill: billingAccountCart) {
    this.deleteBill = true;
    this.billToDelete = bill;
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false
    }
  }

  private buildBillingColumns(): TableColumn[] {
    return [
      {
        header: 'BILLING._title', getValue: bill => bill.name,
        cellClass: bill => `${this.hasLongWord(bill.name, 20) ? 'break-all' : 'break-words'}`,
      },
      { header: 'BILLING._email', getValue: bill => bill.email, cellClass: bill => `break-all` },
      {
        header: 'BILLING._postalAddress', getValue: bill => this.formatBillingAddress(bill),
        cellClass: bill => `break-all`,
      },
      { header: 'BILLING._phone', getValue: bill => `(${bill.telephoneType}) ${bill.telephoneNumber}` },
      ...(!this.isReadOnly ? [{
        type: 'actions', header: 'BILLING._action',
        width: 'w-28',
        actions: [{ icon: faEdit, onClick: (bill: billingAccountCart) => this.toggleEditBill(bill), dataCy: 'billingEdit' }],
      } as TableColumn] : []),
    ];
  }

  private formatBillingAddress(bill: billingAccountCart): string {
    const a = bill.postalAddress;
    return `${a.street}, ${a.postCode} (${a.city}) ${a.stateOrProvince}, ${a.country}`;
  }

}
