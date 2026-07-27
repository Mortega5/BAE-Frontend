import { DatePipe } from "@angular/common";
import { Component, EventEmitter, forwardRef, Input, OnDestroy, OnInit, Output } from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from "@angular/forms";
import { TranslateModule } from "@ngx-translate/core";
import { Subscription } from "rxjs";
import { FormChangeState } from "src/app/models/interfaces";
import { PageRequest, PageResult } from "src/app/models/pagination.model";
import { TableColumn, TableSort } from 'src/app/models/table-column.model';
import { BADGE_BASE, lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';
import { ProductSpecServiceService } from "../../../../services/product-spec-service.service";
import { PaginatedTableComponent } from '../../paginated-table/paginated-table.component';
import { TableInputComponent } from '../../table-input/table-input.component';

interface ProductSpec {
  id: string;
  name: string;
  description: string;
  status: string;
  isBundle: boolean;
  lastUpdate: string | null;
}

@Component({
  selector: 'app-prod-spec-form',
  standalone: true,
  imports: [
    DatePipe,
    TranslateModule,
    FormsModule,
    TableInputComponent,
    PaginatedTableComponent,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ProdSpecComponent),
      multi: true
    },
    DatePipe,
  ],
  templateUrl: './prod-spec.component.html',
  styleUrl: './prod-spec.component.css'
})
export class ProdSpecComponent implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() formType!: string;
  @Input() data: any;
  @Input() partyId: any;
  @Input() bundleChecked: boolean = false;
  @Output() formChange = new EventEmitter<FormChangeState>();

  selectedProdSpecInternal: ProductSpec | null = null;
  private originalValue: ProductSpec | null = null;
  private formSubscription: Subscription | null = null;
  private hasBeenModified: boolean = false;
  isEditMode: boolean = false;

  protected readonly FormControl = FormControl;

  defaultSort: TableSort = { key: 'lastUpdate', direction: 'desc' };

  prodColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-', sortKey: 'name' },
    { header: 'Product Type', getValue: (item: any) => item['@type'] ?? 'ProductSpecification', hideOnMobile: true },
    {
      header: 'Type', width: 'w-28', type: 'badge',
      getValue: (item: any) => item.isBundle ? 'Bundle' : 'Simple',
      cellClass: (item: any) => item.isBundle
        ? `${BADGE_BASE} text-green-500 border-green-500`
        : `${BADGE_BASE} text-blue-600 border-blue-400`,
    },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus), sortKey: 'lifecycleStatus' },
    { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52', sortKey: 'lastUpdate' },
  ];

  constructor(
    private prodSpecService: ProductSpecServiceService,
    private datePipe: DatePipe,
  ) { }

  ngOnInit() {
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';
  }

  ngOnDestroy() {
    console.log('🗑️ Destroying ProdSpecComponent');
    if (this.formSubscription) {
      this.formSubscription.unsubscribe();
    }

    // Solo emitir cambios si estamos en modo edición y hay cambios reales
    if (this.isEditMode && this.hasBeenModified) {
      const dirtyFields = this.getDirtyFields();
      if (dirtyFields.length > 0) {
        const changeState: FormChangeState = {
          subformType: 'productSpecification',
          isDirty: true,
          dirtyFields,
          originalValue: this.originalValue,
          currentValue: this.selectedProdSpecInternal
        };

        console.log('🚀 Emitting final change state:', changeState);
        this.formChange.emit(changeState);
      } else {
        console.log('📝 No real changes detected, skipping emission');
      }
    } else if (!this.isEditMode) {
      console.log('📝 Not in edit mode, skipping change detection');
    }
  }

  fetchProdSpecs = (params: PageRequest): Promise<PageResult<any>> => {
    return this.prodSpecService.getProdSpecByUserPaged(params, undefined, ['Active', 'Launched'], this.partyId, undefined);
  }

  onProdSpecChange(prod: ProductSpec | null): void {
    this.selectedProdSpecInternal = prod;
    this.onChange(prod);
    this.onTouched();
    if (this.isEditMode) this.hasBeenModified = true;
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => { };
  onTouched: () => void = () => { };

  writeValue(prodSpec: ProductSpec): void {
    console.log('📝 Writing value:', prodSpec);
    this.selectedProdSpecInternal = prodSpec;
    if (this.isEditMode) {
      this.originalValue = prodSpec;
      this.hasBeenModified = false;
    }
    this.onChange(prodSpec);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  private getDirtyFields(): string[] {
    if (!this.selectedProdSpecInternal || !this.originalValue) {
      return [];
    }

    return Object.keys(this.selectedProdSpecInternal).filter(key => {
      const currentValue = (this.selectedProdSpecInternal as any)[key];
      const originalValue = (this.originalValue as any)[key];
      return JSON.stringify(currentValue) !== JSON.stringify(originalValue);
    });
  }
}

