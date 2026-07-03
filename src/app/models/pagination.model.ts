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
