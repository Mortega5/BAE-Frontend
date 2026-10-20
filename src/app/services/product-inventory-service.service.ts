import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import moment from 'moment';
import { PageRequest, PageResult } from '../models/pagination.model';

@Injectable({
  providedIn: 'root'
})
export class ProductInventoryServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_INVENTORY: String = environment.INVENTORY;
  public static INVENTORY_LIMIT: number = environment.INVENTORY_LIMIT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getInventory(page:any,id:any,filters:any[],keywords:any) {
    let url = `${ProductInventoryServiceService.BASE_URL}${ProductInventoryServiceService.API_INVENTORY}/product?limit=${ProductInventoryServiceService.INVENTORY_LIMIT}&offset=${page}&relatedParty.id=${id}`
    let status=''
    if(filters.length>0){
      for(let i=0; i < filters.length; i++){
        if(i==filters.length-1){
          status=status+filters[i]
        } else {
          status=status+filters[i]+','
        }    
      }
      url=url+'&status='+status;
    }
    if(keywords!=undefined){
      url=url+'&body='+keywords
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }

  /** Single-request, real limit/offset pagination — reads the total item count from
   * X-Total-Count instead of the old two-request "fetch this page + peek the next one"
   * workaround, which only existed because the proxy used to mishandle limit/offset. */
  async getInventoryPaged(params: PageRequest, id:any, filters:any[], keywords:any): Promise<PageResult<any>> {
    let url = `${ProductInventoryServiceService.BASE_URL}${ProductInventoryServiceService.API_INVENTORY}/product?limit=${params.limit}&offset=${params.offset}&relatedParty.id=${id}`
    if(filters.length>0){
      url = url + '&status=' + filters.join(',');
    }
    if(keywords!=undefined){
      url = url + '&body=' + keywords
    }
    const response = await lastValueFrom(this.http.get<any[]>(url, { observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  updateProduct(product:any,id:any){
    let url = `${ProductInventoryServiceService.BASE_URL}${ProductInventoryServiceService.API_INVENTORY}/product/${id}`;   
    return this.http.patch<any>(url, product);
  }

  getProduct(id:any, partyId?:any){
    let url = `${ProductInventoryServiceService.BASE_URL}${ProductInventoryServiceService.API_INVENTORY}/product/${id}`;
    if(partyId){
      url += `?relatedParty.id=${partyId}`;
    }
    return lastValueFrom(this.http.get<any>(url));
  }


  getResourceInventoryPaged(params: PageRequest, status: string[], partyId: any): Promise<PageResult<any>> {
    const url = `${ProductInventoryServiceService.BASE_URL}/resourceInventory/resource`;
    return this.getInventoryPage(url, params, partyId, status.length > 0 ? { resourceStatus: status.join(',') } : {});
  }

  getServiceInventoryPaged(params: PageRequest, status: string[], partyId: any): Promise<PageResult<any>> {
    const url = `${ProductInventoryServiceService.BASE_URL}/serviceInventory/service`;
    return this.getInventoryPage(url, params, partyId, status.length > 0 ? { state: status.join(',') } : {});
  }

  /** The service inventory API doesn't send X-Total-Count; without it, a full page is
   * assumed to have at least one more item after it so the table keeps "next" enabled. */
  private async getInventoryPage(url: string, params: PageRequest, partyId: any, filters: Record<string, string>): Promise<PageResult<any>> {
    const queryParams = { limit: params.limit, offset: params.offset, 'relatedParty.id': partyId, ...filters };
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const header = response.headers.get('X-Total-Count');
    const total = header != null
      ? Number(header)
      : params.offset + items.length + (items.length === params.limit ? 1 : 0);
    return { items, total };
  }

}
