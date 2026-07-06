import {AfterViewInit, ChangeDetectorRef, Component, forwardRef, Input, OnInit} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {environment} from "../../../../../environments/environment";
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR} from "@angular/forms";
import {PaginationService} from "../../../../services/pagination.service";
import {ApiServiceService} from "../../../../services/product-service.service";
import { LoadingSpinnerComponent } from 'src/app/shared/loading-spinner/loading-spinner.component';
import { TableInputComponent } from '../../table-input/table-input.component';
import { TableColumn } from 'src/app/models/table-column.model';
import { lifecycleStatusClass } from 'src/app/shared/utils/lifecycle-status.utils';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [
    TranslateModule,
    LoadingSpinnerComponent,
    FormsModule,
    TableInputComponent,
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

export class CatalogueComponent implements ControlValueAccessor, OnInit, AfterViewInit {
  @Input() partyId: any;

  //CATALOG INFO:
  CATALOG_LIMIT: number= environment.CATALOG_LIMIT;
  catalogPage=0;
  catalogPageCheck:boolean=false;
  loadingCatalog:boolean=false;
  loadingCatalog_more:boolean=false;
  catalogs:any[]=[];
  nextCatalogs:any[]=[];
  selectedCatalogInternal: any = null;

  catColumns: TableColumn[] = [
    { header: 'Name', getValue: (item: any) => item.name ?? '-', cellClass: 'break-words' },
    { header: 'Status', getValue: (item: any) => item.lifecycleStatus ?? '-', width: 'w-28', type: 'badge', cellClass: (item: any) => lifecycleStatusClass(item.lifecycleStatus) },
    { header: 'Role', getValue: (item: any) => item.relatedParty?.at(0)?.role ?? '-', width: 'w-28' },
  ];

  constructor(
      private api: ApiServiceService,
      private paginationService: PaginationService,
      private cdr: ChangeDetectorRef) {
  }

  // As ControlValueAccessor
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

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

  async ngOnInit() {
    // Si hay valores iniciales en el formulario, los cargamos
    await this.getSellerCatalogs(false);
  }

  ngAfterViewInit() {
    setTimeout(() => this.cdr.detectChanges(), 0);
  }

  async getSellerCatalogs(next:boolean){
    if(next==false){
      this.loadingCatalog=true;
    }

    let options = {
      "keywords": undefined,
      "filters": ['Active','Launched'],
      "partyId": this.partyId
    }

    try {
      const data = await this.paginationService.getItemsPaginated(this.catalogPage, this.CATALOG_LIMIT, next, this.catalogs,this.nextCatalogs, options,
        this.api.getCatalogsByUser.bind(this.api));
      this.catalogPageCheck=data.page_check;
      this.catalogs=data.items;
      this.nextCatalogs=data.nextItems;
      this.catalogPage=data.page;
    } finally {
      this.loadingCatalog=false;
      this.loadingCatalog_more=false;
    }
  }

  async nextCatalog(){
    this.loadingCatalog_more=true;
    await this.getSellerCatalogs(true);
  }

  onCatalogChange(cat: any): void {
    this.selectedCatalogInternal = cat;
    this.onChange(cat);
    this.onTouched();
  }

}
