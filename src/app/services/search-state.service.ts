import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  // AI-search mode state (unchanged shape).
  products: any[] = [];
  page: number = 0;
  page_check: boolean = true;
  total: number = 0;
  keywords: string | undefined = undefined;

  // Standard (non-AI) search mode state.
  selectedCategoryId: string | null = null;
  selectedCatalogId: string | null = null;
  activeCategoryName: string | null = null;
  privateOpen: boolean = true;
  publicPage: number = 1;
  privatePage: number = 1;

  private hasStandardState = false;

  hasState(): boolean {
    return this.products.length > 0 || this.hasStandardState;
  }

  save(state: Partial<SearchStateService>) {
    Object.assign(this, state);
    if (
      state.selectedCategoryId !== undefined ||
      state.selectedCatalogId !== undefined ||
      state.publicPage !== undefined ||
      state.privatePage !== undefined
    ) {
      this.hasStandardState = true;
    }
  }

  clear() {
    this.products = [];
    this.page = 0;
    this.page_check = true;
    this.total = 0;
    this.keywords = undefined;
    this.selectedCategoryId = null;
    this.selectedCatalogId = null;
    this.activeCategoryName = null;
    this.privateOpen = true;
    this.publicPage = 1;
    this.privatePage = 1;
    this.hasStandardState = false;
  }
}
