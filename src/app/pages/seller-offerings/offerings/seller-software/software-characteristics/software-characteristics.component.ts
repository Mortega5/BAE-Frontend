import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { components } from 'src/app/models/software-catalog';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import { PackageDeploymentComponent } from '../../../../../shared/forms/package-deployment/package-deployment';

type Characteristic = components['schemas']['Characteristic'];
type CharType = 'string' | 'number' | 'range' | 'deployment';

const CHAR_TYPE_OPTIONS: { value: CharType; label: string }[] = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'range', label: 'Number range' },
  { value: 'deployment', label: 'Deployment Definition' },
];

interface PendingValue {
  value?: string | number;
  unit?: string;
  from?: number;
  to?: number;
  isDefault?: boolean;
}

@Component({
  selector: 'app-software-characteristics',
  templateUrl: './software-characteristics.component.html',
  styleUrl: './software-characteristics.component.css',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, PackageDeploymentComponent],
})
export class SoftwareCharacteristicsComponent {
  @Input() characteristics: Characteristic[] = [];
  @Output() characteristicsChange = new EventEmitter<Characteristic[]>();

  readonly charTypeOptions = CHAR_TYPE_OPTIONS;

  showAddForm = false;
  charName = '';
  charType: CharType = 'string';

  pendingValues: PendingValue[] = [];
  stringValue = '';
  numberValue = '';
  numberUnit = '';
  fromValue = '';
  toValue = '';
  rangeUnit = '';

  deploymentForm: FormGroup | null = null;

  get canSave(): boolean {
    if (!this.charName.trim()) return false;
    if (this.charType === 'deployment') return this.deploymentForm?.valid ?? false;
    return this.pendingValues.length > 0;
  }

  onTypeChange(type: CharType) {
    this.charType = type;
    this.pendingValues = [];
    this.deploymentForm = null;
    this.clearValueInputs();
    if (type === 'deployment' && !this.charName) {
      this.charName = 'deploymentDefinition';
    }
  }

  onDeploymentFormReady(form: FormGroup) {
    this.deploymentForm = form;
  }

  addStringValue() {
    const v = this.stringValue.trim();
    if (!v) return;
    this.pendingValues.push({ value: v, isDefault: this.pendingValues.length === 0 });
    this.stringValue = '';
  }

  addNumberValue() {
    const v = this.numberValue;
    const u = this.numberUnit.trim();
    if (!v || !u) return;
    this.pendingValues.push({ value: Number(v), unit: u, isDefault: this.pendingValues.length === 0 });
    this.numberValue = '';
    this.numberUnit = '';
  }

  setRangeValue() {
    const f = this.fromValue;
    const t = this.toValue;
    const u = this.rangeUnit.trim();
    if (!f || !t || !u) return;
    this.pendingValues = [{ from: Number(f), to: Number(t), unit: u }];
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
  }

  removePending(idx: number) {
    this.pendingValues.splice(idx, 1);
    if (this.pendingValues.length > 0 && !this.pendingValues.some(v => v.isDefault)) {
      this.pendingValues[0].isDefault = true;
    }
  }

  saveChar() {
    if (!this.canSave) return;

    let value: any;
    if (this.charType === 'deployment') {
      value = this.deploymentForm!.value;
    } else if (this.charType === 'range') {
      const pv = this.pendingValues[0];
      value = { from: pv.from, to: pv.to, unit: pv.unit };
    } else if (this.charType === 'number') {
      value = this.pendingValues.map(pv => ({ amount: pv.value, unit: pv.unit, isDefault: pv.isDefault }));
    } else {
      value = this.pendingValues.length === 1
        ? this.pendingValues[0].value
        : this.pendingValues.map(pv => pv.value);
    }

    const char: any = {
      id: 'urn:ngsi-ld:characteristic:' + uuidv4(),
      name: this.charName.trim(),
      valueType: this.charType,
      ...(this.charType === 'deployment' && { '@schemaLocation': environment.DEPLOYMENT_SCHEMA_LOCATION }),
      value,
    };

    this.characteristics = [...this.characteristics, char];
    this.characteristicsChange.emit(this.characteristics);
    this.resetForm();
  }

  deleteChar(char: Characteristic) {
    this.characteristics = this.characteristics.filter(c => c.id !== char.id);
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

  private resetForm() {
    this.showAddForm = false;
    this.charName = '';
    this.charType = 'string';
    this.pendingValues = [];
    this.deploymentForm = null;
    this.clearValueInputs();
  }

  private clearValueInputs() {
    this.stringValue = '';
    this.numberValue = '';
    this.numberUnit = '';
    this.fromValue = '';
    this.toValue = '';
    this.rangeUnit = '';
  }
}
