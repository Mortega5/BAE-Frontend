import {Component, forwardRef, Input, OnInit, OnDestroy, Output, EventEmitter} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  FormsModule,
  NG_VALUE_ACCESSOR,
} from "@angular/forms";
import {DatePipe} from "@angular/common";
import {TranslateModule} from "@ngx-translate/core";
import {ProductSpecServiceService} from "../../../../services/product-spec-service.service";
import {PaginationService} from "../../../../services/pagination.service";
import {environment} from "../../../../../environments/environment";
import { FormChangeState } from "src/app/models/interfaces";
import { Subscription } from "rxjs";
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { TableInputComponent } from '../../table-input/table-input.component';
import { TableColumn } from 'src/app/models/formFields/form-field.model';
import { BADGE_BASE, lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';

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
    LoadingSpinnerComponent,
    FormsModule,
    TableInputComponent,
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

  //PAGE SIZES:
  PROD_SPEC_LIMIT: number = environment.PROD_SPEC_LIMIT;

  prodSpecPage=0;
  prodSpecPageCheck:boolean=false;
  loadingProdSpec:boolean=false;
  loadingProdSpec_more:boolean=false;
  prodSpecs:any[]=[];
  nextProdSpecs:any[]=[];

  protected readonly FormControl = FormControl;

  prodColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-' },
    {
      header: 'Type', width: 'w-28', type: 'badge',
      getValue: (item: any) => item.isBundle ? 'Bundle' : 'Simple',
      cellClass: (item: any) => item.isBundle
        ? `${BADGE_BASE} text-green-500 border-green-500`
        : `${BADGE_BASE} text-blue-600 border-blue-400`,
    },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus) },
    { header: 'Last update', getValue: (item: any) => this.datePipe.transform(item.lastUpdate, 'EEEE, dd/MM/yy, HH:mm') ?? '-', width: 'w-52' },
  ];

  constructor(
    private prodSpecService: ProductSpecServiceService,
    private paginationService: PaginationService,
    private datePipe: DatePipe,
  ) {}

  async ngOnInit() {
    console.log('📝 Initializing form in', this.formType, 'mode');
    this.isEditMode = this.formType === 'update';
    await this.getSellerProdSpecs(false);
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

  async getSellerProdSpecs(next:boolean){
    if(!next){
      this.loadingProdSpec=true;
    }

    let options = {
      "filters": ['Active','Launched'],
      "partyId": this.partyId
    }

    this.paginationService.getItemsPaginated(this.prodSpecPage, this.PROD_SPEC_LIMIT, next, this.prodSpecs,this.nextProdSpecs, options,
      this.prodSpecService.getProdSpecByUser.bind(this.prodSpecService)).then(data => {
        this.prodSpecPageCheck=data.page_check;
        this.prodSpecs=data.items;
        this.nextProdSpecs=data.nextItems;
        this.prodSpecPage=data.page;
        this.loadingProdSpec=false;
        this.loadingProdSpec_more=false;
      })
  }

  async nextProdSpec() {
    await this.getSellerProdSpecs(true);
  }

  onProdSpecChange(prod: ProductSpec | null): void {
    this.selectedProdSpecInternal = prod;
    this.onChange(prod);
    this.onTouched();
    if (this.isEditMode) this.hasBeenModified = true;
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

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

