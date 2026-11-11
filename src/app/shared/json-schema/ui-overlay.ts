import { ValidatorFn } from '@angular/forms';
import { CodeLanguage } from 'src/app/models/formFields/form-field.model';

/**
 * How to edit a value whose schema alone does not say:
 * - `code`: a code editor. For a string property the text is the value (e.g. a YAML string); for an
 *   object property the text is parsed, so the value is the object.
 * - `textarea`: a plain multi-line string.
 */
export type SchemaWidget = 'code' | 'textarea';

/**
 * UI hints for one property, layered over what the schema says. The schema stays the source of
 * truth for shape and validation; a hint only changes presentation.
 */
export interface SchemaFieldHint {
  /** Only apply this hint while every pointer holds the given value, e.g. `{'/type': 'helm'}`.
   * Pointers are relative to the form's root value. */
  when?: Record<string, unknown>;
  widget?: SchemaWidget;
  language?: CodeLanguage;
  /** i18n key; defaults to the schema `title`, then to the property name. */
  label?: string;
  /** i18n key; defaults to the schema `description`. */
  hint?: string;
  placeholder?: string;
  colSpan?: number;
  /** Lower first; properties without an order keep schema order, after the ordered ones. */
  order?: number;
  /** i18n keys for enum values, by value. */
  optionLabels?: Record<string, string>;
  /** Initial value when the schema has no `default`. */
  defaultValue?: unknown;
  /** For an object property: cross-field validators on its group. */
  groupValidators?: ValidatorFn[];
  /** For an object property: grid columns of its fields (1-6). */
  columns?: number;
  /** For an object property: i18n key of its section heading; defaults to the branch title. */
  heading?: string;
}

/** Hints by JSON pointer of the instance, e.g. `/properties/values`. A pointer may hold several hints
 * with different `when` conditions; the first one that holds is used. */
export type SchemaUiOverlay = Record<string, SchemaFieldHint | SchemaFieldHint[]>;

/** Reads the value at a JSON pointer (`/a/b`) of a plain object. */
export function valueAtPointer(root: unknown, pointer: string): unknown {
  if (!pointer || pointer === '/') return root;
  return pointer.split('/').slice(1).reduce<unknown>(
    (node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[unescapePointer(key)] : undefined),
    root,
  );
}

export function hintFor(overlay: SchemaUiOverlay | undefined, pointer: string, rootValue: unknown): SchemaFieldHint {
  const entry = overlay?.[pointer];
  if (!entry) return {};
  const candidates = Array.isArray(entry) ? entry : [entry];
  return candidates.find(hint => Object.entries(hint.when ?? {})
    .every(([path, expected]) => valueAtPointer(rootValue, path) === expected)) ?? {};
}

export function childPointer(parent: string, name: string): string {
  return `${parent === '/' ? '' : parent}/${name.replace(/~/g, '~0').replace(/\//g, '~1')}`;
}

function unescapePointer(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}
