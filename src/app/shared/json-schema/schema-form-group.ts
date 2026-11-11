import { AbstractControl, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { JsonSchema } from './json-schema.model';
import { buildEntries, SchemaEntry, SchemaFieldEntry, SchemaObjectEntry } from './schema-fields';
import { LoadedSchema, SchemaValidationError } from './schema-registry.service';
import { resolveObjectSchema } from './schema-resolve';
import { SchemaUiOverlay } from './ui-overlay';

type ObjectValue = Record<string, unknown>;

interface SchemaFormContext {
  overlay?: SchemaUiOverlay;
  /** The root group, for overlay hints that depend on another branch (e.g. `/type`). */
  root?: SchemaFormGroup;
}

/**
 * A FormGroup built from an object schema node. It owns its controls: it creates them from the
 * resolved schema, rebuilds them when a discriminator (e.g. `type`, `backend`) changes, and turns
 * them back into a value with {@link schemaValue}. Nested objects are child SchemaFormGroups.
 *
 * Use {@link schemaValue}, not `value`: control values are editor representations (YAML text for an
 * object, `''` for an unset field), and only `schemaValue()` is the document the schema describes.
 */
export class SchemaFormGroup extends FormGroup {
  entries: SchemaEntry[] = [];
  /** Leaf fields, kept as a stable array for `app-dynamic-form`. */
  fields: FormField[] = [];
  objects: SchemaObjectEntry[] = [];
  /** Optional nested objects the user has switched on. */
  readonly enabledObjects = new Set<string>();
  branchTitle?: string;
  /** On the root group: the URL of the schema it was built from, to stamp as `@schemaLocation`. */
  schemaUrl?: string;

  private readonly initialKeys: Set<string>;
  private discriminatorSubscriptions: Subscription[] = [];
  private rebuilding = false;

  constructor(
    private node: JsonSchema,
    readonly pointer: string,
    private readonly context: SchemaFormContext,
    initialValue: ObjectValue | undefined,
  ) {
    super({});
    if (!context.root) context.root = this;
    this.initialKeys = new Set(Object.keys(initialValue ?? {}));
    for (const key of this.initialKeys) this.enabledObjects.add(key);
    this.rebuild(initialValue ?? {});
  }

  /** The document this group describes, with unset optional properties left out. */
  schemaValue(): ObjectValue {
    const out: ObjectValue = {};
    for (const entry of this.entries) {
      if (entry.kind === 'object') {
        const child = this.get(entry.name) as SchemaFormGroup | null;
        if (child) out[entry.name] = child.schemaValue();
        continue;
      }
      const control = this.get(entry.name);
      if (!control) continue;
      const value = entry.codec.fromControl(control.value);
      if (value === undefined) continue;
      if (entry.field.type === 'boolean' && !this.keepBoolean(entry, control, value)) continue;
      out[entry.name] = value;
    }
    return out;
  }

  /** Switches an optional nested object on (with its defaults) or off (left out of the value). */
  setObjectEnabled(name: string, enabled: boolean): void {
    if (enabled) this.enabledObjects.add(name);
    else this.enabledObjects.delete(name);
    this.rebuild(this.schemaValue());
    this.markAsDirty();
  }

  isObjectEnabled(entry: SchemaObjectEntry): boolean {
    return entry.required || this.enabledObjects.has(entry.name);
  }

  /** Replaces the schema node (the parent's branch changed) and reconciles the controls. */
  setNode(node: JsonSchema): void {
    this.node = node;
    this.rebuild(this.schemaValue());
  }

  private rebuild(value: ObjectValue, pass = 0): void {
    if (this.rebuilding) return;
    this.rebuilding = true;
    let settled = true;
    try {
      const resolved = resolveObjectSchema(this.node, value);
      this.branchTitle = resolved.branchTitle;
      this.entries = buildEntries(resolved, this.pointer, this.context.overlay, this.rootValue());
      this.fields = this.entries.filter((e): e is SchemaFieldEntry => e.kind === 'field').map(e => e.field);
      this.objects = this.entries.filter((e): e is SchemaObjectEntry => e.kind === 'object');

      const wanted = new Set<string>();
      for (const entry of this.entries) {
        if (entry.kind === 'field') {
          wanted.add(entry.name);
          this.reconcileField(entry, value);
        } else if (this.isObjectEnabled(entry)) {
          wanted.add(entry.name);
          this.reconcileObject(entry, value);
        }
      }
      for (const name of Object.keys(this.controls)) {
        if (!wanted.has(name)) this.removeControl(name, { emitEvent: false });
      }
      this.watchDiscriminators(resolved.discriminators);
      // A discriminator may only now have its value (a default, e.g. `type: helm`), and the branch it
      // selects was not applied yet: resolve again with it.
      const current = this.schemaValue();
      settled = resolved.discriminators.every(name => current[name] === value[name]);
      if (settled || pass >= 2) this.updateValueAndValidity();
    } finally {
      this.rebuilding = false;
    }
    if (!settled && pass < 2) this.rebuild(this.schemaValue(), pass + 1);
  }

  private rootValue(): unknown {
    return this.context.root?.schemaValue();
  }

  private reconcileField(entry: SchemaFieldEntry, value: ObjectValue): void {
    const validators = entry.field.required ? [Validators.required, ...(entry.field.validators ?? [])] : [...(entry.field.validators ?? [])];
    const existing = this.get(entry.name);
    if (existing && !(existing instanceof FormGroup)) {
      existing.setValidators(validators);
      existing.updateValueAndValidity({ emitEvent: false });
      return;
    }
    const initial = entry.name in value ? entry.codec.toControl(value[entry.name]) : entry.field.defaultValue;
    if (existing) this.removeControl(entry.name, { emitEvent: false });
    this.addControl(entry.name, new FormControl(initial, validators), { emitEvent: false });
  }

  private reconcileObject(entry: SchemaObjectEntry, value: ObjectValue): void {
    const existing = this.get(entry.name);
    if (existing instanceof SchemaFormGroup) {
      existing.setNode(entry.schema);
    } else {
      if (existing) this.removeControl(entry.name, { emitEvent: false });
      const childValue = value[entry.name];
      const child = new SchemaFormGroup(entry.schema, entry.pointer, this.context,
        childValue && typeof childValue === 'object' && !Array.isArray(childValue) ? childValue as ObjectValue : undefined);
      this.addControl(entry.name, child, { emitEvent: false });
    }
    const child = this.get(entry.name) as SchemaFormGroup;
    child.setValidators(entry.hint.groupValidators ?? []);
    child.updateValueAndValidity({ emitEvent: false });
  }

  private watchDiscriminators(names: string[]): void {
    this.discriminatorSubscriptions.forEach(s => s.unsubscribe());
    this.discriminatorSubscriptions = names
      .map(name => this.get(name))
      .filter((control): control is AbstractControl => !!control)
      .map(control => control.valueChanges.subscribe(() => this.rebuild(this.schemaValue())));
  }

  /** `false` is only written when it means something: it was there before, the user set it, or the
   * schema's default is `true`. Otherwise every unticked checkbox would add a key. */
  private keepBoolean(entry: SchemaFieldEntry, control: AbstractControl, value: unknown): boolean {
    return value !== (entry.schema.default ?? false) || this.initialKeys.has(entry.name) || control.dirty;
  }
}

/** Builds the root group for a loaded schema and makes the whole document's validity part of it. */
export function createSchemaForm(loaded: LoadedSchema, initialValue: ObjectValue | undefined, overlay?: SchemaUiOverlay): SchemaFormGroup {
  const root = new SchemaFormGroup(loaded.schema, '', { overlay }, initialValue);
  root.schemaUrl = loaded.url;
  root.addValidators(schemaValidator(loaded, root));
  root.updateValueAndValidity();
  return root;
}

function schemaValidator(loaded: LoadedSchema, root: SchemaFormGroup): ValidatorFn {
  return (): ValidationErrors | null => {
    const errors: SchemaValidationError[] = loaded.validate(root.schemaValue());
    return errors.length > 0 ? { schema: errors } : null;
  };
}
