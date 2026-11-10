import { HttpClient, HttpErrorResponse, HttpEvent, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, lastValueFrom, map, Observable, of } from 'rxjs';
import { fetchAllPages } from 'src/app/models/pagination.model';
import { environment } from 'src/environments/environment';
import { AccountServiceService } from './account-service.service';
import { LocalStorageService } from './local-storage.service';

/** How the datasets of the seller are made, which is not their choice: a file the marketplace keeps, or the address where their
 * own DSP serves it. It follows whether the organization has a contract management of its own (see `DatasetService.source`). */
export type DatasetSource = 'file' | 'url';

export type DatasetVisibility = 'private' | 'public' | 'custom';
export const DATASET_VISIBILITIES: DatasetVisibility[] = ['private', 'public', 'custom'];

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  version: string;
  lifecycleStatus: string;
  /** Who can read the file; fixed at upload. Missing (an old proxy) means private. */
  visibility: DatasetVisibility;
  fileId: string;
  /** Name the file had when it was uploaded; not updated when the file is replaced */
  filename: string;
  /** The next five come from the file service on every read and are missing when it cannot be reached */
  checksum?: string;
  url?: string;
  size?: number;
  mimeType?: string;
  originalName?: string;
  incomplete?: boolean;
}

export interface DatasetCreate {
  name: string;
  description?: string;
  version?: string;
  visibility?: DatasetVisibility;
  /** Where the data is, for a dataset that is not uploaded: the seller serves it from their own DSP. */
  url?: string;
}

/** The characteristic that makes a service specification the dataset a seller serves from their own DSP: its address. */
export const DATASET_URL_CHARACTERISTIC = 'datasetUrl';

/** True for a service specification that is a dataset served by the seller: it has the characteristic of its address. */
export const isDatasetServiceSpec = (spec: any): boolean =>
  (spec?.specCharacteristic ?? []).some((characteristic: any) => characteristic?.name === DATASET_URL_CHARACTERISTIC);

/** The ids of the specifications a product references that can be its dataset: a file is a resource, an address a service. */
export const datasetReferenceIds = (productSpec: any): string[] =>
  [...(productSpec?.resourceSpecification ?? []), ...(productSpec?.serviceSpecification ?? [])]
    .map((reference: any) => reference?.id)
    .filter((id: any): id is string => typeof id === 'string' && id !== '');

/** How a product references its dataset: by the kind of specification the id says it is (a service is served by the seller, a resource is a file). */
export const datasetReference = (dataset: Dataset): { resourceSpecification: any[]; serviceSpecification: any[] } => {
  const reference = [{ id: dataset.id, href: dataset.id }];
  return dataset.id.includes(':service-specification:')
    ? { resourceSpecification: [], serviceSpecification: reference }
    : { resourceSpecification: reference, serviceSpecification: [] };
};

/** A dataset made from an address instead of a file: the file service has nothing of it, so it has no file id. */
export const isExternalDataset = (dataset: Dataset): boolean => !dataset.fileId && !!dataset.url;

/** What a seller changes in a dataset: the new file, or the new address of one that is not uploaded. */
export interface DatasetReplacement {
  file?: File;
  url?: string;
}

export const DATASET_ACCEPTED_TYPES = ['text/csv', 'application/json'];
export const DATASET_ACCEPT_ATTR = '.csv,.json,text/csv,application/json';
export const DATASET_MAX_SIZE_BYTES = 100 * 1024 * 1024;

/** CSV/JSON from the mime type, else from the file extension; '-' when neither is known. */
export function datasetFormat(dataset: Dataset): string {
  if (dataset.mimeType === 'application/json') return 'JSON';
  if (dataset.mimeType === 'text/csv') return 'CSV';
  if (dataset.mimeType) return dataset.mimeType;
  const name = dataset.originalName || dataset.filename || '';
  const extension = name.includes('.') ? name.split('.').pop()!.toUpperCase() : '';
  return extension || '-';
}

/** The id the seller's custom policy must carry in its `odrl:uid`: it ties the policy to its dataset. Only the
 * last segment of the id (its uuid) is used, to keep the uid short; the proxy matches on the same. */
export function datasetPolicyUid(datasetId: string): string {
  return `urn:policy:dataset:${datasetId.slice(datasetId.lastIndexOf(':') + 1)}`;
}

export function datasetSize(dataset: Dataset): string {
  const bytes = dataset.size;
  if (bytes == null) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DATASET_ERROR_KEYS: Record<number, string> = {
  400: 'DATASETS._error_generic',
  403: 'DATASETS._error_seller_required',
  404: 'DATASETS._error_not_found',
  409: 'DATASETS._error_in_use',
  413: 'DATASETS._error_too_large',
  415: 'DATASETS._error_type_not_accepted'
};

export interface DatasetError {
  /** Translation key to show */
  key: string;
  /** Server message, when the status is one where it is shown as is (422, 502, 409) */
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatasetService {

  private readonly API = `${environment.BASE_URL}/dataset`;

  constructor(private http: HttpClient, private account: AccountServiceService, private localStorage: LocalStorageService) { }

  list(offset = 0, limit = 20): Observable<Dataset[]> {
    return this.http.get<Dataset[]>(`${this.API}?offset=${offset}&limit=${limit}`);
  }

  /** Every dataset of the organization: the endpoint has no total, so pages are read until one comes back short. */
  listAll(): Promise<Dataset[]> {
    return fetchAllPages<Dataset>(async ({ limit, offset }) => {
      const items = await lastValueFrom(this.list(offset, limit));
      return { items, total: items.length < limit ? offset + items.length : offset + items.length + 1 };
    });
  }

  /**
   * How the datasets of the seller are made, from what the organization they act as has: an address for the contract
   * management of its own means it serves its data (`url`), otherwise the marketplace keeps the file. Nothing is asked
   * of the proxy. A seller acting as themselves, not as an organization, has none.
   */
  source(): Observable<DatasetSource> {
    const partyId = this.organizationPartyId();
    if (!partyId) return of('file');
    return from(this.account.getOrgContractManagementAddress(partyId)).pipe(map(address => address ? 'url' : 'file'));
  }

  /** The party of the organization the seller is logged in as, if any. */
  private organizationPartyId(): string | undefined {
    const session = this.localStorage.getValidLoginInfo();
    if (!session || session.logged_as == session.id) return undefined;
    return session.organizations?.find((org: any) => org.id == session.logged_as)?.partyId;
  }

  get(id: string): Observable<Dataset> {
    return this.http.get<Dataset>(`${this.API}/${encodeURIComponent(id)}`);
  }

  /**
   * Text fields go before the file: the proxy rejects the request otherwise (FormData keeps insertion order).
   * Emits HttpEvents so the caller can show upload progress; the last one is the HttpResponse<Dataset>.
   * A dataset that is not uploaded goes with its `url` and no file.
   */
  create(data: DatasetCreate, file?: File): Observable<HttpEvent<Dataset>> {
    const form = new FormData();
    form.append('name', data.name);
    if (data.description) {
      form.append('description', data.description);
    }
    if (data.version) {
      form.append('version', data.version);
    }
    if (data.visibility) {
      form.append('visibility', data.visibility);
    }
    if (data.url) {
      form.append('url', data.url);
    }
    if (file) {
      form.append('file', file);
    }

    return this.http.post<Dataset>(this.API, form, { reportProgress: true, observe: 'events' });
  }

  /** Only the file goes in the body: any other field is a 400. The version is changed through the resource API. */
  replaceFile(id: string, file: File): Observable<HttpEvent<Dataset>> {
    const form = new FormData();
    form.append('file', file);

    return this.http.put<Dataset>(`${this.API}/${encodeURIComponent(id)}/file`, form, {
      reportProgress: true,
      observe: 'events'
    });
  }

  /** Only the address goes in the body: it is the one thing of a dataset that is not uploaded that can change. */
  updateUrl(id: string, url: string): Observable<Dataset> {
    return this.http.patch<Dataset>(`${this.API}/${encodeURIComponent(id)}`, { url });
  }

  /** The new file or the new address, in the shape of an upload so that one handler shows the progress of both. */
  replace(id: string, replacement: DatasetReplacement): Observable<HttpEvent<Dataset>> {
    if (replacement.file) {
      return this.replaceFile(id, replacement.file);
    }
    return this.updateUrl(id, replacement.url!).pipe(map(body => new HttpResponse<Dataset>({ body })));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${encodeURIComponent(id)}`);
  }

  /** Maps a failed dataset request to a translation key (plus the server message when it is meant to be shown). */
  static toError(err: unknown): DatasetError {
    const status = err instanceof HttpErrorResponse ? err.status : 0;
    const message: string | undefined = err instanceof HttpErrorResponse ? err.error?.error : undefined;

    if (status === 422) {
      return { key: 'DATASETS._error_invalid_content', message };
    }
    if (status === 502) {
      return { key: 'DATASETS._error_upstream', message };
    }
    if (status === 409) {
      return { key: DATASET_ERROR_KEYS[409], message };
    }
    return { key: DATASET_ERROR_KEYS[status] ?? 'DATASETS._error_generic' };
  }
}
