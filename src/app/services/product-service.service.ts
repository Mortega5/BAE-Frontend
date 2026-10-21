import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { jwtDecode } from "jwt-decode";
import { catchError, lastValueFrom, Observable, of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Category } from '../models/interfaces';
import { applySort, nameContainsPattern, PageRequest, PageResult } from '../models/pagination.model';
import { components } from "../models/product-catalog";
import { ProductOffering as ProductOfferingModel } from '../models/product.model';
import { ResourceStatusType, SoftwareResource } from '../models/software.model';
import { LocalStorageService } from "./local-storage.service";
type ProductOffering = components["schemas"]["ProductOffering"];

export interface CatalogPageResponse {
  items: any[];
  filteredPaginationToken: string | null;
  /** X-Total-Count, when the response carries it (null otherwise). */
  total?: number | null;
}

/** 'public' excludes ad-hoc offers (those with a customer-restricted relatedParty) via a
 * regex filter; 'private' returns only the ad-hoc offers targeted at the current user. */
export type ProductVisibility = 'public' | 'private';

@Injectable({
  providedIn: 'root'
})
export class ApiServiceService {
  public static BASE_URL: String = environment.BASE_URL;
  public static API_PRODUCT: String = environment.PRODUCT_CATALOG;
  public static API_SOFTWARE: String = environment.SOFTWARE;
  public static PRODUCT_LIMIT: number = environment.PRODUCT_LIMIT;
  public static CATALOG_LIMIT: number = environment.CATALOG_LIMIT;
  public static CATEGORY_LIMIT: number = environment.CATEGORY_LIMIT;

  constructor(private http: HttpClient, private localStorage: LocalStorageService) { }

  private getCurrentPartyId(): string | undefined {
    const aux = this.localStorage.getValidLoginInfo();
    if (!aux) {
      return undefined;
    }
    if (aux.logged_as == aux.id) {
      return aux.partyId;
    }
    const loggedOrg = aux.organizations?.find((org: any) => org.id == aux.logged_as);
    return loggedOrg?.partyId;
  }

  /** 'private' needs the current user's partyId to scope the results to their own
   * ad-hoc offers. If it can't be resolved (e.g. logged out, session not loaded yet),
   * we must still constrain the query to something that can never match a real offer —
   * omitting the filter entirely would silently turn "my private offers" into "every
   * offer, public and private". */
  private applyVisibilityFilter(queryParams: Record<string, any>, visibility?: ProductVisibility): void {
    if (visibility === 'private') {
      const partyId = this.getCurrentPartyId();
      queryParams['relatedParty.id'] = partyId ?? 'urn:ngsi-ld:organization:no-current-user';
      queryParams['relatedParty.role'] = 'customer';
    } else if (visibility === 'public') {
      queryParams['relatedParty.role*'] = '^(?!customer$).*$';
    }
  }

  getAllProducts(): Observable<ProductOfferingModel[]> {
    const productsLimit = 100;
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering?lifecycleStatus=Launched&limit=${productsLimit}`;
    return this.http.get<ProductOfferingModel[]>(url);
  }

  getProducts(page: any, keywords: any, sort?: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering?limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&lifecycleStatus=Launched`;
    if (keywords != undefined) {
      url = url + '&keyword=' + keywords;
    }
    if (sort != undefined) {
      url = url + '&sort=' + sort;
    }

    return lastValueFrom(this.http.get<any[]>(url));
  }

  /** Unified replacement for the old getProductsPaged/getProductsByCategoryPaged: one
   * offering listing call with every optional facet the search page needs, instead of
   * near-duplicate methods per combination of filters. */
  async getOfferingsPaged(options: {
    limit: number;
    offset: number;
    categoryIds?: string[];
    catalogId?: string;
    /** Only offerings where this party is a related party (e.g. a provider's own offerings). */
    partyId?: string;
    keywords?: string;
    visibility?: ProductVisibility;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
  }): Promise<PageResult<any>> {
    const queryParams: Record<string, any> = {
      limit: options.limit,
      offset: options.offset,
      lifecycleStatus: 'Launched',
    };
    if (options.partyId) {
      queryParams['relatedParty.id'] = options.partyId;
    }
    applySort({ limit: options.limit, offset: options.offset, orderBy: options.orderBy, orderDirection: options.orderDirection }, queryParams);
    if (options.categoryIds && options.categoryIds.length > 0) {
      queryParams['category.id'] = options.categoryIds.join(',');
    }
    if (options.keywords?.trim()) {
      // `keyword` only works when the proxy has a search engine behind it (SEARCH_ENABLED);
      // otherwise fall back to a case-insensitive "name contains" regex.
      if (environment.SEARCH_ENABLED) {
        queryParams['keyword'] = options.keywords;
      } else {
        queryParams['name*'] = nameContainsPattern(options.keywords);
      }
    }
    this.applyVisibilityFilter(queryParams, options.visibility);

    const url = options.catalogId
      ? `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${options.catalogId}/productOffering`
      : `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  async getProductsDetails(offers: any[]) {
    let normalized: any[] = [];

    if (Array.isArray(offers)) {
      normalized = offers;
    } else if (offers && typeof offers === 'object') {
      normalized = [offers]; // wrap single object into array
    }

    // Collect every distinct id up front so specs and prices for the WHOLE page are
    // fetched with one request each, instead of one request per offer.
    const specIds = [...new Set(normalized.map(o => o.productSpecification?.id).filter(Boolean))];
    const priceIds = [...new Set(
      normalized.flatMap(o => (o.productOfferingPrice ?? []).map((p: { id: any; }) => p.id))
    )];

    const [specs, prices] = await Promise.all([
      this.getProductSpecifications(specIds),
      this.getProductPrices(priceIds),
    ]);
    await this.resolveBundledPrices(prices);

    const specById = new Map(specs.map((s: any) => [s.id, s]));
    const priceById = new Map(prices.map((p: any) => [p.id, p]));

    return normalized.map((offer: any): ProductOffering => {
      try {
        const spec = offer.productSpecification?.id ? specById.get(offer.productSpecification.id) : undefined;
        const prodPrices = (offer.productOfferingPrice ?? [])
          .map((p: { id: any; }) => priceById.get(p.id))
          .filter((p: any) => p != null);

        // Building `ProductOffering` object
        return {
          id: offer.id,
          href: offer.href,
          name: offer.name,
          description: offer.description,
          isBundle: offer.isBundle,
          isSellable: offer.isSellable,
          lastUpdate: offer.lastUpdate,
          lifecycleStatus: offer.lifecycleStatus,
          statusReason: offer.statusReason,
          version: offer.version,
          agreement: offer.agreement ?? [],
          attachment: spec?.attachment ?? [],
          bundledProductOffering: offer.bundledProductOffering ?? [],
          category: offer.category ?? [],
          channel: offer.channel ?? [],
          marketSegment: offer.marketSegment ?? [],
          place: offer.place ?? [],
          prodSpecCharValueUse: offer.prodSpecCharValueUse ?? [],
          productOfferingPrice: prodPrices,
          productOfferingRelationship: offer.productOfferingRelationship ?? [],
          productOfferingTerm: offer.productOfferingTerm ?? [],
          productSpecification: spec ?? offer.productSpecification,
          resourceCandidate: offer.resourceCandidate,
          serviceCandidate: offer.serviceCandidate,
          serviceLevelAgreement: offer.serviceLevelAgreement,
          validFor: offer.validFor,
          "@baseType": offer["@baseType"],
          "@schemaLocation": offer["@schemaLocation"],
          "@type": offer["@type"]
        };
      } catch (error) {
        console.error(`Error processing product ${offer.id}:`, error);
        return offer; // If error returns the original offer
      }
    });
  }

  getProductsByCategory(ids: Category[], page: any, keywords: any, sort?: any) {
    let id_str = '';
    for (let i = 0; i < ids.length; i++) {
      if (i == 0) {
        id_str = 'category.id=' + ids[i].id
      } else {
        id_str = id_str + ',' + ids[i].id
      }
    }

    const baseUrl = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering`;
    const query = `limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&lifecycleStatus=Launched`;

    // Add the ID string only when some categories are selected
    let url;
    if (id_str !== '') {
      url = `${baseUrl}?${id_str}&${query}`;
    } else {
      url = `${baseUrl}?${query}`
    }
    if (keywords != undefined) {
      url = url + '&keyword=' + keywords;
    }
    if (sort != undefined) {
      url = url + '&sort=' + sort;
    }
    return lastValueFrom(this.http.get<any[]>(url));
  }

  getProductsByCatalog(catalogId: any, page: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering?lifecycleStatus=Launched&limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}`

    return lastValueFrom(this.http.get<any[]>(url));
  }

  /** Same as getProductsByCatalog, but returns the real X-Total-Count. */
  async getProductsByCatalogPaged(catalogId: any, params: PageRequest): Promise<PageResult<any>> {
    const queryParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      lifecycleStatus: 'Launched',
    };
    applySort(params, queryParams);

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  catalogHasLaunchedOffers(catalogId: any): Promise<boolean> {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering?lifecycleStatus=Launched&limit=1`;

    return lastValueFrom(this.http.get<any[]>(url))
      .then(res => Array.isArray(res) && res.length > 0)
      .catch(() => false);
  }

  getProductsByCategoryAndCatalog(ids: Category[], catalogId: any, page: any) {
    let id_str = '';
    for (let i = 0; i < ids.length; i++) {
      if (i == 0) {
        id_str = 'category.id=' + ids[i].id
      } else {
        id_str = id_str + ',' + ids[i].id
      }
    }
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering?lifecycleStatus=Launched&${id_str}&limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}`;

    return lastValueFrom(this.http.get<any[]>(url));
  }

  /** Same as getProductsByCategoryAndCatalog, but returns the real X-Total-Count. */
  async getProductsByCategoryAndCatalogPaged(ids: Category[], catalogId: any, params: PageRequest): Promise<PageResult<any>> {
    const queryParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      lifecycleStatus: 'Launched',
    };
    applySort(params, queryParams);
    if (ids.length > 0) {
      queryParams['category.id'] = ids.map(category => category.id).join(',');
    }

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  getProductById(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getProductOfferByOwner(page: any, status: any[], partyId: any, sort: any, isBundle: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering?limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&relatedParty.id=${partyId}`;

    if (sort != undefined) {
      url = url + '&sort=' + sort
    }
    if (isBundle != undefined) {
      url = url + '&isBundle=' + isBundle
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

  getLaunchedProductOffersByOwnerAndCategory(page: any, keywords: any, categories: Category[], partyId: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering?limit=${ApiServiceService.PRODUCT_LIMIT}&offset=${page}&relatedParty.id=${partyId}&lifecycleStatus=Launched`;

    const categoryIds = (categories ?? [])
      .map(category => category?.id)
      .filter(id => id != null && id !== '');

    if (categoryIds.length > 0) {
      url = url + '&category.id=' + categoryIds.join(',');
    }
    if (keywords != undefined) {
      url = url + '&keyword=' + keywords;
    }

    return lastValueFrom(this.http.get<any[]>(url));
  }

  async getProductOfferByOwnerPaged(params: PageRequest, filter: Record<string, string> | undefined, status: any[], partyId: any, isBundle: any): Promise<PageResult<any>> {
    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
    };

    if (isBundle != undefined) {
      codeParams['isBundle'] = isBundle;
    }
    if (status && status.length > 0) {
      codeParams['lifecycleStatus'] = status.join(',');
    }
    applySort(params, codeParams);

    const queryParams = { ...filter, ...codeParams };

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  /** Offers sharing the same product spec (e.g. several price plans/bundle members) enrich
   * concurrently in getProductsDetails, each calling this independently — dedup concurrent
   * calls for the same id into a single HTTP request. Cleared as soon as it settles (success
   * or failure), so later calls always refetch fresh (e.g. after editing the spec). */
  private pendingProductSpecRequests = new Map<string, Promise<any>>();

  getProductSpecification(id: any) {
    const existing = this.pendingProductSpecRequests.get(id);
    if (existing) return existing;

    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productSpecification/${id}`;
    const request = lastValueFrom(this.http.get<any>(url))
      .finally(() => this.pendingProductSpecRequests.delete(id));

    this.pendingProductSpecRequests.set(id, request);
    return request;
  }

  getProductSpecifications(ids: any[]): Promise<any[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    if (ids.length === 1) {
      // A single id is a direct lookup, not a search - cheaper for the backend than the
      // filtered list endpoint below.
      return this.getProductSpecification(ids[0])
        .then(spec => spec ? [spec] : [])
        .catch(() => []);
    }
    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productSpecification?id=${ids.join(',')}&limit=${ids.length}`;
    return lastValueFrom(this.http.get<any[]>(url)).then(specs => {
      const byId = new Map((specs ?? []).map((s: any) => [s.id, s]));
      return ids.map(id => byId.get(id)).filter((s: any) => s != null);
    });
  }

  checkOfferingLaunch(id: string): Promise<{ canBeLaunched: boolean }> {
    const url = `${ApiServiceService.BASE_URL}/offering/${id}/launch`;
    return lastValueFrom(this.http.get<{ canBeLaunched: boolean }>(url));
  }

  getProductPrice(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice/${id}`

    return lastValueFrom(this.http.get<any>(url));
  }

  getProductPrices(ids: any[]): Promise<any[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    if (ids.length === 1) {
      // A single id is a direct lookup, not a search - cheaper for the backend than the
      // filtered list endpoint below.
      return this.getProductPrice(ids[0])
        .then(price => price ? [price] : [])
        .catch(() => []);
    }
    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice?id=${ids.join(',')}&limit=${ids.length}`;
    return lastValueFrom(this.http.get<any[]>(url)).then(prices => {
      const byId = new Map((prices ?? []).map((p: any) => [p.id, p]));
      return ids.map(id => byId.get(id)).filter((p: any) => p != null);
    });
  }

  /**
   * A "bundle" productOfferingPrice (isBundle: true) carries no price/priceType of its
   * own - the real value lives in the productOfferingPrice referenced by its
   * bundledPopRelationship. Resolves every such wrapper found in `pops` with a single
   * batched request, no matter how many wrappers/offers are involved, merging the
   * referenced price directly onto the wrapper so callers keep reading `priceType`/
   * `price` as they would for any other price plan. A wrapper bundling more than one
   * price component is left untouched - there's no single price to surface for it.
   * Mutates and returns the same array, so it can be chained after the fetch that
   * produced it.
   */
  async resolveBundledPrices(pops: any[]): Promise<any[]> {
    const componentIdToWrapper = new Map<string, any>();

    for (const pop of pops ?? []) {
      // Already resolved (e.g. a previous call already merged the component's price
      // onto this same wrapper) - skip it, no need to fetch its component again.
      if (!pop?.isBundle || pop.priceType !== undefined) continue;
      const rel = pop.bundledPopRelationship;
      const components = Array.isArray(rel) ? rel : rel ? [rel] : [];
      if (components.length === 1 && components[0]?.id) {
        componentIdToWrapper.set(components[0].id, pop);
      }
    }

    if (componentIdToWrapper.size === 0) {
      return pops;
    }

    const resolvedComponents = await this.getProductPrices([...componentIdToWrapper.keys()]);
    const byId = new Map(resolvedComponents.map((c: any) => [c.id, c]));

    for (const [componentId, wrapper] of componentIdToWrapper) {
      const component = byId.get(componentId);
      if (component) {
        wrapper.priceType = component.priceType;
        wrapper.price = component.price;
        wrapper.recurringChargePeriodType = component.recurringChargePeriodType;
        wrapper.unitOfMeasure = component.unitOfMeasure;
      }
    }

    return pops;
  }

  getLaunchedCategories() {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category?limit=${ApiServiceService.CATEGORY_LIMIT}&lifecycleStatus=Launched`;

    return lastValueFrom(
      this.http.get<any[]>(url).pipe(
        catchError(error => {
          console.error("Error getting categories:", error);
          return of([]);
        })
      )
    );
  }

  getCategories(status: any[]) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category?limit=${ApiServiceService.CATEGORY_LIMIT}`;
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

    return lastValueFrom(
      this.http.get<any[]>(url).pipe(
        catchError(error => {
          console.error("Error getting categories:", error);
          return of([]);
        })
      )
    );
  }

  async getDefaultCategories() {
    let categories: any[] = [];
    if (environment.DFT_CATALOG_ID && environment.DFT_CATALOG_ID !== '') {
      // Return the default catalog categories
      const catalog = await this.getCatalog(environment.DFT_CATALOG_ID);
      if (catalog.category) {
        categories = await Promise.all(catalog.category.map(async (category: any) => {
          return this.getCategoryById(category.id)
        }));
      }
    } else {
      // Return all the launched categories
      categories = await this.getLaunchedCategories();
    }

    return categories;
  }

  getCategoryById(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getCategoriesByParentId(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category?parentId=${id}`;

    return lastValueFrom(this.http.get<any[]>(url));
  }

  postCategory(category: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category`;

    return this.http.post<any>(url, category);
  }

  updateCategory(category: any, id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/category/${id}`;

    return this.http.patch<any>(url, category);
  }

  getCatalogs(page: any, filter: any): Promise<any> {
    return this.getCatalogsWithLimit(page, filter, ApiServiceService.CATALOG_LIMIT);
  }

  getCatalogsWithLimit(page: any, filter: any, limit: number): Promise<any> {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${limit}&offset=${page}&lifecycleStatus=Launched`;
    if (filter != undefined) {
      url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${limit}&offset=${page}&lifecycleStatus=Launched&body=${filter}`;
    }
    console.log('getcatalogs')
    console.log(this)

    return lastValueFrom(this.http.get<any>(url));
  }

  /** Launched catalogs with the real X-Total-Count, meant for use with `fetchAllPages` to
   * populate a catalog picker (e.g. the search page's "filter by catalog" select). */
  async getCatalogsPaged(params: PageRequest): Promise<PageResult<any>> {
    const queryParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      lifecycleStatus: 'Launched',
    };
    applySort(params, queryParams);

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog`;
    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  getLaunchedCatalogsPage(
    page: any,
    filter: any,
    limit: number,
    filteredPaginationToken?: string | null,
    relatedPartyId?: string | null,
    sort?: string | null
  ): Promise<CatalogPageResponse> {
    const tokenRequestHeader = 'X-Filtered-Pagination-Token';
    const tokenResponseHeader = 'x-filtered-pagination-token';
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${limit}&offset=${page}&lifecycleStatus=Launched`;
    if (filter?.trim()) {
      // The search engine only indexes offerings, so catalogs are always searched by name.
      url = url + `&name*=${encodeURIComponent(nameContainsPattern(filter))}`;
    }
    if (relatedPartyId) {
      url = url + `&relatedParty.id=${relatedPartyId}`;
    }
    if (sort) {
      url = url + `&sort=${sort}`;
    }

    let options: { observe: 'response', headers?: { [header: string]: string } } = { observe: 'response' };
    if (filteredPaginationToken && !relatedPartyId) {
      options.headers = { [tokenRequestHeader]: filteredPaginationToken };
    }

    return lastValueFrom(this.http.get<any[]>(url, options)).then(response => {
      const totalHeader = response.headers.get('X-Total-Count');
      return {
        items: response.body ?? [],
        filteredPaginationToken: response.headers.get(tokenResponseHeader)
          || response.headers.get(tokenRequestHeader),
        total: totalHeader != null ? Number(totalHeader) : null,
      };
    });
  }

  getCatalogsByUser(page: any, filter: any, status: any[], partyId: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=${ApiServiceService.CATALOG_LIMIT}&offset=${page}&relatedParty.id=${partyId}`;
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

    if (filter != undefined) {
      url = url + `&body=${filter}`;
    }

    return lastValueFrom(this.http.get<any>(url));
  }

  async getCatalogsByUserPaged(params: PageRequest, filter: Record<string, string> | undefined, status: any[], partyId: any): Promise<PageResult<any>> {
    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog`;
    const codeParams: Record<string, string> = {
      limit: String(params.limit),
      offset: String(params.offset),
      'relatedParty.id': partyId,
    };
    if (status && status.length > 0) {
      codeParams['lifecycleStatus'] = status.join(',');
    }
    applySort(params, codeParams);
    const queryParams = { ...filter, ...codeParams };

    const response = await lastValueFrom(this.http.get<any[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  getCatalog(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  postCatalog(catalog: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog`;

    return this.http.post<any>(url, catalog);
  }

  postAdminCatalog(catalog: any) {
    let url = `${ApiServiceService.BASE_URL}/admin/catalog/catalog`;

    return this.http.post<any>(url, catalog);
  }

  createDefaultCatalog(catalog: any) {
    let url = `${ApiServiceService.BASE_URL}/admin/defaultcatalog/create`;

    return this.http.post<any>(url, catalog);
  }

  updateCatalog(catalog: any, id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${id}`;

    return this.http.patch<any>(url, catalog);
  }

  deleteCatalog(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${id}`;

    return this.http.delete<any>(url);
  }

  updateAdminCatalog(catalog: any, id: any) {
    let url = `${ApiServiceService.BASE_URL}/admin/catalog/catalog/${id}`;

    return this.http.patch<any>(url, catalog);
  }

  setDefaultCatalog(catalogId: string) {
    let url = `${ApiServiceService.BASE_URL}/admin/defaultcatalog`;

    return this.http.post<any>(url, { catalogId });
  }

  getServiceSpec(id: any) {
    let url = `${ApiServiceService.BASE_URL}/service/serviceSpecification/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  getResourceSpec(id: any) {
    let url = `${ApiServiceService.BASE_URL}/resource/resourceSpecification/${id}`;

    return lastValueFrom(this.http.get<any>(url));
  }

  postOfferingPrice(price: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice`;
    return this.http.post<any>(url, price);
  }

  updateOfferingPrice(price: any, id: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice/${id}`;
    return this.http.patch<any>(url, price);
  }

  getOfferingPrice(id: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOfferingPrice/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  postProductOffering(prod: any, catalogId: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog/${catalogId}/productOffering`;
    if (!catalogId) {
      url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering`;
    }
    return this.http.post<any>(url, prod);
  }

  updateProductOffering(prod: any, id: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering/${id}`;
    return this.http.patch<any>(url, prod);
  }

  deleteProductOffering(id: any) {
    let url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productOffering/${id}`;
    return this.http.delete<any>(url);
  }

  postSLA(sla: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}/SLAManagement/sla`;
    return this.http.post<any>(url, sla);
  }

  getSLA(id: any) {
    //POST - El item va en el body de la petición
    let url = `${ApiServiceService.BASE_URL}/SLAManagement/sla/${id}`;
    return lastValueFrom(this.http.get<any>(url));
  }

  getComplianceLevel(prodSpec: any) {
    let level = 'NL';

    if (prodSpec.productSpecCharacteristic != undefined) {
      let vcProf = prodSpec.productSpecCharacteristic.find(((p: any) => {
        return p.name === `Compliance:VC`
      }));

      if (vcProf) {
        const vcToken: any = vcProf.productSpecCharacteristicValue?.at(0)?.value
        const decoded = jwtDecode(vcToken)
        let credential: any = null

        if ('verifiableCredential' in decoded) {
          credential = decoded.verifiableCredential;
        } else if ('vc' in decoded) {
          credential = decoded.vc;
        }

        if (credential != null) {
          const subject = credential.credentialSubject;

          if ('gx:labelLevel' in subject) {
            level = subject['gx:labelLevel'];
          }
        }
      }
    }

    return level;
    //return 'BL'
    //return 'P'
    //return 'PP'
  }

  getSoftwareResourceByUser(page: any, filter: any, status: ResourceStatusType[], partyId: any): Promise<SoftwareResource[]> {
    const params: Record<string, any> = {
      limit: ApiServiceService.CATALOG_LIMIT,
      offset: page,
      'relatedParty.id': partyId,
      '@type': 'SoftwareSupportPackage'
    };

    if (status?.length > 0) {
      params['resourceStatus'] = status.join(',');
    }

    if (filter != undefined) {
      params['body'] = filter;
    }

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_SOFTWARE}/resource`;
    return lastValueFrom(this.http.get<SoftwareResource[]>(url, { params }));
  }

  async getSoftwareResourceByUserPaged(params: PageRequest, filter: Record<string, string> | undefined, status: ResourceStatusType[], partyId: any): Promise<PageResult<SoftwareResource>> {
    const codeParams: Record<string, any> = {
      limit: params.limit,
      offset: params.offset,
      'relatedParty.id': partyId,
      '@type': 'SoftwareSupportPackage'
    };
    if (status?.length > 0) {
      codeParams['resourceStatus'] = status.join(',');
    }
    applySort(params, codeParams);
    const queryParams = { ...filter, ...codeParams };

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_SOFTWARE}/resource`;
    const response = await lastValueFrom(this.http.get<SoftwareResource[]>(url, { params: queryParams, observe: 'response' }));
    const items = response.body ?? [];
    const total = Number(response.headers.get('X-Total-Count') ?? items.length);
    return { items, total };
  }

  postSoftware(software: any) {

    const url = `${ApiServiceService.BASE_URL}${ApiServiceService.API_SOFTWARE}/resource`;
    return this.http.post<any>(url, software);
  }

}
