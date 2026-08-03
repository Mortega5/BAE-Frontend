import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { CodeFormField, FormField, PaginatedTableFormField, SelectableFormField, TableFormField } from 'src/app/models/formFields/form-field.model';
import { yamlValidator } from 'src/app/validators/validators';

export function buildFormGroup(fields: FormField[]): FormGroup {
  const controls: Record<string, FormControl> = {};
  for (const field of fields) {
    const isTableType = field.type === 'table' || field.type === 'paginatedTable';
    const isMultiSelect = field.type === 'select' && (field as SelectableFormField).multiple === true;
    const isMultiTable = isTableType && (field as TableFormField | PaginatedTableFormField).multiple === true;
    const defaultValue = field.defaultValue ?? (
      isMultiSelect || isMultiTable ? [] :
      isTableType ? null :
      field.type === 'boolean' ? false : ''
    );

    const validators: ValidatorFn[] = [];
    if (field.required) validators.push(Validators.required);
    if (field.type === 'code' && (field as CodeFormField).language === 'yaml') validators.push(yamlValidator);
    if (field.validators) validators.push(...field.validators);

    controls[field.name] = new FormControl(defaultValue, validators);
  }
  return new FormGroup(controls);
}
