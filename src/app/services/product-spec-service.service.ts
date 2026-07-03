import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { applySort, PageRequest, PageResult } from '../models/pagination.model';
import { LocalStorageService } from "./local-storage.service";

@Injectable({
  providedIn: 'root'
})
export class ProductSpecServiceService {

  public static BASE_URL: String = environment.BASE_URL;
  public static API_PRODUCT_CATALOG: String = environment.PRODUCT_CATALOG;
  public static API_PRODUCT_SPEC: String = environment.PRODUCT_SPEC;
  public static PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  getProdSpecByUser(page: any, status: any[], partyId: any, sort?: any, isBundle?: any) {
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}?limit=${ProductSpecServiceService.PROD_SPEC_LIMIT}&offset=${page}&relatedParty.id=${partyId}`;

    if (sort != undefined) {
      url = url + '&sort=' + sort
    }
    if (isBundle != undefined) {
      url = url + '&isBundle=' + isBundle
    }
    let lifeStatus = ''
    if (status)
      if (status.length > 0) {
        for (let i = 0; i < status.length; i++) {
          if (i == status.length - 1) {
            lifeStatus = lifeStatus + status[i]
          } else {
            lifeStatus = lifeStatus + status[i] + ','
          }
        }
        url = url + '&lifecycleStatus=' + lifeStatus;
      }

    return lastValueFrom(this.http.get<any>(url));
  }

  async getProdSpecByUserPaged(params: PageRequest, filter: Record<string, string> | undefined, status: any[], partyId: any, isBundle: any): Promise<PageResult<any>> {
    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
    };
    applySort(params, codeParams);
    if (isBundle != undefined) {
      codeParams['isBundle'] = isBundle;
    }
    if (status && status.length > 0) {
      codeParams['lifecycleStatus'] = status.join(',');
    }
    const queryParams = { ...filter, ...codeParams };

    const url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  getResSpecById(id: any) {
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  postProdSpec(body: any) {
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}`;
    return this.http.post<any>(url, body);
  }

  updateProdSpec(body: any, id: any) {
    let url = `${ProductSpecServiceService.BASE_URL}${ProductSpecServiceService.API_PRODUCT_CATALOG}${ProductSpecServiceService.API_PRODUCT_SPEC}/${id}`;
    return this.http.patch<any>(url, body);
  }

  requestComplianceCertificate(productSpecification: any) {
    let url = `${ProductSpecServiceService.BASE_URL}/compliance/certificate`;
    return this.http.post<any>(url, productSpecification);
  }
}
