import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { components } from "../models/product-catalog";
import { applySort, fetchAllPages, PageRequest, PageResult } from '../models/pagination.model';
import { LocalStorageService } from "./local-storage.service";
type ProductOffering = components["schemas"]["ProductOffering"];

@Injectable({
  providedIn: 'root'
})
export class UsageServiceService {

  public static BASE_URL: String = environment.BASE_URL;
  public static USAGE_SPEC_LIMIT: number = environment.USAGE_SPEC_LIMIT;

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  getUsageSpec(id: string, partyId?: string) {

    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification/${id}`;
    if (partyId) {
      url += `?relatedParty.id=${partyId}`
    }

    return lastValueFrom(this.http.get<any>(url));
  }

  async getUsageSpecByUserPaged(params: PageRequest, filter: Record<string, string> | undefined, status: string[], partyId: any): Promise<PageResult<any>> {
    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
    };
    applySort(params, codeParams);
    if (status.length > 0) {
      codeParams['lifecycleStatus'] = status.join(',');
    }

    const queryParams = { ...filter, ...codeParams };

    const url = `${UsageServiceService.BASE_URL}/usage/usageSpecification`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  /** Every usage spec of the provider in the given statuses (any status when empty). */
  getAllUsageSpecsOfParty(partyId: any, status: string[] = []): Promise<any[]> {
    return fetchAllPages(params => this.getUsageSpecByUserPaged(params, undefined, status, partyId));
  }


  postUsageSpec(usageSpec: any) {
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification`;

    return this.http.post<any>(url, usageSpec);
  }

  updateUsageSpec(usageSpec: any, id: any) {
    let url = `${UsageServiceService.BASE_URL}/usage/usageSpecification/${id}`;

    return this.http.patch<any>(url, usageSpec);
  }
}
