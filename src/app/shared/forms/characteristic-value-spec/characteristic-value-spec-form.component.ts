import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

export type CharValueType = 'string' | 'number' | 'range' | 'boolean' | 'object';

@Component({
  selector: 'app-characteristic-value-spec-form',
  templateUrl: './characteristic-value-spec-form.component.html',
  standalone: true,
  imports: [DynamicFormComponent],
})
export class CharacteristicValueSpecFormComponent {
  @Input() valueType!: CharValueType;
  @Input() form!: FormGroup;
  @Input() readonly: boolean = false;

  get fields(): FormField[] {
    const ro = this.readonly;
    switch (this.valueType) {
      case 'string':
        return [
          { type: 'string', name: 'value', label: 'CHAR_SPEC._value', required: true, readonly: ro }
        ];
      case 'number':
        return [
          { type: 'number', name: 'value', label: 'CHAR_SPEC._value', required: true, readonly: ro, colSpan: 2 },
          { type: 'string', name: 'unitOfMeasure', label: 'CHAR_SPEC._unit', readonly: ro, colSpan: 1 }
        ];
      case 'range':
        return [
          { type: 'number', name: 'valueFrom', label: 'CHAR_SPEC._value_from', required: true, readonly: ro, colSpan: 1 },
          { type: 'number', name: 'valueTo', label: 'CHAR_SPEC._value_to', required: true, readonly: ro, colSpan: 1 },
          { type: 'string', name: 'unitOfMeasure', label: 'CHAR_SPEC._unit', required: true, readonly: ro, colSpan: 1 }
        ];
      case 'object':
        return [
          { type: 'code', name: 'value', label: 'CHAR_SPEC._value', language: 'json', required: true, readonly: ro, colSpan: 3, minHeight: '140px', lineNumbers: false }
        ];
      default:
        return [];
    }
  }
}
