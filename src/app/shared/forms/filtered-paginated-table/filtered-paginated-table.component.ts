import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { FilterBarComponent } from 'src/app/shared/forms/filter-bar/filter-bar.component';
import { PaginatedTableComponent } from 'src/app/shared/forms/paginated-table/paginated-table.component';

@Component({
  selector: 'app-filtered-paginated-table',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, PaginatedTableComponent],
  templateUrl: './filtered-paginated-table.component.html',
})
export class FilteredPaginatedTableComponent<T = any> {
  // Filter-bar inputs
  @Input() filters: FormField[] = [];
  @Input() filterColumns: number = 3;
  @Input() debounceMs: number = 300;

  // Paginated-table inputs
  @Input() columns: TableColumn<T>[] = [];
  @Input() fetchPage!: (params: PageRequest, filters: Record<string, any>) => Promise<PageResult<T>>;
  @Input() pageSizeOptions: number[] = [10, 20, 50];
  @Input() pageSizeSelected: number = 0;
  @Input() selectable: boolean = false;
  @Input() clickable: boolean = false;
  @Input() multiple: boolean = false;
  @Input() readonly: boolean = false;
  @Input() selected: any;
  @Output() selectedChange = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<T>();

  @ViewChild(PaginatedTableComponent) private paginatedTable?: PaginatedTableComponent<T>;

  currentFilters: Record<string, any> = {};

  innerFetchPage = (params: PageRequest): Promise<PageResult<T>> => {
    return this.fetchPage(params, this.currentFilters);
  }

  onFiltersChange(filters: Record<string, any>): void {
    this.currentFilters = filters;
    this.paginatedTable?.refresh(true);
  }

  onSelectedChange(value: any): void {
    this.selected = value;
    this.selectedChange.emit(value);
  }

  refresh(resetToFirstPage: boolean = false): void {
    this.paginatedTable?.refresh(resetToFirstPage);
  }
}
