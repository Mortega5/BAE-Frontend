import { NgClass } from "@angular/common";
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MarkdownComponent } from "ngx-markdown";
import { FormField } from 'src/app/models/formFields/form-field.model';
import { components } from "../../models/product-catalog";
import { DynamicFormComponent } from '../forms/dynamic-form/dynamic-form.component';

type ProductSpecificationCharacteristic = components["schemas"]["ProductSpecificationCharacteristic"];
type CharacteristicValue = NonNullable<ProductSpecificationCharacteristic["productSpecCharacteristicValue"]>[number];

/** What kind of widget this characteristic renders as, decided once in ngOnInit
 * from its predefined values (if any) — everything below is driven by `fields` +
 * `formGroup`, rendered through a single <app-dynamic-form>. */
type Mode = 'boolean' | 'slider' | 'select' | 'free';

@Component({
  selector: 'app-characteristic',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    MarkdownComponent,
    DynamicFormComponent,
  ],
  templateUrl: './characteristic.component.html',
  styleUrl: './characteristic.component.css'
})
export class CharacteristicComponent implements OnInit, OnChanges {
  @Input() characteristic!: ProductSpecificationCharacteristic;
  @Input() readOnly: boolean = false;
  @Input() isDisabled: boolean = false;
  @Input() canBeDisabled: boolean = false;
  @Output() valueChange = new EventEmitter<any>();

  /** Holds the scalar value for boolean/slider/select and for the 'string'/'object'
   * free-input case — always the FormGroup's 'value' control, so `{{ control.value }}`
   * keeps working for the read-only display regardless of mode. */
  control = new FormControl();
  fields: FormField[] = [];
  formGroup: FormGroup = new FormGroup({ value: this.control });

  private mode: Mode = 'free';
  private initialized = false;

  ngOnInit(): void {
    this.initialize();
  }

  /** Angular can reuse this same component instance for a *different*
   * characteristic (e.g. a `@for` loop tracking by id, where price-plan
   * constraints swap which values that id carries) — ngOnInit alone would
   * never pick that up, so re-run the whole setup whenever the characteristic
   * itself (or its readOnly-ness) changes after the first pass. */
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.initialized) return;
    if (changes['characteristic'] || changes['readOnly']) {
      this.initialize();
    }
  }

  private initialize(): void {
    this.initialized = true;
    this.mode = this.resolveMode();
    switch (this.mode) {
      case 'boolean':
        this.setupBoolean();
        break;
      case 'slider':
        this.setupSlider();
        break;
      case 'select':
        this.setupSelect();
        break;
      default:
        this.setupFreeInput();
    }
  }

  private get values(): CharacteristicValue[] {
    return this.characteristic.productSpecCharacteristicValue ?? [];
  }

  private resolveMode(): Mode {
    if (this.isBooleanValues()) return 'boolean';
    if (this.isRangeValues()) return 'slider';
    if (this.values.length > 0) return 'select';
    return 'free';
  }

  private isBooleanValues(): boolean {
    return this.values.length > 0 && this.values.every((val) => typeof val.value === 'boolean');
  }

  private isRangeValues(): boolean {
    return this.values.some((val) => val.valueFrom !== undefined && val.valueTo !== undefined);
  }

  private defaultValue(): any {
    const defaultVal = this.values.find((val) => val.isDefault);
    return defaultVal?.value ?? defaultVal?.valueFrom;
  }

  private setupBoolean(): void {
    this.control = new FormControl({ value: this.defaultValue() ?? false, disabled: this.readOnly });
    this.formGroup = new FormGroup({ value: this.control });
    this.fields = [{ type: 'boolean', name: 'value', label: '', dataCy: 'characteristicBoolean' }];
    this.control.valueChanges.subscribe(() => this.onControlCommit());
  }

  private setupSlider(): void {
    const range = this.values.find((val) => val.valueFrom !== undefined && val.valueTo !== undefined)!;
    this.control = new FormControl({ value: this.defaultValue() ?? range.valueFrom, disabled: this.readOnly });
    this.formGroup = new FormGroup({ value: this.control });
    this.fields = [{
      type: 'slider', name: 'value', label: '', min: range.valueFrom!, max: range.valueTo!,
      unit: range.unitOfMeasure, dataCy: 'characteristicSlider',
    }];
    this.control.valueChanges.subscribe(() => this.onControlCommit());
  }

  private setupSelect(): void {
    this.control = new FormControl({ value: this.defaultValue() ?? null, disabled: this.readOnly });
    this.formGroup = new FormGroup({ value: this.control });
    const unit = this.getUnit();
    this.fields = [{
      type: 'select', name: 'value', label: '', dataCy: 'characteristicSelect',
      options: this.values.map((val) => {
        const displayValue = this.characteristic.valueType === 'object' ? JSON.stringify(val.value) : String(val.value);
        return { value: val.value, label: unit ? `${displayValue} ${unit}` : displayValue };
      }),
    }];
    this.control.valueChanges.subscribe(() => this.onControlCommit());
  }

  /** No predefined values: the customer fills this in themselves. A 'range' with
   * no bounds has nothing to slide within, so it gets its own valueFrom/valueTo
   * pair instead of the bounded slider — the customer defines the bounds. */
  private setupFreeInput(): void {
    const required = [Validators.required];
    switch (this.characteristic.valueType) {
      case 'number':
        this.formGroup = new FormGroup({
          value: this.control,
          unitOfMeasure: new FormControl<string>('', { nonNullable: true, validators: required }),
        });
        this.fields = [
          { type: 'number', name: 'value', label: 'CHAR_SPEC._value', required: true, colSpan: 2, dataCy: 'characteristicFreeValue' },
          { type: 'string', name: 'unitOfMeasure', label: 'CHAR_SPEC._unit', required: true, colSpan: 1, dataCy: 'characteristicFreeUnit' },
        ];
        break;
      case 'range':
        this.formGroup = new FormGroup({
          valueFrom: new FormControl<number | null>(null, { validators: required }),
          valueTo: new FormControl<number | null>(null, { validators: required }),
          unitOfMeasure: new FormControl<string>('', { nonNullable: true, validators: required }),
        });
        this.fields = [
          { type: 'number', name: 'valueFrom', label: 'CHAR_SPEC._value_from', required: true, colSpan: 1, dataCy: 'characteristicFreeFrom' },
          { type: 'number', name: 'valueTo', label: 'CHAR_SPEC._value_to', required: true, colSpan: 1, dataCy: 'characteristicFreeTo' },
          { type: 'string', name: 'unitOfMeasure', label: 'CHAR_SPEC._unit', required: true, colSpan: 1, dataCy: 'characteristicFreeUnit' },
        ];
        break;
      case 'object':
        this.formGroup = new FormGroup({ value: this.control });
        this.fields = [
          { type: 'code', name: 'value', label: 'CHAR_SPEC._value', language: 'json', required: true, dataCy: 'characteristicFreeValue' },
        ];
        break;
      default:
        this.formGroup = new FormGroup({ value: this.control });
        this.fields = [
          { type: 'string', name: 'value', label: 'CHAR_SPEC._value', required: true, dataCy: 'characteristicFreeValue' },
        ];
    }
    this.formGroup.valueChanges.subscribe(() => this.onFreeInputCommit());
  }

  onControlCommit(): void {
    if (this.readOnly) {
      return;
    }

    this.valueChange.emit({
      characteristicId: this.characteristic.id,
      selectedValue: this.control.value,
    });
  }

  private onFreeInputCommit(): void {
    if (this.readOnly) {
      return;
    }

    // The unit (when present) travels nested inside selectedValue — not as a sibling
    // on the event — so it's part of what the characteristics FormGroup control (in
    // price-plan-drawer) actually validates as a whole.
    const raw = this.formGroup.value;
    let selectedValue: any;
    if ('valueFrom' in raw) {
      selectedValue = { valueFrom: raw.valueFrom, valueTo: raw.valueTo, unitOfMeasure: raw.unitOfMeasure };
    } else if ('unitOfMeasure' in raw) {
      selectedValue = { value: raw.value, unitOfMeasure: raw.unitOfMeasure };
    } else {
      selectedValue = raw.value;
    }

    this.valueChange.emit({
      characteristicId: this.characteristic.id,
      selectedValue,
    });
  }

  getUnit(): string | undefined {
    return this.characteristic.productSpecCharacteristicValue?.[0]?.unitOfMeasure;
  }

  hasLongWord(str: string | undefined, threshold = 20) {
    if (str) {
      return str.split(/\s+/).some(word => word.length > threshold);
    } else {
      return false;
    }
  }
}
