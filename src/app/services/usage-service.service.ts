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
    if (status.length === 0) {
      return this.getUsageSpecPage(params, filter, partyId);
    }
    // The usage API honours a lifecycleStatus filter on the items but its X-Total-Count still
    // counts every status, so a filtered page/total can't be trusted. A provider has few usage
    // specs: load them all and filter and page here instead.
    const matching = await this.getAllUsageSpecsOfParty(partyId, status, params, filter);
    return { items: matching.slice(params.offset, params.offset + params.limit), total: matching.length };
  }

  /** Every usage spec of the provider in the given statuses (any status when empty). */
  async getAllUsageSpecsOfParty(partyId: any, status: string[] = [], sort?: PageRequest, filter?: Record<string, string>): Promise<any[]> {
    const all = await fetchAllPages(params =>
      this.getUsageSpecPage({ ...params, orderBy: sort?.orderBy, orderDirection: sort?.orderDirection }, filter, partyId));
    return status.length > 0 ? all.filter(spec => status.includes(spec?.lifecycleStatus)) : all;
  }

  private async getUsageSpecPage(params: PageRequest, filter: Record<string, string> | undefined, partyId: any): Promise<PageResult<any>> {
    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
    };
    applySort(params, codeParams);

    const queryParams = { ...filter, ...codeParams };

    const url = `${UsageServiceService.BASE_URL}/usage/usageSpecification`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
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
