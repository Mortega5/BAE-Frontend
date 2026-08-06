import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import * as yaml from 'js-yaml';

export const pricePlanValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
  const paymentOnline = form.get('paymentOnline')?.value;
  const priceComponents = form.get('priceComponents')?.value;

  if (paymentOnline && (!priceComponents || priceComponents.length === 0)) {
    return { priceComponentsRequired: true }; // Custom error
  }

  return null; // Validation passes
};

export function uniqueNameValidatorFactory(getExistingNames: () => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const nameControl = control.get('name');
    if (!nameControl) return null;

    const name = nameControl.value?.trim().toLowerCase();
    if (!name) return null;

    const existingNames = getExistingNames().map(n => n?.trim().toLowerCase());

    return existingNames.includes(name)
      ? { nonUniqueName: true }
      : null;
  };
}


export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const isWhitespace = (control.value || '').trim().length === 0;
  const isValid = !isWhitespace;
  return isValid ? null : { whitespace: true };
}

function isValidSingleValue(value: any, parse: (v: string) => void): boolean {
  if (typeof value !== 'string' || value.trim() === '') return true;
  try {
    parse(value);
    return true;
  } catch {
    return false;
  }
}

export function jsonValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null) return null;
  const values = Array.isArray(value) ? value : [value];
  return values.every(v => isValidSingleValue(v, JSON.parse)) ? null : { invalidJson: true };
}

export function yamlValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null) return null;
  const values = Array.isArray(value) ? value : [value];
  return values.every(v => isValidSingleValue(v, yaml.load)) ? null : { invalidYaml: true };
}
