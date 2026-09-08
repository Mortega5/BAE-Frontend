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
  public static INVENTORY_RES_LIMIT: number = environment.INVENTORY_RES_LIMIT;
  public static INVENTORY_SERV_LIMIT: number = environment.INVENTORY_SERV_LIMIT;

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


  getResourceInventory(page:any,filters:any[],id:any){
    let url = `${ProductInventoryServiceService.BASE_URL}/resourceInventory/resource?limit=${ProductInventoryServiceService.INVENTORY_RES_LIMIT}&offset=${page}&relatedParty.id=${id}`
    let status=''
    if(filters.length>0){
      for(let i=0; i < filters.length; i++){
        if(i==filters.length-1){
          status=status+filters[i]
        } else {
          status=status+filters[i]+','
        }    
      }
      url=url+'&resourceStatus='+status;
      console.log(url)
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }

  getServiceInventory(page:any,filters:any[],id:any){
    let url = `${ProductInventoryServiceService.BASE_URL}/serviceInventory/service?limit=${ProductInventoryServiceService.INVENTORY_SERV_LIMIT}&offset=${page}&relatedParty.id=${id}`
    let status=''
    if(filters.length>0){
      for(let i=0; i < filters.length; i++){
        if(i==filters.length-1){
          status=status+filters[i]
        } else {
          status=status+filters[i]+','
        }    
      }
      url=url+'&state='+status;
      console.log(url)
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }
  
}
