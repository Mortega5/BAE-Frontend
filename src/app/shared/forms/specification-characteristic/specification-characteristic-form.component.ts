import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { components } from 'src/app/models/product-catalog';
import { TableColumn } from 'src/app/models/table-column.model';
import { jsonValidator, noWhitespaceValidator } from 'src/app/validators/validators';
import { CharacteristicValueSpecFormComponent, CharValueType } from '../characteristic-value-spec/characteristic-value-spec-form.component';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { TableInputComponent } from '../table-input/table-input.component';
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
  imports: [FormsModule, ReactiveFormsModule, TranslateModule, DynamicFormComponent, CharacteristicValueSpecFormComponent, TableInputComponent],
})
export class SpecificationCharacteristicFormComponent implements OnInit, OnChanges, OnDestroy {
  /** Stable identity of what's being edited — pass the actual characteristic object being
   * edited (or null when adding a new one), NOT its `.id` (that field is optional on the
   * backend schema and may be absent for existing data). This — not the initial* values below
   * — is what ngOnChanges watches to decide whether to (re)load, since initialValues/
   * initialValueType are often bound to expressions (optional chains, `?? []` fallbacks) that
   * can produce a new reference every change-detection pass without the underlying data
   * actually changing. */
  @Input() editingKey: any = null;
  @Input() initialName: string = '';
  @Input() initialDescription: string = '';
  @Input() initialConfigurable: boolean = false;
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

  private readonly truncateValuePipe = new TruncateValuePipe();

  get defaultValue(): CharacteristicValueSpecification | null {
    return this.savedValues.find(v => v.isDefault) ?? null;
  }

  /** table-input emits null when its radio is clicked while already selected; ignore that instead of clearing the default. */
  onDefaultChange(value: CharacteristicValueSpecification | null): void {
    if (!value) return;
    const index = this.savedValues.indexOf(value);
    if (index !== -1) this.setDefault(index);
  }

  get columns(): TableColumn[] {
    const valueColumns: TableColumn[] = (() => {
      switch (this.valueType) {
        case 'string':
          return [{ header: 'CHAR_SPEC._value', getValue: (v: any) => v.value, cellClass: () => 'break-all' }];
        case 'number':
          return [
            { header: 'CHAR_SPEC._value', getValue: (v: any) => v.value, cellClass: () => 'break-all' },
            { header: 'CHAR_SPEC._unit', getValue: (v: any) => v.unitOfMeasure },
          ];
        case 'range':
          return [
            { header: 'CHAR_SPEC._value_from', getValue: (v: any) => v.valueFrom },
            { header: 'CHAR_SPEC._value_to', getValue: (v: any) => v.valueTo },
            { header: 'CHAR_SPEC._unit', getValue: (v: any) => v.unitOfMeasure },
          ];
        case 'boolean':
          return [{ header: 'CHAR_SPEC._value', getValue: (v: any) => v.value ? 'CHAR_SPEC._true' : 'CHAR_SPEC._false' }];
        case 'object':
          return [{
            header: 'CHAR_SPEC._value', getValue: (v: any) => this.truncateValuePipe.transform(v.value),
            cellClass: () => 'font-mono text-xs break-all',
          }];
        default:
          return [];
      }
    })();

    const cols: TableColumn[] = [...valueColumns];
    if (!this.readonly && this.valueType !== 'boolean') {
      cols.push({
        header: '', type: 'actions', width: 'w-24',
        actions: [{
          icon: faXmark, tooltip: '_delete', dataCy: 'removeCharValue',
          buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300',
          onClick: (v: any) => this.removeValue(this.savedValues.indexOf(v)),
        }],
      });
    }
    return cols;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // A parent editing a *different* characteristic while this form is already open
    // (showCreateChar staying true) rebinds these inputs without recreating this
    // component, so ngOnInit alone would never pick up the new values. Watching
    // editingId specifically (instead of the initial* values) avoids re-applying
    // — and clobbering in-progress edits — every time an unrelated change-detection
    // pass happens to produce a new array/object reference for those bindings.
    if (changes['editingKey']) {
      this.applyInitialValue();
    }
  }

  ngOnInit(): void {
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

  private applyInitialValue(): void {
    this.headerForm.patchValue({
      name: this.initialName,
      description: this.initialDescription,
      configurable: this.initialConfigurable,
      valueType: this.initialValueType,
    }, { emitEvent: false });
    this.valueForm = this.buildValueForm();
    this.savedValues = this.initialValues.length > 0
      ? [...this.initialValues]
      : this.initialValueType === 'boolean' ? this.defaultBooleanValues() : [];

    // Emit right away so a consumer pre-filling this form via initialName/initialValues/etc.
    // (edit mode) doesn't have to wait for a user edit before its "save" button enables.
    this.emitFormChange();
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
