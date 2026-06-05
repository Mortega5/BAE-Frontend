import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { components } from "../models/resource-catalog";
import { LocalStorageService } from "./local-storage.service";

type ResourceSpecification_Create = components["schemas"]["ResourceSpecification_Create"];

export type ResourceSpecType = 'ResourceSpecification' | 'SoftwareSpecification';


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

  getResSpecById(id: any, type: ResourceSpecType = 'ResourceSpecification') {

    const resource = this.RESOURCE_API[type].resource;
    const spec = this.RESOURCE_API[type].spec;
    let url = `${ResourceSpecServiceService.BASE_URL}${resource}${spec}/${id}`;

    return lastValueFrom(this.http.get<any>(url)); 1
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

}
