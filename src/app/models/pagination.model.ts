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

/**
 * Fetches every item across all pages of a `fetchPage`-shaped call (the same shape every
 * `*Paged` service method already returns), paging with a large limit to keep the number of
 * requests small. Only for collections meant to be loaded in full (e.g. populating a `<select>`),
 * not for large lists — use the paginated table for those instead.
 */
export async function fetchAllPages<T>(
  fetchPage: (params: PageRequest) => Promise<PageResult<T>>,
  pageSize: number = 200
): Promise<T[]> {
  const items: T[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchPage({ limit: pageSize, offset });
    items.push(...page.items);
    offset += pageSize;
    if (page.items.length === 0 || items.length >= page.total) break;
  }
  return items;
}
