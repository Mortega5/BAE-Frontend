import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faDownload, faEdit, faSave } from "@fortawesome/pro-solid-svg-icons";
import { TranslateModule } from '@ngx-translate/core';
import { initFlowbite } from 'flowbite';
import * as moment from 'moment';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { LoginInfo } from 'src/app/models/interfaces';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { EventMessageService } from "src/app/services/event-message.service";
import { InvoicesService } from 'src/app/services/invoices-service';
import { LocalStorageService } from "src/app/services/local-storage.service";
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-invoices-info',
  standalone: true,
  imports: [TranslateModule, FontAwesomeModule, CommonModule, FormsModule,
    PaginatedTableComponent, LoadingSpinnerComponent
  ],
  providers: [DatePipe],
  templateUrl: './invoices-info.component.html',
  styleUrl: './invoices-info.component.css'
})
export class InvoicesInfoComponent implements OnInit, OnDestroy {
  partyId: any = '';
  showInvoiceDetails: boolean = false;
  invoiceToShow: any;
  appliedCustomerBillingRates: any[] = [];
  loadingACBRs: boolean = false;

  sellerRole: string = environment.SELLER_ROLE;
  buyerRole: string = environment.BUYER_ROLE;

  isSeller: boolean = false;
  role: any = this.buyerRole;

  isEditingBillNo = false;
  editableInvoiceName: string = '';

  @ViewChild(PaginatedTableComponent) paginatedTable?: PaginatedTableComponent<any>;

  protected readonly faEdit = faEdit;
  protected readonly faSave = faSave;
  private destroy$ = new Subject<void>();

  defaultSort: TableSort = { key: 'billDate', direction: 'desc' };

  invoiceColumns: TableColumn[] = [
    { header: 'INVOICES._date', type: 'date', getValue: (item: any) => item.billDate, sortKey: 'billDate' },
    { header: 'INVOICES._billno', getValue: (item: any) => item.billNo ?? '-', sortKey: 'billNo' },
    { header: 'INVOICES._tax_included_amount', getValue: (item: any) => `${item.taxIncludedAmount?.value ?? ''}${item.taxIncludedAmount?.unit ?? ''}`, hideOnMobile: true },
    { header: 'INVOICES._status', getValue: (item: any) => item.state ?? '-', hideOnMobile: true, sortKey: 'state' },
    { header: 'INVOICES._actions', type: 'icon-button', icon: faDownload, tooltip: 'INVOICES._download', dataCy: 'downloadInvoice', onClick: (item: any) => this.downloadInvoice(item) },
  ];

  constructor(
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef,
    private invoicesService: InvoicesService,
    private eventMessage: EventMessageService,
  ) {
    this.eventMessage.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ev => {
        if (ev.type === 'ChangedSession') {
          this.initPartyInfo();
        }
      })
  }

  @HostListener('document:click')
  onClick() {
    if (this.showInvoiceDetails == true) {
      this.showInvoiceDetails = false;
      this.cdr.detectChanges();
    }
    initFlowbite();
  }

  ngOnInit() {
    this.initPartyInfo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initPartyInfo() {
    let aux = this.localStorage.getObject('login_items') as LoginInfo;
    if (JSON.stringify(aux) != '{}' && (((aux.expire - moment().unix()) - 4) > 0)) {
      if (aux.logged_as == aux.id) {
        this.partyId = aux.partyId;
        let userRoles = aux.roles.map((elem: any) => {
          return elem.name
        })
        if (userRoles.includes(this.sellerRole)) {
          this.isSeller = true;
        }
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as);
        this.partyId = loggedOrg.partyId;
        let orgRoles = loggedOrg.roles.map((elem: any) => {
          return elem.name
        })
        if (orgRoles.includes(this.sellerRole)) {
          this.isSeller = true;
        }
      }
      this.paginatedTable?.refresh(true);
    }
    initFlowbite();
  }

  ngAfterViewInit() {
    initFlowbite();
  }

  fetchInvoices = (params: PageRequest): Promise<PageResult<any>> => {
    return this.invoicesService.getInvoicesPaged(params, this.partyId, this.role);
  }

  async toggleShowDetails(invoice: any) {
    this.showInvoiceDetails = true;
    this.invoiceToShow = invoice;
    this.appliedCustomerBillingRates = [];
    this.loadingACBRs = true;
    this.isEditingBillNo = false;
    this.editableInvoiceName = invoice.billNo;

    try {
      this.appliedCustomerBillingRates = await this.invoicesService.getAppliedCustomerBillingRates(invoice.id);
    } catch (error) {
      console.error('Error fetching applied customer billing rates:', error);
    } finally {
      this.loadingACBRs = false;
    }
  }

  onRoleChange(role: any) {
    this.role = role;
    this.paginatedTable?.refresh(true);
  }

  editInvoice() {
    this.isEditingBillNo = true;
    this.editableInvoiceName = this.invoiceToShow.billNo;
  }

  cancelEditBillNo() {
    this.isEditingBillNo = false;
    this.editableInvoiceName = this.invoiceToShow.billNo;
  }

  saveInvoice() {
    const invoice = this.invoiceToShow;
    const oldName = invoice.billNo;
    invoice.billNo = this.editableInvoiceName;
    this.invoicesService.updateInvoice({
      billNo: this.editableInvoiceName
    }, invoice.id).subscribe({
      next: () => { },
      error: error => {
        invoice.billNo = oldName;
        console.error('There was an error while updating!', error);
      }
    });
    this.isEditingBillNo = false;
  }

  downloadInvoice(invoice: any) {
    let url = `${environment.BASE_URL}/invoicing/invoices/${invoice.id}?format=xml-html`
    window.open(url, '_blank');
  }
}
