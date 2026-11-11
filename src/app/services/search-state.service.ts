import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SearchStateService {
  keywords: string | undefined = undefined;
  selectedCategoryId: string | null = null;
  selectedCatalogId: string | null = null;
  activeCategoryName: string | null = null;
  offerTab: 'public' | 'private' = 'public';
  publicPage: number = 1;
  privatePage: number = 1;

  private hasStandardState = false;

  hasState(): boolean {
    return this.hasStandardState;
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
    this.keywords = undefined;
    this.selectedCategoryId = null;
    this.selectedCatalogId = null;
    this.activeCategoryName = null;
    this.offerTab = 'public';
    this.publicPage = 1;
    this.privatePage = 1;
    this.hasStandardState = false;
  }
}
