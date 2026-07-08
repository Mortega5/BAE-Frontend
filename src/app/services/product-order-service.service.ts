import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { applySort, PageRequest, PageResult } from '../models/pagination.model';
import { components } from "../models/product-catalog";
import { LocalStorageService } from "./local-storage.service";
type ProductOffering = components["schemas"]["ProductOffering"];

@Injectable({
  providedIn: 'root'
})
export class ProductOrderService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_ORDERING: String = environment.PRODUCT_ORDER;
  public static ORDER_LIMIT: Number = environment.ORDER_LIMIT;

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  postProductOrder(prod: any) {
    //POST - El item va en el body de la petición
    let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder`;
    return this.http.post<any>(url, prod, { observe: 'response' });
  }

  getProductOrders(partyId: any, page: any, filters: any[], role: any, actionFilters: string[] = []) {
    console.log('getProductOrders');
    let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder?limit=${ProductOrderService.ORDER_LIMIT}&offset=${page}&relatedParty.id=${partyId}&relatedParty.role=${role}`;

    //let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder?limit=${ProductOrderService.ORDER_LIMIT}&offset=${page}&relatedParty.id=${partyId}&relatedParty.role=Seller`;
    let status = ''
    if (filters.length > 0) {
      for (let i = 0; i < filters.length; i++) {
        if (i == filters.length - 1) {
          status = status + filters[i]
        } else {
          status = status + filters[i] + ','
        }
      }
      url = url + '&state=' + status;
    }
    if (actionFilters.length > 0) {
      url = url + '&productOrderItem.action=' + actionFilters.join(',');
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }

  async getProductOrdersPaged(params: PageRequest, filter: Record<string, string> | undefined, status: string[], partyId: any, role: any, actionFilters: string[] = []): Promise<PageResult<any>> {
    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
      'relatedParty.role': role,
    };
    if (status && status.length > 0) {
      codeParams['state'] = status.join(',');
    }
    if (actionFilters && actionFilters.length > 0) {
      codeParams['productOrderItem.action'] = actionFilters.join(',');
    }
    applySort(params, codeParams);
    const queryParams = { ...filter, ...codeParams };

    const url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  updateOrder(orderId: any, patchData: any) {
    console.log('updatingOrder...');
    console.log(orderId);
    console.log(patchData);

    let url = `${ProductOrderService.BASE_URL}${ProductOrderService.API_ORDERING}/productOrder/${orderId}`;
    return lastValueFrom(this.http.patch(url, patchData))
  }

}
