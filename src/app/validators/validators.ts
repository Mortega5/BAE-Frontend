import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import * as yaml from 'js-yaml';
import { parsePhoneNumber } from 'libphonenumber-js/max';

export const pricePlanValidator: ValidatorFn = (form: AbstractControl): ValidationErrors | null => {
  const paymentOnline = form.get('paymentOnline')?.value;
  const priceComponents = form.get('priceComponents')?.value;

  if (paymentOnline && (!priceComponents || priceComponents.length === 0)) {
    return { priceComponentsRequired: true }; // Custom error
  }

  return null; // Validation passes
};

/** Group-level: flags `nonUniqueName` on the group when its `name` control clashes. */
export function uniqueNameValidatorFactory(getExistingNames: () => string[]): ValidatorFn {
  const isUnique = uniqueValueValidatorFactory(getExistingNames);
  return (control: AbstractControl): ValidationErrors | null => {
    const nameControl = control.get('name');
    return nameControl ? isUnique(nameControl) : null;
  };
}

/** Control-level: flags `nonUniqueName` on the control itself, so app-dynamic-form can show it
 * through the field's `errorMessages`. Case- and surrounding-whitespace-insensitive. */
export function uniqueValueValidatorFactory(getExistingValues: () => string[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value?.trim().toLowerCase();
    if (!value) return null;

    const existingValues = getExistingValues().map(n => n?.trim().toLowerCase());

    return existingValues.includes(value)
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

/** Validates the combined dialable string `app-phone-number-input` produces (e.g. "+34612345678").
 * Empty is left to `required` — this only rejects a non-empty, unparseable/invalid number. */
export function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value == null || value === '') return null;
  try {
    const phoneNumber = parsePhoneNumber(value);
    return phoneNumber?.isValid() ? null : { invalidPhoneNumber: true };
  } catch {
    return { invalidPhoneNumber: true };
  }
}

/** Every leaf path of a parsed YAML/JSON tree, dotted. `{a: {b: 1}}` yields `['a.b']`. */
export function leafPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

/**
 * A provider has two value channels and a key belongs to exactly one of them: `values` is applied
 * below everything the consumer sets, `enforcedValues` above it. Writing a key in both is never what
 * the author meant — the default can never take effect — and nothing downstream would report it, so
 * it is caught here rather than left to surface as a deployment that ignores half the configuration.
 *
 * @returns the shadowed keys under `shadowedKeys`, or null when the two channels are disjoint
 */
export const disjointValueChannelsValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const parse = (raw: unknown): unknown => {
    const text = Array.isArray(raw) ? raw[0] : raw;
    if (typeof text !== 'string' || !text.trim()) return null;
    try {
      return yaml.load(text);
    } catch {
      return null; // shape errors belong to yamlValidator, not here
    }
  };

  const defaults = new Set(leafPaths(parse(group.get('values')?.value)));
  const shadowed = leafPaths(parse(group.get('enforcedValues')?.value)).filter(path => defaults.has(path));

  return shadowed.length > 0 ? { shadowedKeys: shadowed } : null;
};
