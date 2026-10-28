/** Helpers for the characteristic values a configuration profile picks from
 * (productSpecCharacteristicValue entries): plain values, values with a unit, ranges
 * (valueFrom/valueTo) and 'object' values, which are JSON objects. */

import { certifications } from 'src/app/models/certification-standards.const';

/** A characteristic belongs in the profile picker unless it's a certification/compliance
 * marker, an "- enabled" companion toggle, a fixed-schema config type, or a configurable
 * characteristic with no predefined value — those are meant to be filled in by the
 * customer at order time, not fixed into a plan's profile. */
export function isProfileSelectableCharacteristic(char: any): boolean {
  const charName = (char?.name ?? '').toString().trim();
  const isOptionalToggle = charName.toLowerCase().endsWith('- enabled');
  const isConfigurableWithoutValue = char?.configurable !== false && !char?.productSpecCharacteristicValue?.length;

  return !certifications.some(certification => certification.name === charName)
    && !charName.startsWith('Compliance:')
    && !isOptionalToggle
    && char?.valueType !== 'credentialsConfiguration'
    && char?.valueType !== 'authorizationPolicy'
    && !isConfigurableWithoutValue;
}

/** Human-readable label for one productSpecCharacteristicValue entry. */
export function formatProfileValue(option: any): string {
  if (option == null) return '';
  const unit = option.unitOfMeasure ? ` (${option.unitOfMeasure})` : '';
  if ('valueFrom' in option || 'valueTo' in option) {
    return `${option.valueFrom} - ${option.valueTo}${unit}`;
  }
  const value = option.value;
  const text = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
  return text + unit;
}

/** Value equality that also works for 'object' values — String() would turn every object
 * into "[object Object]" and make all of them match each other. Booleans and numbers still
 * match their string form, since select controls hand values back as strings. */
export function sameProfileValue(a: any, b: any): boolean {
  const key = (v: any) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : String(v));
  return key(a) === key(b);
}

/** Label for a profile's selected value, which is either a whole option entry (from
 * prodSpecCharValueUse) or a bare value (from productProfile.selectedValues). */
export function formatSelectedProfileValue(selected: any): string {
  const isOption = selected !== null && typeof selected === 'object'
    && ('value' in selected || 'valueFrom' in selected);
  return formatProfileValue(isOption ? selected : { value: selected });
}
