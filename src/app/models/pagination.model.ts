export interface PageRequest {
  limit: number;
  offset: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PageResult<T> {
  items: T[];
  total: number;
}

/**
 * Maps `orderBy`/`orderDirection` onto `queryParams[key]` using the API's `-field` for
 * descending convention. No-op when `orderBy` isn't set.
 */
export function applySort(params: PageRequest, queryParams: Record<string, any>, key: string = 'sort'): void {
  if (params.orderBy) {
    const desc = params.orderDirection === 'desc';
    queryParams[key] = `${desc ? '-' : ''}${params.orderBy}`;
  }
}
