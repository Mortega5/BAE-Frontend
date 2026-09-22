import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  products: any[] = [];
  page: number = 0;
  page_check: boolean = true;
  total: number = 0;
  keywords: string | undefined = undefined;

  hasState(): boolean {
    return this.products.length > 0;
  }

  save(state: Partial<SearchStateService>) {
    Object.assign(this, state);
  }

  clear() {
    this.products = [];
    this.page = 0;
    this.page_check = true;
    this.total = 0;
    this.keywords = undefined;
  }
}
