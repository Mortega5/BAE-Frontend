import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, map, tap } from 'rxjs';
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

  /** A list of orders points to the same billing account over and over, and each order of a page asks for its own:
   * the calls for one account that are in flight are collapsed into a single HTTP request (same idea as
   * `pendingOrgInfoRequests`). */
  private pendingBillingAccountRequests = new Map<string, Promise<any>>();

  /** Short-lived cache on top of that, for the pages of a list that are read a moment apart. An account edited or
   * deleted from this app is dropped from it right away; one changed elsewhere is picked up when it expires. */
  private billingAccountCache = new Map<string, { value: any; expiresAt: number }>();
  private static BILLING_ACCOUNT_CACHE_TTL_MS = 60_000;

  getBillingAccountById(id:any){
    const key = String(id);
    const cached = this.billingAccountCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value);
    }

    const existing = this.pendingBillingAccountRequests.get(key);
    if (existing) return existing;

    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    const request = lastValueFrom(this.http.get<any>(url))
      .then(account => {
        this.billingAccountCache.set(key, { value: account, expiresAt: Date.now() + AccountServiceService.BILLING_ACCOUNT_CACHE_TTL_MS });
        return account;
      })
      .finally(() => this.pendingBillingAccountRequests.delete(key));

    this.pendingBillingAccountRequests.set(key, request);
    return request;
  }

  postBillingAccount(item:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/`;
    return this.http.post<any>(url, item);
  }

  updateBillingAccount(id:any,item:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.patch<any>(url, item).pipe(tap(() => this.billingAccountCache.delete(String(id))));
  }

  deleteBillingAccount(id:any){
    let url = `${AccountServiceService.BASE_URL}${AccountServiceService.API_ACCOUNT}/billingAccount/${id}`;
    return this.http.delete<any>(url).pipe(tap(() => this.billingAccountCache.delete(String(id))));
  }

  getUserInfo(partyId:any){
    let url = `${AccountServiceService.BASE_URL}/party/individual/${partyId}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  /** Sibling bae-off-card instances in the same offer list often share a seller
   * org and mount within the same tick, each calling this independently — dedup
   * concurrent calls for the same request into a single HTTP request. Cleared as
   * soon as it settles (success or failure). Keyed by the full URL (not just
   * partyId) so a future variant with query params (e.g. `fields=`) never collides
   * with a plain lookup. */
  private pendingOrgInfoRequests = new Map<string, Promise<any>>();

  /** Short-lived cache on top of the in-flight dedup above - covers the same "same
   * org, several offers" case when the calls don't land in the same tick (e.g. the
   * public and private offer sections on /search resolve at different times).
   * Kept intentionally short so an org edit elsewhere is picked up again almost
   * immediately - it's here purely to collapse near-duplicate reads, not to serve
   * as a source of truth. */
  private orgInfoCache = new Map<string, { value: any; expiresAt: number }>();
  private static ORG_INFO_CACHE_TTL_MS = 10_000;

  getOrgInfo(partyId:any){
    let url = `${AccountServiceService.BASE_URL}/party/organization/${partyId}`;

    const cached = this.orgInfoCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.value);
    }

    const existing = this.pendingOrgInfoRequests.get(url);
    if (existing) return existing;

    const request = lastValueFrom(this.http.get<any>(url))
      .then(org => {
        this.orgInfoCache.set(url, { value: org, expiresAt: Date.now() + AccountServiceService.ORG_INFO_CACHE_TTL_MS });
        return org;
      })
      .finally(() => this.pendingOrgInfoRequests.delete(url));

    this.pendingOrgInfoRequests.set(url, request);
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
    this.orgInfoCache.delete(url);
    return this.http.patch<any>(url, profile);
  }

  /** The org's country lives as a `partyCharacteristic` entry (see org-info.component.ts),
   * not a top-level field. */
  async getOrgCountry(partyId: any): Promise<string | null> {
    const profile = await this.getOrgInfo(partyId);
    const chars = Array.isArray(profile?.partyCharacteristic) ? profile.partyCharacteristic : [];
    return chars.find((c: any) => c?.name === 'country')?.value || null;
  }

  /** Sets the org's country and/or adds a contact email in ONE patch. Both live in arrays the
   * backend replaces wholesale (partyCharacteristic / contactMedium), so they are rebuilt from a
   * fresh read, keeping every other entry (logo, description, website, contractManagement, the
   * other contact mediums) untouched — PATCHing just the new entry alone would wipe the rest.
   * The country is set or replaced; the email is only added when the org has none yet. */
  async completeOrgProfile(partyId: any, changes: { country?: string; email?: string }): Promise<any> {
    const profile = await this.getOrgInfo(partyId);
    const patch: any = {};

    if (changes.country) {
      const chars = Array.isArray(profile?.partyCharacteristic) ? [...profile.partyCharacteristic] : [];
      const index = chars.findIndex((c: any) => c?.name === 'country');
      if (index !== -1) {
        chars[index] = { ...chars[index], value: changes.country };
      } else {
        chars.push({ name: 'country', value: changes.country });
      }
      patch.partyCharacteristic = chars;
    }

    if (changes.email) {
      const mediums = Array.isArray(profile?.contactMedium) ? profile.contactMedium : [];
      if (!mediums.some((m: any) => m?.mediumType?.toLowerCase() === 'email')) {
        patch.contactMedium = [...mediums, {
          mediumType: 'Email',
          preferred: true,
          characteristic: { contactType: 'Email', emailAddress: changes.email }
        }];
      }
    }

    return Object.keys(patch).length > 0
      ? lastValueFrom(this.updateOrgInfo(partyId, patch))
      : undefined;
  }

  async updateOrgCountry(partyId: any, countryCode: string): Promise<any> {
    return this.completeOrgProfile(partyId, { country: countryCode });
  }

  /** The seller's payment gateway info: how many gateways it has and the link to its dashboard. */
  getPaymentInfo(): Promise<{ gatewaysCount?: number | string | null; providerUrl?: string | null }> {
    return lastValueFrom(this.http.get<any>(`${environment.BASE_URL}/paymentInfo`));
  }
}
