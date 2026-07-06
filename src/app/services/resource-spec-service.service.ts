import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { components } from "../models/resource-catalog";
import { SoftwareSupportPackage, SoftwareSupportPackageSpecification } from "../models/software.model";
import { LocalStorageService } from "./local-storage.service";
import { PageRequest, PageResult } from '../models/pagination.model';

type ResourceSpecification_Create = components["schemas"]["ResourceSpecification_Create"];

export type ResourceSpecType = 'ResourceSpecification' | 'SoftwareSpecification' | 'SoftwareSupportPackageSpecification';

export interface PaginationParams<T = Record<string, any>> {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: Partial<Record<keyof T | 'q', any>>;
}

@Injectable({
  providedIn: 'root'
})
export class ResourceSpecServiceService {

  public static BASE_URL: String = environment.BASE_URL;
  public static RES_SPEC_LIMIT: number = environment.RES_SPEC_LIMIT;

  private readonly RESOURCE_API = {
    ResourceSpecification: {
      resource: environment.RESOURCE,
      spec: environment.RESOURCE_SPEC
    },
    SoftwareSpecification: {
      resource: environment.SOFTWARE,
      spec: environment.RESOURCE_SPEC
    },
    SoftwareSupportPackage: {
      resource: environment.SOFTWARE,
      spec: environment.RESOURCE
    },
    SoftwareSupportPackageSpecification: {
      resource: environment.SOFTWARE,
      spec: environment.RESOURCE_SPEC
    }
  } as const;
  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  private getType(data: any) {

    return data['@type'] ? data['@type'] : 'ResourceSpecification';
  }

  getResourceSpecByUser(page: any, status: any[], partyId: any, sort?: any, type: ResourceSpecType = 'ResourceSpecification') {

    const resource = this.RESOURCE_API[type]?.resource;
    const spec = this.RESOURCE_API[type].spec;
    const limit = ResourceSpecServiceService.RES_SPEC_LIMIT;
    let url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}?limit=${limit}&offset=${page}&relatedParty.id=${partyId}`;

    if (sort != undefined) {
      url = url + '&sort=' + sort
    }
    let lifeStatus = ''
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

  async getResourceSpecByUserPaged(params: PageRequest, filter: Record<string, string> | undefined, status: any[], partyId: any, sort: any, type: ResourceSpecType = 'ResourceSpecification'): Promise<PageResult<any>> {
    const resource = this.RESOURCE_API[type]?.resource;
    const spec = this.RESOURCE_API[type].spec;

    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
    };
    if (sort != undefined) {
      codeParams['sort'] = sort;
    }
    if (status && status.length > 0) {
      codeParams['lifecycleStatus'] = status.join(',');
    }
    const queryParams = { ...filter, ...codeParams };

    const url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  getResSpecById(id: any, type: ResourceSpecType = 'ResourceSpecification') {

    const resource = this.RESOURCE_API[type].resource;
    const spec = this.RESOURCE_API[type].spec;
    let url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  postResSpec(body: ResourceSpecification_Create, type: ResourceSpecType = 'ResourceSpecification') {

    const resource = this.RESOURCE_API[type]?.resource || type;
    const spec = this.RESOURCE_API[type].spec;
    let url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}`;
    return this.http.post<any>(url, body);
  }

  updateResSpec(body: any, id: any, type: ResourceSpecType = 'ResourceSpecification') {
    const resource = this.RESOURCE_API[type].resource;
    const spec = this.RESOURCE_API[type].spec;
    let url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}/${id}`;
    return this.http.patch<any>(url, body);
  }

  // TODO: review partyId
  getSoftwareSupportPackages(partyId: string, pagination: PaginationParams<SoftwareSupportPackage> = {}): Observable<SoftwareSupportPackage[]> {
    const { resource, spec } = this.RESOURCE_API['SoftwareSupportPackage'];
    const limit = pagination.limit || ResourceSpecServiceService.RES_SPEC_LIMIT;
    const page = pagination.page || 0;

    const params: Record<string, string> = {
      resourceStatus: 'available',
      ...pagination.filter,
      'relatedParty.id': partyId,
      '@type': 'SoftwareSupportPackage',
      limit: limit.toString(),
      offset: page.toString(),
    };

    if (pagination.sort) {
      params['sort'] = pagination.sort;
    }

    const url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}`;
    return this.http.get<SoftwareSupportPackage[]>(url, { params });
  }

  getSoftwareSupportPackage(id: string): Observable<SoftwareSupportPackage> {

    const { resource, spec } = this.RESOURCE_API['SoftwareSupportPackage'];
    const url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}/${id}`;
    return this.http.get<SoftwareSupportPackage>(url);
  }

  updateSoftwareSupportPackage(id: string, updateInfo: Partial<SoftwareSupportPackage>): Observable<SoftwareSupportPackage> {

    const { resource, spec } = this.RESOURCE_API['SoftwareSupportPackage'];
    const url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}/${id}`;
    return this.http.patch<SoftwareSupportPackage>(url, updateInfo);
  }

  getSoftwarePackageSpecs(partyId: string, pagination: PaginationParams<SoftwareSupportPackageSpecification> = {}): Observable<SoftwareSupportPackageSpecification[]> {
    const { resource, spec } = this.RESOURCE_API['SoftwareSupportPackageSpecification'];
    const limit = pagination.limit || ResourceSpecServiceService.RES_SPEC_LIMIT;
    const page = pagination.page || 0;

    const params: Record<string, string> = {
      lifecycleStatus: ['Active', 'Launched'],
      ...pagination.filter,
      'relatedParty.id': partyId,
      '@type': 'SoftwareSupportPackageSpecification',
      limit: limit.toString(),
      offset: page.toString(),
    };

    if (pagination.sort) {
      params['sort'] = pagination.sort;
    }

    const url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}`;
    return this.http.get<SoftwareSupportPackageSpecification[]>(url, { params });
  }

  getSoftwarePackageSpecsByUser(page: any, status: any[], partyId: any): Promise<SoftwareSupportPackageSpecification[]> {
    const { resource, spec } = this.RESOURCE_API['SoftwareSupportPackageSpecification'];
    const limit = ResourceSpecServiceService.RES_SPEC_LIMIT;
    let url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}?limit=${limit}&offset=${page}&relatedParty.id=${partyId}&@type=SoftwareSupportPackageSpecification`;

    let lifeStatus = '';
    if (status.length > 0) {
      for (let i = 0; i < status.length; i++) {
        lifeStatus += i === status.length - 1 ? status[i] : status[i] + ',';
      }
      url += '&lifecycleStatus=' + lifeStatus;
    }

    return lastValueFrom(this.http.get<SoftwareSupportPackageSpecification[]>(url));
  }

  getSoftwarePackageSpec(id: string, partyId: string) {

    const { resource, spec } = this.RESOURCE_API['SoftwareSupportPackageSpecification'];
    const params: Record<string, string> = {
      'relatedParty.id': partyId,
      '@type': 'SoftwareSupportPackageSpecification',
    }
    const url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}/${id}`;
    return this.http.get<SoftwareSupportPackageSpecification>(url, { params });
  }
}
