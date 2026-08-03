import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { faXmark } from '@fortawesome/pro-solid-svg-icons';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { components } from 'src/app/models/software-catalog';
import { TableColumn } from 'src/app/models/table-column.model';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { TableInputComponent } from 'src/app/shared/forms/table-input/table-input.component';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { PackageDeploymentComponent } from '../../../../../shared/forms/package-deployment/package-deployment';

type Characteristic = components['schemas']['Characteristic'];
type CharType = 'string' | 'number' | 'range' | 'deployment';

const CHAR_TYPE_OPTIONS: { value: CharType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'range', label: 'Number range' },
  { value: 'deployment', label: 'Deployment Definition' },
];

@Component({
  selector: 'app-software-characteristics',
  templateUrl: './software-characteristics.component.html',
  styleUrl: './software-characteristics.component.css',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, PackageDeploymentComponent, DynamicFormComponent, TableInputComponent],
})
export class SoftwareCharacteristicsComponent implements OnInit, OnDestroy {
  @Input() characteristics: Characteristic[] = [];
  @Input() readonly: boolean = false;
  @Output() characteristicsChange = new EventEmitter<Characteristic[]>();

  showAddForm = false;
  editingIndex: number | null = null;

  charForm = new FormGroup({
    charName: new FormControl<string>('', { nonNullable: true }),
    charType: new FormControl<CharType>('string', { nonNullable: true }),
    value: new FormControl<any>(null),
  });

  deploymentForm: FormGroup | null = null;

  private destroy$ = new Subject<void>();

  readonly headerFields: FormField[] = [
    { type: 'string', name: 'charName', label: 'CREATE_SOFTWARE._name', required: true, maxLength: 100, colSpan: 1 },
    { type: 'select', name: 'charType', label: 'CREATE_SOFTWARE._type', options: CHAR_TYPE_OPTIONS, colSpan: 1 },
  ];

  get characteristicColumns(): TableColumn[] {
    const columns: TableColumn[] = [
      { header: 'CREATE_SOFTWARE._name', getValue: (c: any) => c.name, cellClass: () => 'break-words', width: 'w-1/3' },
      {
        header: 'CREATE_SOFTWARE._type', type: 'badge', width: 'w-28',
        getValue: (c: any) => c.valueType,
        cellClass: () => 'text-xs font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-secondary-200 text-gray-700 dark:text-gray-200',
      },
      {
        header: 'CREATE_SOFTWARE._values', getValue: (c: any) => this.displayValue(c),
        cellClass: () => 'break-all text-gray-500 dark:text-gray-300',
      },
    ];
    if (!this.readonly) {
      columns.push({
        header: 'CREATE_SOFTWARE._actions', type: 'actions', width: 'w-24',
        actions: [
          {
            icon: faXmark, tooltip: 'CREATE_SOFTWARE._delete', dataCy: 'deleteChar',
            buttonClass: '!w-7 !h-7 bg-red-500 hover:bg-red-600 focus:ring-red-300 text-white',
            onClick: (c: any) => this.deleteChar(this.characteristics.findIndex(item => item.id === c.id)),
          },
        ],
      });
    }
    return columns;
  }

  get charType(): CharType {
    return this.charForm.get('charType')!.value;
  }

  get editingDeploymentValue(): any {
    return this.editingIndex != null ? this.characteristics[this.editingIndex]?.value : null;
  }

  get valueFields(): FormField[] {
    switch (this.charType) {
      case 'string': return [{ type: 'multiValueString', name: 'value', label: 'CREATE_SOFTWARE._values', addLabel: 'CREATE_SOFTWARE._add_char_value', placeholder: 'CREATE_SOFTWARE._add_value' }];
      case 'number': return [{ type: 'unitValue', name: 'value', label: 'CREATE_SOFTWARE._values', addLabel: 'CREATE_SOFTWARE._add_char_value', valuePlaceholder: 'CREATE_SOFTWARE._amount', unitPlaceholder: 'CREATE_SOFTWARE._unit' }];
      case 'range': return [{ type: 'rangeValue', name: 'value', label: 'CREATE_SOFTWARE._range', setLabel: 'CREATE_SOFTWARE._add_value', fromPlaceholder: 'CREATE_SOFTWARE._from', toPlaceholder: 'CREATE_SOFTWARE._to', unitPlaceholder: 'CREATE_SOFTWARE._unit' }];
      default: return [];
    }
  }

  get canSave(): boolean {
    if (!this.charForm.get('charName')!.value.trim()) return false;
    if (this.charType === 'deployment') return this.deploymentForm?.valid ?? false;
    const v = this.charForm.get('value')?.value;
    if (this.charType === 'range') return v != null;
    return Array.isArray(v) && v.length > 0;
  }

  ngOnInit() {
    this.charForm.get('charType')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.charForm.patchValue({ value: null });
        this.deploymentForm = null;
        if (type === 'deployment' && !this.charForm.get('charName')!.value) {
          this.charForm.patchValue({ charName: 'deploymentDefinition' });
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDeploymentFormReady(form: FormGroup) {
    this.deploymentForm = form;
  }

  saveChar() {
    if (!this.canSave) return;

    const formValue = this.charForm.get('value')?.value;
    let value: any;
    if (this.charType === 'deployment') {
      value = this.deploymentForm!.value;
    } else if (this.charType === 'range') {
      value = formValue;
    } else if (this.charType === 'number') {
      value = (formValue as { value: number; unit: string }[])
        .map((pv, i) => ({ amount: pv.value, unit: pv.unit, isDefault: i === 0 }));
    } else {
      value = formValue.length === 1 ? formValue[0] : formValue;
    }

    const editing = this.editingIndex != null ? this.characteristics[this.editingIndex] : null;
    const char: any = {
      id: editing?.id ?? 'urn:ngsi-ld:characteristic:' + uuidv4(),
      name: this.charForm.get('charName')!.value.trim(),
      valueType: this.charType,
      ...(this.charType === 'deployment' && { '@schemaLocation': environment.DEPLOYMENT_SCHEMA_LOCATION }),
      value,
    };

    if (this.editingIndex != null) {
      const updated = [...this.characteristics];
      updated[this.editingIndex] = char;
      this.characteristics = updated;
    } else {
      this.characteristics = [...this.characteristics, char];
    }
    this.characteristicsChange.emit(this.characteristics);
    this.resetForm();
  }

  /** Loads an existing characteristic into the add/edit form so its content can be changed. */
  onRowClick(char: any): void {
    if (this.readonly) return;
    const index = this.characteristics.findIndex(c => c.id === char.id);
    if (index === -1) return;

    this.editingIndex = index;
    this.showAddForm = true;
    this.charForm.patchValue({ charName: char.name, charType: char.valueType });
    if (char.valueType !== 'deployment') {
      this.charForm.patchValue({ value: this.reverseValue(char) });
    }
  }

  private reverseValue(char: any): any {
    const v = char.value;
    switch (char.valueType) {
      case 'string':
        return Array.isArray(v) ? v : v != null ? [v] : [];
      case 'number':
        return Array.isArray(v) ? v.map((entry: any) => ({ value: entry.amount, unit: entry.unit })) : [];
      case 'range':
        return v ?? null;
      default:
        return null;
    }
  }

  deleteChar(index: number) {
    if (this.editingIndex === index) this.resetForm();
    const updated = [...this.characteristics];
    updated.splice(index, 1);
    this.characteristics = updated;
    this.characteristicsChange.emit(this.characteristics);
  }

  displayValue(char: any): string {
    const type = char.valueType as CharType;
    const v = char.value;
    if (v == null) return '';
    const isDeployment = type === 'deployment' || char['@schemaLocation'] != null;
    if (isDeployment) {
      const deployObj = Array.isArray(v) ? v[0] : v;
      return `Deployment (${deployObj?.type ?? '?'})`;
    }
    if (type === 'range') {
      const rangeObj = Array.isArray(v) ? v[0] : v;
      return `${rangeObj?.from} – ${rangeObj?.to} (${rangeObj?.unit})`;
    }
    if (type === 'number') {
      const arr = Array.isArray(v) ? v : [v];
      return arr.map((i: any) => `${i.amount} (${i.unit})`).join(', ');
    }
    if (Array.isArray(v)) return v.map((i: any) => (typeof i === 'object' ? JSON.stringify(i) : String(i))).join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  resetForm() {
    this.showAddForm = false;
    this.editingIndex = null;
    this.charForm.reset({ charName: '', charType: 'string', value: null });
    this.deploymentForm = null;
  }
}
