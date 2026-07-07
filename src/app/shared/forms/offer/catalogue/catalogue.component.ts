import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { PageRequest, PageResult } from 'src/app/models/pagination.model';
import { TableColumn } from 'src/app/models/table-column.model';
import { lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';
import { ApiServiceService } from "../../../../services/product-service.service";
import { PaginatedTableComponent } from '../../paginated-table/paginated-table.component';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [
    TranslateModule,
    FormsModule,
    PaginatedTableComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CatalogueComponent),
      multi: true
    }
  ],
  templateUrl: './catalogue.component.html',
  styleUrl: './catalogue.component.css'
})

export class CatalogueComponent implements ControlValueAccessor {
  @Input() partyId: any;

  selectedCatalogInternal: any = null;

  catColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-', cellClass: 'break-words' },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus) },
    { header: 'Role', getValue: (item: any) => item.relatedParty?.at(0)?.role ?? '-', width: 'w-28' },
  ];

  constructor(private api: ApiServiceService) {
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => { };
  onTouched: () => void = () => { };

  writeValue(selectedCatalog: any): void {
    this.selectedCatalogInternal = selectedCatalog;
    this.onChange(selectedCatalog);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  fetchCatalogs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.api.getCatalogsByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId);
  }

  onCatalogChange(cat: any): void {
    this.selectedCatalogInternal = cat;
    this.onChange(cat);
    this.onTouched();
  }

}
