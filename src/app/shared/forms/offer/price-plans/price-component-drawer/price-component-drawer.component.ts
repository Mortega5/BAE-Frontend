import {Component, EventEmitter, HostListener, Input, OnInit, Output, ChangeDetectorRef} from '@angular/core';
import {FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl} from '@angular/forms';
import {MarkdownTextareaComponent} from "../../../markdown-textarea/markdown-textarea.component";
import { UsageServiceService } from 'src/app/services/usage-service.service';
import { LocalStorageService } from 'src/app/services/local-storage.service';
import {TranslateModule} from "@ngx-translate/core";
import { initFlowbite } from 'flowbite';
import { certifications } from 'src/app/models/certification-standards.const';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { ContentCardComponent } from 'src/app/shared/content-card/content-card.component';
import { DrawerComponent } from 'src/app/shared/drawer/drawer.component';
import { DropdownPanelComponent } from 'src/app/shared/dropdown-panel/dropdown-panel.component';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { FormField } from 'src/app/models/formFields/form-field.model';

@Component({
  selector: 'app-price-component-drawer',
  standalone: true,
  templateUrl: './price-component-drawer.component.html',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MarkdownTextareaComponent,
    TranslateModule,
    ButtonComponent,
    ContentCardComponent,
    DrawerComponent,
    DropdownPanelComponent,
    DynamicFormComponent
  ],
  styleUrl: './price-component-drawer.component.css'
})
export class PriceComponentDrawerComponent implements OnInit {
  @Input() component: any | null = null;
  @Input() prodChars: any[] | [] = [];
  @Input() profileData: boolean = false;
  @Output() close = new EventEmitter<any | null>();
  @Output() save = new EventEmitter<any>();

  isOpen = false;

  priceComponentForm!: FormGroup;
  readonly priceTypeOptions: { id: string, labelKey: string }[] = [
    { id: 'one time', labelKey: 'CREATE_OFFER._pc_price_type_one_time' },
    { id: 'recurring', labelKey: 'CREATE_OFFER._pc_price_type_recurring' },
    { id: 'recurring-prepaid', labelKey: 'CREATE_OFFER._pc_price_type_recurring_prepaid' },
    { id: 'usage', labelKey: 'CREATE_OFFER._pc_price_type_usage' }
  ];
  readonly recurringPeriodOptions: { id: string, labelKey: string }[] = [
    { id: 'day', labelKey: 'CREATE_OFFER._pc_recurring_daily' },
    { id: 'week', labelKey: 'CREATE_OFFER._pc_recurring_weekly' },
    { id: 'month', labelKey: 'CREATE_OFFER._pc_recurring_monthly' },
    { id: 'year', labelKey: 'CREATE_OFFER._pc_recurring_yearly' }
  ];
  showValueSelect:boolean=false;
  selectedCharacteristic:any=undefined;
  touchedCharCheck:boolean=false;
  selectedCharacteristicVal:any;
  showDiscount:boolean=false;
  filteredChars:any[]=[];
  usageSpecs:any[]=[];
  selectedUsageSpec:any;
  partyId:any='';

  readonly priceFields: FormField[] = [
    {
      type: 'number', name: 'price', label: 'CREATE_OFFER._pc_base_price', required: true, colSpan: 1,
      min: 0.01, max: 1000000000, step: 0.1, placeholder: 'CREATE_OFFER._pc_base_price_placeholder', dataCy: 'price',
      errorMessages: { min: 'FORMS.PRICE_PLAN_COMPONENT._price_positive', max: 'FORMS.PRICE_PLAN_COMPONENT._price_limit' },
    },
    {
      type: 'select', name: 'priceType', label: 'CREATE_OFFER._pc_price_type', required: true, colSpan: 1, dataCy: 'priceType',
      options: this.priceTypeOptions.map(o => ({ value: o.id, label: o.labelKey })),
    },
  ];

  readonly recurringFields: FormField[] = [
    {
      type: 'bubbleSelect', name: 'recurringPeriod', label: 'CREATE_OFFER._pc_recurring_period', dataCy: 'recurringType',
      options: this.recurringPeriodOptions.map(o => ({ value: o.id, label: o.labelKey })),
    },
  ];

  // Rebuilt by refreshUsageFields(): the options depend on the loaded usage specs and on
  // which one is selected, so they can't be a static list like the other field groups.
  usageFields: FormField[] = [];

  readonly discountFields: FormField[] = [
    {
      type: 'number', name: 'discountValue', label: 'CREATE_OFFER._pc_amount', colSpan: 1, min: 0, max: 100,
      placeholder: 'CREATE_OFFER._pc_amount_placeholder', dataCy: 'offerDiscountAmount',
      errorMessages: { min: 'FORMS.PRICE_PLAN_COMPONENT._discount_positive', max: 'FORMS.PRICE_PLAN_COMPONENT._discount_limit' },
    },
    {
      type: 'select', name: 'discountUnit', label: 'CREATE_OFFER._pc_amount_unit', colSpan: 1, dataCy: 'offerDiscountUnit',
      options: [
        { value: 'percentage', label: 'CREATE_OFFER._pc_discount_percentage' },
        { value: 'fixed', label: 'CREATE_OFFER._pc_discount_fixed' },
      ],
    },
    {
      type: 'number', name: 'discountDuration', label: 'CREATE_OFFER._pc_duration', colSpan: 1, min: 1,
      placeholder: 'CREATE_OFFER._pc_duration_placeholder', dataCy: 'offerDiscountDuration',
      errorMessages: { min: 'FORMS.PRICE_PLAN_COMPONENT._duration_positive' },
    },
    {
      type: 'select', name: 'discountDurationUnit', label: 'CREATE_OFFER._pc_duration_unit', colSpan: 1, dataCy: 'offerDiscountDurationUnit',
      options: [
        { value: 'days', label: 'CREATE_OFFER._pc_duration_days' },
        { value: 'weeks', label: 'CREATE_OFFER._pc_duration_weeks' },
        { value: 'months', label: 'CREATE_OFFER._pc_duration_months' },
        { value: 'years', label: 'CREATE_OFFER._pc_duration_years' },
      ],
    },
  ];
  showPopover = false;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private usageService: UsageServiceService,
    private localStorage: LocalStorageService
  ) {}

  ngOnInit() {
    setTimeout(() => {
      this.isOpen = true;
      document.body.style.overflow = 'hidden';
    }, 50);

    // @Input's `= []` default only applies when the binding is omitted entirely —
    // a caller passing an expression that resolves to undefined (e.g. the parent's
    // product spec not being loaded yet) overrides it, so normalize defensively.
    this.prodChars = this.prodChars ?? [];

    for(let i=0;i<this.prodChars.length;i++){
      const isConfigurableWithoutValue = this.prodChars[i].configurable !== false
          && !this.prodChars[i].productSpecCharacteristicValue?.length;

      if (!certifications.some(certification => certification.name === this.prodChars[i].name)
          && !this.prodChars[i].name.startsWith('Compliance:')
          && !this.prodChars[i].name.endsWith(' - enabled')
          && this.prodChars[i].valueType != 'credentialsConfiguration'
          && this.prodChars[i].valueType != 'authorizationPolicy'
          // Nothing predefined to price against — the customer fills this in at order time.
          && !isConfigurableWithoutValue) {

        this.filteredChars.push(this.prodChars[i]);
      }
    }

    this.priceComponentForm = this.fb.group({
      name: ['', Validators.required],
      price:['', [Validators.required, Validators.min(0.01), Validators.max(1000000000)]],
      description: [''],
      priceType: ['one time', Validators.required],
      discountValue: [null, [Validators.min(0), Validators.max(100)]],
      discountUnit: ['percentage'],
      discountDuration: [null, [Validators.min(1)]],
      discountDurationUnit: ['days'],
      recurringPeriod: ['month'],
      usageUnit: [''],
      usageSpecId: [''],
      selectedCharacteristic:[undefined]
    });

    if (this.component) {
      this.priceComponentForm.patchValue(this.component);
      this.cdr.detectChanges();
      console.log('---- Editing the following price component...')
      console.log(this.priceComponentForm.value)
      
      const selectedCharControl = this.priceComponentForm.get('selectedCharacteristic');
      const selectedCharValue = selectedCharControl?.value;
      
      if (Array.isArray(selectedCharValue) && selectedCharValue.length > 0) {
        const pscv = selectedCharValue[0]?.productSpecCharacteristicValue;
      
        if (Array.isArray(pscv) && pscv.length > 0) {
          if ('valueFrom' in pscv[0]) {
            this.showValueSelect = false;
          } else {
            this.showValueSelect = true;
          }
        } else {
          this.showValueSelect = true;
        }
      }
      
      if(this.priceComponentForm.get('discountValue')?.value != null){
        this.showDiscount=true;
      }
      const selectedChar = this.priceComponentForm.get('selectedCharacteristic')?.value?.[0];

      if (selectedChar) {
        console.log(selectedChar)
        this.selectedCharacteristic = selectedChar;
        console.log('selected char')
        console.log(this.selectedCharacteristic)
      }
    }
    // Subscribed after the edit-mode patchValue above, so loading an existing component keeps
    // its stored usageUnit instead of resetting it to the spec's first metric.
    this.priceComponentForm.get('usageSpecId')!.valueChanges.subscribe(id => {
      this.selectedUsageSpec = this.usageSpecs.find(spec => spec.id == id);
      this.priceComponentForm.patchValue({ usageUnit: this.selectedUsageSpec?.specCharacteristic?.[0]?.name ?? '' });
      this.refreshUsageFields();
    });

    this.initPartyInfo();
    this.refreshUsageFields();
    // Only published metrics can be priced; drafts and deleted ones stay out.
    this.usageService.getAllUsageSpecsOfParty(this.partyId, ['Launched']).then(data => {
      this.usageSpecs=data;
      this.selectedUsageSpec = this.usageSpecs.find(spec => spec.id == this.priceComponentForm.get('usageSpecId')?.value);
      this.refreshUsageFields();
    })
  }

  private refreshUsageFields(): void {
    const fields: FormField[] = [
      {
        type: 'select', name: 'usageSpecId', label: 'CREATE_OFFER._pc_usage_spec', colSpan: 1, dataCy: 'usageInput',
        options: [
          { value: '', label: 'CREATE_OFFER._select' },
          ...this.usageSpecs.map(spec => ({ value: spec.id, label: spec.name })),
        ],
      },
    ];
    if (this.selectedUsageSpec) {
      fields.push({
        type: 'select', name: 'usageUnit', label: 'CREATE_OFFER._pc_metric', colSpan: 1, dataCy: 'usageMetric',
        options: (this.selectedUsageSpec.specCharacteristic ?? []).map((metric: any) => ({ value: metric.name, label: metric.name })),
      });
    }
    this.usageFields = fields;
  }


  initPartyInfo(){
    const aux = this.localStorage.getValidLoginInfo();
    if (aux) {
      if(aux.logged_as==aux.id){
        this.partyId = aux.partyId;
      } else {
        let loggedOrg = aux.organizations.find((element: { id: any; }) => element.id == aux.logged_as)
        this.partyId = loggedOrg.partyId
      }
    }
  }

  submitForm() {
    if (this.priceComponentForm.valid) {
      this.save.emit(this.priceComponentForm.value);
      console.log('----------- SAVED PRICE COMP')
      console.log(this.priceComponentForm.value)
      this.closeDrawer();
    }
  }

  changePriceComponentChar(event: any){
    if(event.target.value == ''){
      this.showValueSelect = false;
      return
    }

    let charValue = this.prodChars.find(
      (char: { id: any; }) => char.id === event.target.value
    );

    this.selectedCharacteristic = charValue;
    this.cdr.detectChanges();

    if('valueFrom' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
      // This is a range characteristic, so no value to select
      this.showValueSelect = false;
    } else if('unitOfMeasure' in this.selectedCharacteristic.productSpecCharacteristicValue[0]){
      // This is a number characteristic
      this.selectedCharacteristicVal = this.selectedCharacteristic.productSpecCharacteristicValue[0].value;
      this.showValueSelect = true;
    } else {
      // This is a string characteristic
      this.selectedCharacteristicVal = this.selectedCharacteristic.productSpecCharacteristicValue[0].value;
      this.showValueSelect = true;
    }

    this.priceComponentForm.patchValue({
      selectedCharacteristic: [this.mapChars(this.selectedCharacteristicVal)]
    });
  }

  private mapChars(charValue: any): any {
    console.log(this.selectedCharacteristic)
    const char: any = {
      id: this.selectedCharacteristic.id,
      name: this.selectedCharacteristic.name,
      description: this.selectedCharacteristic.description || '',
      valueType: this.selectedCharacteristic.valueType
    }

    // Add the productSpecCharacteristicValue
    if (this.showValueSelect) {
      // For non-range characteristics (with specific values)
      char.productSpecCharacteristicValue = [this.selectedCharacteristic.productSpecCharacteristicValue.find((opt: any) => {
        return String(opt.value) === String(charValue);
      })];
    } else if (this.selectedCharacteristic.productSpecCharacteristicValue?.[0]) {
      // For range characteristics, include the full range
      char.productSpecCharacteristicValue = [{
        valueFrom: this.selectedCharacteristic.productSpecCharacteristicValue[0].valueFrom,
        valueTo: this.selectedCharacteristic.productSpecCharacteristicValue[0].valueTo,
        isDefault: true
      }];
    }

    return char
  }

  changePriceComponentCharValue(event: any){
    this.selectedCharacteristicVal = event.target.value;
    this.priceComponentForm.patchValue({
      selectedCharacteristic: [this.mapChars(event.target.value)]
    });
  }

  closeDrawer() {
    this.isOpen = false;
    document.body.style.overflow = '';
    // If editing, do nothing; if creating, clear form
    setTimeout(() => this.close.emit(null), 500);
  }

  @HostListener('document:keydown.escape', ['$event'])
  handleEscapeKey(event: KeyboardEvent) {
    event.stopPropagation();  // Prevent closing parent drawer
    this.closeDrawer();
  }

  hasKey(obj: any, key: string): boolean {
    return key in obj;
  }
}
