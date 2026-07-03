import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TableColumn } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-paginated-table',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, TableInputComponent, LoadingSpinnerComponent],
  templateUrl: './paginated-table.component.html',
})
export class PaginatedTableComponent<T = any> implements OnInit, OnChanges {
  @Input() columns: TableColumn<T>[] = [];
  @Input() fetchPage!: (params: PageRequest) => Promise<PageResult<T>>;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];
  @Input() pageSizeSelected: number = 0;
  @Input() selectable: boolean = false;
  @Input() clickable: boolean = false;
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() selected: any;
  @Output() selectedChange = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<T>();

  items: T[] = [];
  total: number = 0;
  currentPage: number = 1;
  loading: boolean = false;
  error: boolean = false;

  private _pageSize?: number;

  get pageSize(): number {
    if (this._pageSize === undefined) {
      this._pageSize = this.resolveInitialPageSize();
    }
    return this._pageSize;
  }

  set pageSize(value: number) {
    this._pageSize = value;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  get offset(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get rangeStart(): number {
    return this.total === 0 ? 0 : this.offset + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.offset + this.pageSize, this.total);
  }

  ngOnInit(): void {
    this.loadPage();
  }

  private resolveInitialPageSize(): number {
    if (this.pageSizeSelected < 0 || this.pageSizeSelected >= this.pageSizeOptions.length) {
      console.warn(`PaginatedTableComponent: pageSizeSelected (${this.pageSizeSelected}) is out of bounds for pageSizeOptions (length ${this.pageSizeOptions.length}). Falling back to the first option.`);
      return this.pageSizeOptions[0];
    }
    return this.pageSizeOptions[this.pageSizeSelected];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fetchPage'] && !changes['fetchPage'].firstChange) {
      this.currentPage = 1;
      this.loadPage();
    }
  }

  async loadPage(): Promise<void> {
    this.loading = true;
    this.error = false;
    try {
      const result = await this.fetchPage({ limit: this.pageSize, offset: this.offset });
      this.items = result.items;
      this.total = result.total;

      if (this.offset >= this.total && this.currentPage > 1) {
        this.currentPage = 1;
        await this.loadPage();
        return;
      }
    } catch (err) {
      console.error('Error loading page:', err);
      this.error = true;
      this.items = [];
    } finally {
      this.loading = false;
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.loadPage();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size);
    this.currentPage = 1;
    this.loadPage();
  }

  onSelectionChange(value: any): void {
    this.selected = value;
    this.selectedChange.emit(value);
  }

  onRowClick(item: T): void {
    this.rowClick.emit(item);
  }

  refresh(resetToFirstPage: boolean = false): void {
    if (resetToFirstPage) {
      this.currentPage = 1;
    }
    this.loadPage();
  }
}
