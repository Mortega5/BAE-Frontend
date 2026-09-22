import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiServiceService } from './product-service.service';

describe('ApiServiceService', () => {
  let service: ApiServiceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule, RouterTestingModule, TranslateModule.forRoot()] });
    service = TestBed.inject(ApiServiceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getProductSpecification should dedup concurrent calls for the same id into a single HTTP request', async () => {
    const id = 'spec-1';
    const responseBody = { id };

    const promise1 = service.getProductSpecification(id);
    const promise2 = service.getProductSpecification(id);

    const req = httpMock.expectOne(`${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productSpecification/${id}`);
    req.flush(responseBody);

    await expectAsync(promise1).toBeResolvedTo(responseBody);
    await expectAsync(promise2).toBeResolvedTo(responseBody);
  });

  it('getProductSpecification should issue a fresh request once the previous one has settled', async () => {
    const id = 'spec-1';

    const promise1 = service.getProductSpecification(id);
    httpMock.expectOne(`${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productSpecification/${id}`).flush({ id, name: 'First' });
    await promise1;

    const promise2 = service.getProductSpecification(id);
    const req2 = httpMock.expectOne(`${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/productSpecification/${id}`);
    req2.flush({ id, name: 'Updated' });

    await expectAsync(promise2).toBeResolvedTo({ id, name: 'Updated' });
  });

  it('should expose the filtered pagination token from launched catalog responses', async () => {
    const resultPromise = service.getLaunchedCatalogsPage(0, undefined, 12);

    const req = httpMock.expectOne(request =>
      request.method === 'GET'
      && request.urlWithParams === `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=12&offset=0&lifecycleStatus=Launched`
    );
    expect(req.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    req.flush([{ id: 'catalog-1' }], {
      headers: { 'x-filtered-pagination-token': 'next-token' }
    });

    await expectAsync(resultPromise).toBeResolvedTo({
      items: [{ id: 'catalog-1' }],
      filteredPaginationToken: 'next-token'
    });
  });

  it('should send the filtered pagination token header for public launched catalog requests', async () => {
    const resultPromise = service.getLaunchedCatalogsPage(12, 'cloud', 12, 'current-token');

    const req = httpMock.expectOne(request =>
      request.method === 'GET'
      && request.urlWithParams === `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=12&offset=12&lifecycleStatus=Launched&body=cloud`
    );
    expect(req.request.headers.get('X-Filtered-Pagination-Token')).toBe('current-token');
    req.flush([], {});

    await expectAsync(resultPromise).toBeResolvedTo({
      items: [],
      filteredPaginationToken: null
    });
  });

  it('should not send the filtered pagination token header when a relatedParty filter is present', async () => {
    const resultPromise = service.getLaunchedCatalogsPage(0, undefined, 12, 'current-token', 'organization-1');

    const req = httpMock.expectOne(request =>
      request.method === 'GET'
      && request.urlWithParams === `${ApiServiceService.BASE_URL}${ApiServiceService.API_PRODUCT}/catalog?limit=12&offset=0&lifecycleStatus=Launched&relatedParty.id=organization-1`
    );
    expect(req.request.headers.has('X-Filtered-Pagination-Token')).toBeFalse();
    req.flush([]);

    await expectAsync(resultPromise).toBeResolvedTo({
      items: [],
      filteredPaginationToken: null
    });
  });

  it('should create the default catalog through the admin default catalog endpoint', () => {
    const payload = {
      name: 'Default Catalog',
      description: 'Main marketplace catalog'
    };

    service.createDefaultCatalog(payload).subscribe(response => {
      expect(response).toEqual({ id: 'catalog-1' });
    });

    const req = httpMock.expectOne(request =>
      request.method === 'POST'
      && request.url === `${ApiServiceService.BASE_URL}/admin/defaultcatalog/create`
    );
    expect(req.request.body).toEqual(payload);
    req.flush({ id: 'catalog-1' });
  });
});
