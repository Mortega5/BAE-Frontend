import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PageRequest, PageResult } from '../models/pagination.model';
import { LocalStorageService } from "./local-storage.service";

@Injectable({
  providedIn: 'root'
})
export class InvoicesService {

  public static BASE_URL: String = environment.BASE_URL;
  public static BASE_PATCH: String = environment.BILLING;
  public static API_ORDERING: String = environment.CUSTOMER_BILLING;

  public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  async getInvoicesPaged(params: PageRequest, partyId: any, role: any): Promise<PageResult<any>> {
    const queryParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
      'relatedParty.role': role,
      state: 'settled',
    };

    const url = `${InvoicesService.BASE_URL}${InvoicesService.BASE_PATCH}${InvoicesService.API_ORDERING}`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  updateInvoice(patchData: any, invoiceId: any) {
    console.log('updatingInvoice...');
    console.log(invoiceId);
    console.log(patchData);
    let url = `${InvoicesService.BASE_URL}${InvoicesService.BASE_PATCH}${InvoicesService.API_ORDERING}/${invoiceId}`;
    return this.http.patch(url, patchData)
  }

  getAppliedCustomerBillingRates(billId: string) {
    console.log('Reading applied customer billing rates for bill:', billId);
    let url = `${InvoicesService.BASE_URL}${InvoicesService.BASE_PATCH}/appliedCustomerBillingRate?bill.id=${billId}`;
    console.log(url);
    return lastValueFrom(this.http.get<any[]>(url));
  }
}
