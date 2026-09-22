import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map } from 'rxjs';
import { Category, LoginInfo } from '../models/interfaces';
import { environment } from 'src/environments/environment';
import {components} from "../models/product-catalog";
type ProductOffering = components["schemas"]["ProductOffering"];
import {LocalStorageService} from "./local-storage.service";
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class AccountServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_ACCOUNT: String = environment.ACCOUNT;

  constructor(private http: HttpClient,private localStorage: LocalStorageService) { }

  getBillingAccount(){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return lastValueFrom(this.http.get<any[]>(url));
  }

  getBillingAccountById(id:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  postBillingAccount(item:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return this.http.post<any>(url, item);
  }

  updateBillingAccount(id:any,item:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.patch<any>(url, item);
  }

  deleteBillingAccount(id:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.delete<any>(url);
  }

  getUserInfo(partyId:any){
    let url = `${AccountServiceService.BASE_URL}/party/individual/${partyId}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  /** Sibling bae-off-card instances in the same offer list often share a seller
   * org and mount within the same tick, each calling this independently — dedup
   * concurrent calls for the same partyId into a single HTTP request. Cleared as
   * soon as it settles (success or failure), so later calls always refetch fresh
   * (e.g. after editing the org's own profile). */
  private pendingOrgInfoRequests = new Map<string, Promise<any>>();

  getOrgInfo(partyId:any){
    const existing = this.pendingOrgInfoRequests.get(partyId);
    if (existing) return existing;

    let url = `${AccountServiceService.BASE_URL}/party/organization/${partyId}`;
    const request = lastValueFrom(this.http.get<any>(url))
      .finally(() => this.pendingOrgInfoRequests.delete(partyId));

    this.pendingOrgInfoRequests.set(partyId, request);
    return request;
  }

  getOrgList(){
    let url = `${AccountServiceService.BASE_URL}/party/organization`;
    return lastValueFrom(this.http.get<any[]>(url));
  }

  updateUserInfo(partyId:any,profile:any){
    let url = `${AccountServiceService.BASE_URL}/party/individual/${partyId}`;   
    return this.http.patch<any>(url, profile);
  }

  updateOrgInfo(partyId:any,profile:any){
    let url = `${AccountServiceService.BASE_URL}/party/organization/${partyId}`;
    return this.http.patch<any>(url, profile);
  }

  /** The org's country lives as a `partyCharacteristic` entry (see org-info.component.ts),
   * not a top-level field. */
  async getOrgCountry(partyId: any): Promise<string | null> {
    const profile = await this.getOrgInfo(partyId);
    const chars = Array.isArray(profile?.partyCharacteristic) ? profile.partyCharacteristic : [];
    return chars.find((c: any) => c?.name === 'country')?.value || null;
  }

  /** Rebuilds the full partyCharacteristic array with the country entry set/replaced,
   * keeping every other characteristic (logo, description, website, contractManagement)
   * untouched — PATCHing just `{name: 'country', ...}` alone would wipe out the rest,
   * since the backend replaces the whole array with whatever is sent. */
  async updateOrgCountry(partyId: any, countryCode: string): Promise<any> {
    const profile = await this.getOrgInfo(partyId);
    const chars = Array.isArray(profile?.partyCharacteristic) ? [...profile.partyCharacteristic] : [];
    const index = chars.findIndex((c: any) => c?.name === 'country');
    if (index !== -1) {
      chars[index] = { ...chars[index], value: countryCode };
    } else {
      chars.push({ name: 'country', value: countryCode });
    }
    return lastValueFrom(this.updateOrgInfo(partyId, { partyCharacteristic: chars }));
  }
}
