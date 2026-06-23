import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { components } from 'src/app/models/product-catalog';
import { jsonValidator, noWhitespaceValidator } from 'src/app/validators/validators';
import { CharacteristicValueSpecFormComponent, CharValueType } from '../characteristic-value-spec/characteristic-value-spec-form.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { TruncateValuePipe } from '../../pipes/truncate-value.pipe';

type CharacteristicValueSpecification = components['schemas']['CharacteristicValueSpecification'];

export interface CharacteristicFormValue {
  name: string;
  description: string;
  configurable: boolean;
  valueType: CharValueType;
  values: CharacteristicValueSpecification[];
}

const ALL_VALUE_TYPE_OPTIONS = [
  { value: 'string', label: 'CHAR_SPEC._type_string' },
  { value: 'number', label: 'CHAR_SPEC._type_number' },
  { value: 'range', label: 'CHAR_SPEC._type_range' },
  { value: 'boolean', label: 'CHAR_SPEC._type_boolean' },
  { value: 'object', label: 'CHAR_SPEC._type_object' },
];

@Component({
  selector: 'app-specification-characteristic-form',
  templateUrl: './specification-characteristic-form.component.html',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, DynamicFormComponent, CharacteristicValueSpecFormComponent, TruncateValuePipe],
})
export class SpecificationCharacteristicFormComponent implements OnInit, OnDestroy {
  @Input() initialValueType: CharValueType = 'string';
  @Input() initialValues: CharacteristicValueSpecification[] = [];
  @Input() readonly: boolean = false;
  @Input() supportedTypes: CharValueType[] = [];
  @Input() maxObjectChars: number = 80
  @Output() formChange = new EventEmitter<CharacteristicFormValue>();

  private destroy$ = new Subject<void>();

  headerForm = new FormGroup({
    name: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), noWhitespaceValidator] }),
    description: new FormControl<string>('', { nonNullable: true }),
    configurable: new FormControl<boolean>(false, { nonNullable: true }),
    valueType: new FormControl<CharValueType>('string', { nonNullable: true })
  });

  valueForm: FormGroup = this.buildValueForm();
  savedValues: CharacteristicValueSpecification[] = [];

  private get valueTypeOptions() {
    const filtered = this.supportedTypes.length
      ? ALL_VALUE_TYPE_OPTIONS.filter(o => this.supportedTypes.includes(o.value as CharValueType))
      : ALL_VALUE_TYPE_OPTIONS;
    return filtered;
  }

  get headerFields(): FormField[] {
    const ro = this.readonly;
    return [
      { type: 'string', name: 'name', label: 'CHAR_SPEC._char_name', required: true, maxLength: 100, colSpan: 3, readonly: ro, dataCy: 'charName' },
      { type: 'select', name: 'valueType', label: 'CHAR_SPEC._value_type', options: this.valueTypeOptions, readonly: ro, colSpan: 2, dataCy: 'charType' },
      { type: 'boolean', name: 'configurable', label: 'CHAR_SPEC._configurable', readonly: ro, colSpan: 1 },
      { type: 'textarea', name: 'description', label: 'CHAR_SPEC._description', readonly: ro, dataCy: 'charDescription' },
    ];
  }

  get valueType(): CharValueType {
    return this.headerForm.get('valueType')!.value;
  }

  get canAdd(): boolean {
    return this.valueForm.valid;
  }

  ngOnInit(): void {
    this.headerForm.get('valueType')!.setValue(this.initialValueType, { emitEvent: false });
    this.valueForm = this.buildValueForm();
    this.savedValues = this.initialValues.length > 0
      ? [...this.initialValues]
      : this.initialValueType === 'boolean' ? this.defaultBooleanValues() : [];

    this.headerForm.get('valueType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.savedValues = this.valueType === 'boolean' ? this.defaultBooleanValues() : [];
        this.valueForm = this.buildValueForm();
        this.emitFormChange();
      });

    this.headerForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.emitFormChange());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addValue(): void {
    if (!this.canAdd) return;
    const raw = { ...this.valueForm.value, isDefault: this.savedValues.length === 0 };
    const newValue: CharacteristicValueSpecification = this.valueType === 'object'
      ? { ...raw, value: JSON.parse(raw.value) }
      : raw;
    this.savedValues = [...this.savedValues, newValue];
    this.valueForm = this.buildValueForm();
    this.emitFormChange();
  }

  removeValue(index: number): void {
    this.savedValues = this.savedValues.filter((_, i) => i !== index);
    this.emitFormChange();
  }

  setDefault(index: number): void {
    this.savedValues = this.savedValues.map((v, i) => ({ ...v, isDefault: i === index }));
    this.emitFormChange();
  }

  private defaultBooleanValues(): CharacteristicValueSpecification[] {
    return [
      { isDefault: true, value: true as any },
      { isDefault: false, value: false as any },
    ];
  }

  private emitFormChange(): void {
    this.formChange.emit({
      name: this.headerForm.get('name')!.value,
      description: this.headerForm.get('description')!.value,
      configurable: this.headerForm.get('configurable')!.value,
      valueType: this.valueType,
      values: this.savedValues
    });
  }

  private buildValueForm(): FormGroup {
    switch (this.valueType) {
      case 'string':
        return new FormGroup({
          isDefault: new FormControl<boolean>(false, { nonNullable: true }),
          value: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
        });
      case 'number':
        return new FormGroup({
          isDefault: new FormControl<boolean>(false, { nonNullable: true }),
          value: new FormControl<number | null>(null, { validators: [Validators.required] }),
          unitOfMeasure: new FormControl<string>('', { nonNullable: true })
        });
      case 'range':
        return new FormGroup({
          isDefault: new FormControl<boolean>(false, { nonNullable: true }),
          valueFrom: new FormControl<number | null>(null, { validators: [Validators.required] }),
          valueTo: new FormControl<number | null>(null, { validators: [Validators.required] }),
          unitOfMeasure: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] })
        });
      case 'boolean':
        return new FormGroup({
          isDefault: new FormControl<boolean>(false, { nonNullable: true }),
          value: new FormControl<boolean>(false, { nonNullable: true })
        });
      case 'object':
        return new FormGroup({
          isDefault: new FormControl<boolean>(false, { nonNullable: true }),
          value: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, jsonValidator] })
        });
    }
  }
}
