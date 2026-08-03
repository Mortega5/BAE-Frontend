import { FormControl, FormGroup, Validators } from '@angular/forms';
import { FormField, PaginatedTableFormField, SelectableFormField, TableFormField } from 'src/app/models/formFields/form-field.model';

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
    controls[field.name] = new FormControl(
      defaultValue,
      field.required ? Validators.required : []
    );
  }
  return new FormGroup(controls);
}
