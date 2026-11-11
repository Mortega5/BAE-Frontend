import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { apiUrlError } from './api-validation';

/** Turns one of the pure checks into a form validator whose error key is the check's own. */
export function validatorOf(check: (value: string | undefined) => string | null): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const error = check(control.value);
    return error ? { [error]: true } : null;
  };
}

/** Where the API is served from: the field of the API step of an offer. */
export const API_CONNECTION_FIELDS: FormField[] = [
  {
    type: 'string', name: 'url', label: 'API_ACCESS._url', required: true, colSpan: 2, dataCy: 'apiUrl',
    placeholder: 'API_ACCESS._url_placeholder', hint: 'API_ACCESS._url_hint',
    validators: [validatorOf(apiUrlError)],
    errorMessages: { url_invalid: 'API_ACCESS._err_url_invalid', url_reserved: 'API_ACCESS._err_url_reserved' },
  },
];

/** The controls of `API_CONNECTION_FIELDS`, with their validators. */
export function apiConnectionForm(): FormGroup {
  return new FormGroup({ url: new FormControl('', [Validators.required, validatorOf(apiUrlError)]) });
}
