import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

export type CharValueType = 'string' | 'number' | 'range' | 'boolean' | 'object' | 'credentialsConfiguration' | 'authorizationPolicy';

/** Value types whose data is JSON-shaped and edited with the same code-editor field as 'object'. */
export const JSON_VALUE_TYPES: CharValueType[] = ['object', 'credentialsConfiguration', 'authorizationPolicy'];

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
  /** Whether the owning characteristic is configurable — when it is, its value gets
   * filled in downstream, so the value field(s) below aren't mandatory here either.
   * Purely cosmetic (the "*" marker): the actual required-ness lives on `form`'s own
   * validators, set by the caller. */
  @Input() configurable: boolean = false;

  get fields(): FormField[] {
    const ro = this.readonly;
    const valueRequired = !this.configurable;
    switch (this.valueType) {
      case 'string':
        return [
          { type: 'string', name: 'value', label: 'CHAR_SPEC._value', required: valueRequired, readonly: ro, dataCy: 'charStringValue', placeholder: 'CHAR_SPEC._value_placeholder' }
        ];
      case 'number':
        return [
          { type: 'number', name: 'value', label: 'CHAR_SPEC._value', required: valueRequired, readonly: ro, colSpan: 2, dataCy: 'charNumberValue', placeholder: 'CHAR_SPEC._value_placeholder' },
          { type: 'string', name: 'unitOfMeasure', label: 'CHAR_SPEC._unit', required: valueRequired, readonly: ro, colSpan: 1, dataCy: 'charNumberUnit', placeholder: 'CHAR_SPEC._unit_placeholder' }
        ];
      case 'range':
        return [
          { type: 'number', name: 'valueFrom', label: 'CHAR_SPEC._value_from', required: valueRequired, readonly: ro, colSpan: 1, dataCy: 'charRangeFrom', placeholder: 'CHAR_SPEC._value_from_placeholder' },
          { type: 'number', name: 'valueTo', label: 'CHAR_SPEC._value_to', required: valueRequired, readonly: ro, colSpan: 1, dataCy: 'charRangeTo', placeholder: 'CHAR_SPEC._value_to_placeholder' },
          { type: 'string', name: 'unitOfMeasure', label: 'CHAR_SPEC._unit', required: true, readonly: ro, colSpan: 1, dataCy: 'charRangeUnit', placeholder: 'CHAR_SPEC._unit_placeholder' }
        ];
      default:
        if (JSON_VALUE_TYPES.includes(this.valueType)) {
          return [
            { type: 'code', name: 'value', label: 'CHAR_SPEC._value', language: 'json', required: valueRequired, readonly: ro, colSpan: 3, minHeight: '140px', lineNumbers: false, placeholder: '{"key": "value"}' }
          ];
        }
        return [];
    }
  }
}
