import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import * as yaml from 'js-yaml';
import { CodeLanguage, FormField, SelectOption } from 'src/app/models/formFields/form-field.model';
import { jsonValidator, yamlValidator } from 'src/app/validators/validators';
import { JsonSchema, ResolvedObjectSchema } from './json-schema.model';
import { childPointer, hintFor, SchemaFieldHint, SchemaUiOverlay } from './ui-overlay';

/** Converts between a property's value and what its form control holds. */
export interface ValueCodec {
  toControl(value: unknown): unknown;
  /** `undefined` means "leave the property out". */
  fromControl(controlValue: unknown): unknown;
}

/** A leaf rendered through `app-dynamic-form`. */
export interface SchemaFieldEntry {
  kind: 'field';
  name: string;
  pointer: string;
  schema: JsonSchema;
  field: FormField;
  codec: ValueCodec;
}

/** An object with its own properties, rendered as a nested section. */
export interface SchemaObjectEntry {
  kind: 'object';
  name: string;
  pointer: string;
  schema: JsonSchema;
  required: boolean;
  hint: SchemaFieldHint;
}

export type SchemaEntry = SchemaFieldEntry | SchemaObjectEntry;

/**
 * Builds the entries for a resolved object node. Mapping:
 *
 * | Schema | Control |
 * |---|---|
 * | `enum` | select (with an empty option when optional) |
 * | `string` | text input, or a code editor / textarea when the overlay says so |
 * | `integer` / `number` | number input with `minimum` / `maximum` |
 * | `boolean` | checkbox |
 * | `object` with `properties` | nested section |
 * | anything else (maps, arrays, free objects) | YAML editor whose parsed content is the value |
 *
 * Nothing is dropped: a construct this does not know becomes the YAML editor, and ajv still
 * validates the result against the full schema.
 */
export function buildEntries(
  resolved: ResolvedObjectSchema,
  pointer: string,
  overlay: SchemaUiOverlay | undefined,
  rootValue: unknown,
): SchemaEntry[] {
  const names = Object.keys(resolved.properties);
  const hints = new Map(names.map(name => [name, hintFor(overlay, childPointer(pointer, name), rootValue)]));
  const ordered = [...names].sort((a, b) =>
    (hints.get(a)!.order ?? Number.MAX_SAFE_INTEGER) - (hints.get(b)!.order ?? Number.MAX_SAFE_INTEGER));

  return ordered.map(name => {
    const schema = resolved.properties[name];
    const hint = hints.get(name)!;
    const required = resolved.required.includes(name);
    const propPointer = childPointer(pointer, name);
    if (isObjectWithProperties(schema) && !hint.type) {
      return { kind: 'object', name, pointer: propPointer, schema, required, hint };
    }
    return buildFieldEntry(name, propPointer, schema, required, hint);
  });
}

export function isObjectWithProperties(schema: JsonSchema): boolean {
  return typeOf(schema) === 'object' && !!schema.properties && Object.keys(schema.properties).length > 0;
}

/** Turns a property name such as `serviceTemplateId` into `Service template id`. */
export function humanize(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildFieldEntry(name: string, pointer: string, schema: JsonSchema, required: boolean, hint: SchemaFieldHint): SchemaFieldEntry {
  const base = {
    name,
    label: hint.label ?? schema.title ?? humanize(name),
    hint: hint.hint ?? schema.description,
    required,
    colSpan: hint.colSpan,
    defaultValue: undefined as unknown,
    errorMessages: ERROR_MESSAGES,
  };
  const type = typeOf(schema);
  const initial = schema.default ?? hint.defaultValue;

  if (schema.enum && !hint.type) {
    const options: SelectOption[] = schema.enum.map(value => ({
      value,
      label: hint.optionLabels?.[String(value)] ?? String(value),
    }));
    if (!required || initial === undefined) options.unshift({ value: '', label: 'SCHEMA_FORM._none' });
    const codec = scalarCodec();
    return entry(name, pointer, schema, codec, {
      ...base, type: 'select', options, colSpan: hint.colSpan ?? 2, defaultValue: codec.toControl(initial),
    });
  }

  if (hint.type === 'textarea') {
    const codec = scalarCodec();
    return entry(name, pointer, schema, codec, {
      ...base, type: 'textarea', placeholder: hint.placeholder, defaultValue: codec.toControl(initial),
      validators: stringValidators(schema),
    });
  }

  if (hint.type === 'code' || !isScalar(type)) {
    const language: CodeLanguage = hint.language ?? 'yaml';
    // A string property holds the text itself; anything else holds the parsed document.
    const codec = type === 'string' ? scalarCodec() : documentCodec(language);
    return entry(name, pointer, schema, codec, {
      ...base, type: 'code', language, placeholder: hint.placeholder, defaultValue: codec.toControl(initial),
      validators: language === 'json' ? [jsonValidator] : [yamlValidator],
    });
  }

  if (type === 'boolean') {
    const codec = booleanCodec();
    return entry(name, pointer, schema, codec, { ...base, type: 'boolean', colSpan: hint.colSpan ?? 2, defaultValue: codec.toControl(initial) });
  }

  if (type === 'integer' || type === 'number') {
    const codec = numberCodec();
    return entry(name, pointer, schema, codec, {
      ...base, type: 'number', colSpan: hint.colSpan ?? 1, min: schema.minimum, max: schema.maximum,
      step: type === 'integer' ? 1 : undefined, placeholder: hint.placeholder, defaultValue: codec.toControl(initial),
      validators: numberValidators(schema, type === 'integer'),
    });
  }

  const codec = scalarCodec();
  return entry(name, pointer, schema, codec, {
    ...base, type: 'string', colSpan: hint.colSpan ?? 2, placeholder: hint.placeholder, defaultValue: codec.toControl(initial),
    validators: stringValidators(schema),
  });
}

function entry(name: string, pointer: string, schema: JsonSchema, codec: ValueCodec, field: FormField): SchemaFieldEntry {
  return { kind: 'field', name, pointer, schema, codec, field };
}

function typeOf(schema: JsonSchema): string | undefined {
  if (Array.isArray(schema.type)) return schema.type.find(t => t !== 'null');
  if (schema.type) return schema.type;
  if (schema.properties) return 'object';
  if (schema.enum?.length) return typeof schema.enum[0];
  return undefined;
}

function isScalar(type: string | undefined): boolean {
  return type === 'string' || type === 'integer' || type === 'number' || type === 'boolean';
}

const isEmpty = (v: unknown) => v === undefined || v === null || v === '';

/** The broker may round-trip a single string as a one-element array; edit the string itself. */
function unwrap(value: unknown): unknown {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

function scalarCodec(): ValueCodec {
  return {
    toControl: value => (isEmpty(unwrap(value)) ? '' : unwrap(value)),
    fromControl: value => (isEmpty(value) ? undefined : value),
  };
}

function numberCodec(): ValueCodec {
  return {
    toControl: value => (isEmpty(unwrap(value)) ? null : unwrap(value)),
    fromControl: value => {
      if (isEmpty(value)) return undefined;
      const n = Number(value);
      return Number.isNaN(n) ? value : n; // let schema validation report what is not a number
    },
  };
}

function booleanCodec(): ValueCodec {
  return {
    toControl: value => unwrap(value) === true,
    fromControl: value => value === true,
  };
}

function documentCodec(language: CodeLanguage): ValueCodec {
  const dump = (value: unknown) => (language === 'json' ? JSON.stringify(value, null, 2) : yaml.dump(value).trimEnd());
  const load = (text: string) => (language === 'json' ? JSON.parse(text) : yaml.load(text));
  return {
    toControl: value => (isEmpty(value) ? '' : typeof value === 'string' ? value : dump(value)),
    fromControl: value => {
      if (typeof value !== 'string') return isEmpty(value) ? undefined : value;
      if (!value.trim()) return undefined;
      try {
        return load(value);
      } catch {
        return value; // the editor's own validator reports the syntax error
      }
    },
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  pattern: 'SCHEMA_FORM._error_pattern',
  min: 'SCHEMA_FORM._error_min',
  max: 'SCHEMA_FORM._error_max',
  minlength: 'SCHEMA_FORM._error_minlength',
  maxlength: 'SCHEMA_FORM._error_maxlength',
  integer: 'SCHEMA_FORM._error_integer',
  uri: 'SCHEMA_FORM._error_uri',
  invalidYaml: 'SCHEMA_FORM._error_yaml',
  invalidJson: 'SCHEMA_FORM._error_json',
};

function stringValidators(schema: JsonSchema): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (schema.pattern) validators.push(Validators.pattern(new RegExp(schema.pattern, 'u')));
  if (schema.minLength !== undefined) validators.push(Validators.minLength(schema.minLength));
  if (schema.maxLength !== undefined) validators.push(Validators.maxLength(schema.maxLength));
  if (schema.format === 'uri') validators.push(uriValidator);
  return validators;
}

function numberValidators(schema: JsonSchema, integer: boolean): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  if (schema.minimum !== undefined) validators.push(Validators.min(schema.minimum));
  if (schema.maximum !== undefined) validators.push(Validators.max(schema.maximum));
  if (integer) validators.push(integerValidator);
  return validators;
}

function uriValidator(control: AbstractControl): ValidationErrors | null {
  if (isEmpty(control.value)) return null;
  try {
    const url = new URL(String(control.value));
    return url.protocol ? null : { uri: true };
  } catch {
    return { uri: true };
  }
}

function integerValidator(control: AbstractControl): ValidationErrors | null {
  if (isEmpty(control.value)) return null;
  return Number.isInteger(Number(control.value)) ? null : { integer: true };
}
