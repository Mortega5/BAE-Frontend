import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Dataset, datasetFormat, datasetPolicyUid, datasetSize, DatasetService } from './dataset.service';
import { environment } from 'src/environments/environment';

/** FormData keeps insertion order; the proxy needs the text fields before the file. */
function fieldOrder(form: FormData): string[] {
  const names: string[] = [];
  form.forEach((_value, name) => names.push(name));
  return names;
}

describe('DatasetService', () => {
  let service: DatasetService;
  let httpMock: HttpTestingController;
  const api = `${environment.BASE_URL}/dataset`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(DatasetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists with offset and limit', () => {
    service.list(10, 5).subscribe();
    const req = httpMock.expectOne(`${api}?offset=10&limit=5`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('gets one dataset by encoded id', () => {
    service.get('urn:ngsi-ld:document:1').subscribe();
    const req = httpMock.expectOne(`${api}/urn%3Angsi-ld%3Adocument%3A1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates with the text fields before the file and progress reporting', () => {
    const file = new File(['a,b'], 'data.csv', { type: 'text/csv' });
    service.create({ name: 'N', description: 'D', version: '2.0', visibility: 'custom' }, file).subscribe();

    const req = httpMock.expectOne(api);
    expect(req.request.method).toBe('POST');
    expect(req.request.reportProgress).toBeTrue();
    const form = req.request.body as FormData;
    expect(fieldOrder(form)).toEqual(['name', 'description', 'version', 'visibility', 'file']);
    expect(form.get('name')).toBe('N');
    expect(form.get('visibility')).toBe('custom');
    expect(form.has('characteristics')).toBeFalse();
    expect((form.get('file') as File).name).toBe('data.csv');
    req.flush({});
  });

  it('omits empty optional fields on create', () => {
    const file = new File(['{}'], 'd.json', { type: 'application/json' });
    service.create({ name: 'N' }, file).subscribe();

    const req = httpMock.expectOne(api);
    expect(fieldOrder(req.request.body)).toEqual(['name', 'file']);
    req.flush({});
  });

  it('names the policy of a dataset after the last segment of its id', () => {
    expect(datasetPolicyUid('urn:ngsi-ld:resource-specification:1')).toBe('urn:policy:dataset:1');
    expect(datasetPolicyUid('rs-1')).toBe('urn:policy:dataset:rs-1');
  });

  it('replaces the file sending only the file', () => {
    const file = new File(['x'], 'd.csv', { type: 'text/csv' });
    service.replaceFile('id1', file).subscribe();

    const req = httpMock.expectOne(`${api}/id1/file`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.reportProgress).toBeTrue();
    expect(fieldOrder(req.request.body)).toEqual(['file']);
    req.flush({});
  });

  it('removes a dataset', () => {
    service.remove('id1').subscribe();
    const req = httpMock.expectOne(`${api}/id1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  describe('toError', () => {
    const http = (status: number, error?: any) => new HttpErrorResponse({ status, error });

    it('maps fixed statuses to keys', () => {
      expect(DatasetService.toError(http(400)).key).toBe('DATASETS._error_generic');
      expect(DatasetService.toError(http(403)).key).toBe('DATASETS._error_seller_required');
      expect(DatasetService.toError(http(404)).key).toBe('DATASETS._error_not_found');
      expect(DatasetService.toError(http(413)).key).toBe('DATASETS._error_too_large');
      expect(DatasetService.toError(http(415)).key).toBe('DATASETS._error_type_not_accepted');
    });

    it('keeps the server message for 409, 422 and 502', () => {
      expect(DatasetService.toError(http(409, { error: 'sold by X' }))).toEqual({ key: 'DATASETS._error_in_use', message: 'sold by X' });
      expect(DatasetService.toError(http(422, { error: 'bad csv' }))).toEqual({ key: 'DATASETS._error_invalid_content', message: 'bad csv' });
      expect(DatasetService.toError(http(502, { error: 'repeat' }))).toEqual({ key: 'DATASETS._error_upstream', message: 'repeat' });
    });

    it('falls back to the generic key', () => {
      expect(DatasetService.toError(http(500)).key).toBe('DATASETS._error_generic');
      expect(DatasetService.toError(new Error('x')).key).toBe('DATASETS._error_generic');
    });
  });

  describe('format and size helpers', () => {
    const base: Dataset = { id: 'i', name: 'n', version: '1.0', lifecycleStatus: 'Launched', visibility: 'private', fileId: 'f', filename: 'a.csv' };

    it('use the file metadata when present', () => {
      expect(datasetFormat({ ...base, mimeType: 'application/json' })).toBe('JSON');
      expect(datasetFormat({ ...base, mimeType: 'text/csv' })).toBe('CSV');
      expect(datasetSize({ ...base, size: 500 })).toBe('500 B');
      expect(datasetSize({ ...base, size: 2048 })).toBe('2.0 KB');
      expect(datasetSize({ ...base, size: 3 * 1024 * 1024 })).toBe('3.0 MB');
    });

    it('fall back to the extension and "-" for an incomplete dataset', () => {
      expect(datasetFormat({ ...base, incomplete: true })).toBe('CSV');
      expect(datasetFormat({ ...base, originalName: 'x.json', incomplete: true })).toBe('JSON');
      expect(datasetFormat({ ...base, filename: 'noext', incomplete: true })).toBe('-');
      expect(datasetSize({ ...base, incomplete: true })).toBe('-');
    });
  });

  describe('listAll', () => {
    const page = (count: number) => Array.from({ length: count }, (_, i) => ({ id: `d${i}` }));
    const tick = () => new Promise<void>(resolve => setTimeout(resolve));

    it('reads pages until one comes back short', async () => {
      const all = service.listAll();
      await tick();
      httpMock.expectOne(`${api}?offset=0&limit=200`).flush(page(200));
      await tick();
      httpMock.expectOne(`${api}?offset=200&limit=200`).flush(page(3));

      expect((await all).length).toBe(203);
    });

    it('stops after the first page when it is short', async () => {
      const all = service.listAll();
      await tick();
      httpMock.expectOne(`${api}?offset=0&limit=200`).flush(page(2));

      expect((await all).length).toBe(2);
    });
  });
});
