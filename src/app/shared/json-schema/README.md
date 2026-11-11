# Schema-driven forms and validation

This module generates Angular forms from a published JSON Schema and validates documents against
it. The schema is the source of truth for the shape and validation of the data; the frontend only
decides how it is presented.

## 1. Scope

| Capability | Description |
|---|---|
| Form generation | `<app-schema-form>` fetches a schema and builds a reactive form from its properties. |
| Validation | `SchemaRegistryService` compiles the schema with ajv; the form is invalid while the document does not satisfy the whole schema. |
| Presentation | An optional *overlay*, written in TypeScript, adjusts labels, order, widths and editors without modifying the schema. |

Out of scope: the business logic of each entity, hand-written forms, and any storage of schemas
beyond the memory of the current session.

## 2. Usage

```html
<app-schema-form
  [schemaUrl]="schemaUrl"
  [overlay]="overlay"
  [initialValue]="initialValue"
  [columns]="4"
  (formReady)="onFormReady($event)"></app-schema-form>
```

| Input / output | Type | Description |
|---|---|---|
| `schemaUrl` | `string` (required) | URL of the schema. Changing it reloads the form. |
| `overlay` | `SchemaUiOverlay` | Presentation adjustments. Optional. |
| `initialValue` | `Record<string, unknown>` | Document the form is populated with. |
| `columns` | `number` (default 4) | Columns of the grid holding the top-level fields. |
| `formReady` | `EventEmitter<SchemaFormGroup>` | Emitted once the schema is loaded and the form is built. |

The emitted `SchemaFormGroup` is a standard `FormGroup`. Its `valid` state reflects the validation of
the whole document against the schema, so it can be used to enable saving.

**Read the resulting document with `form.schemaValue()`, not `form.value`.** Control values are
editing representations (YAML text for an object, `''` for an unset field); only `schemaValue()`
returns the document the schema describes, without empty optional properties.

If the schema cannot be loaded, the component shows the error and a retry button. There is no
hand-written fallback form.

To validate without generating a form:

```ts
this.schemaRegistry.get(environment.BLUEPRINT_SCHEMA)
  .subscribe(loaded => (errors = loaded.validate(value)));  // SchemaValidationError[]
```

## 3. Supported schema types

Leaf fields are rendered with `app-dynamic-form`. The table shows how each JSON Schema construct is
translated (a draft-07 subset, see `json-schema.model.ts`).

| Schema | Control (`FormField.type`) | Value | Default width (`colSpan`) |
|---|---|---|---|
| `enum` | `select` | The chosen value. An empty option is added when the field is optional or has no default. | 2 |
| `array` whose `items` are an `enum` | `select` with `multiple` | Array. When empty, the property is omitted. | 2 |
| `string` | `string` | Text. Omitted when empty. | 2 |
| `string` with `format: date` | `date` (`inputType: date`) | `YYYY-MM-DD` text. | 2 |
| `string` with `format: date-time` | `date` (`inputType: datetime-local`) | RFC 3339 instant in UTC (`…Z`). The control shows local time. | 2 |
| `integer`, `number` | `number` | Number. `integer` forces step 1 and validates that the value is whole. | 1 |
| `boolean` | `boolean` | Boolean. `false` is only written when it carries information (see section 5). | 2 |
| `object` with `properties` | Nested section (not `app-dynamic-form`) | Object. When optional, it is enabled with a switch. | — |
| Anything else (free `array`, maps, objects without `properties`) | `code` (YAML by default) | The parsed content of the editor. | Full width |

Schema rules carried over to the control: `required`, `pattern`, `minLength`, `maxLength`,
`minimum`, `maximum`, `format: uri`, `default`, `title` (label) and `description` (help text).
Whatever the control cannot express is still validated by ajv against the whole schema.

**No-loss guarantee.** An unknown construct is not dropped: it is edited as YAML and ajv validates
the result. The cost is usability, not correctness.

`FormField` has no schema counterpart for `phoneNumber`, `slider`, `bubbleSelect`, `statusPicker`,
`attachment`, tables or ranges; the generator never produces them.

## 4. Schema composition

`resolveObjectSchema` understands two patterns and decides which properties are shown for the
current value. It does not validate: validation is always ajv's, against the whole schema.

| Pattern | Effect |
|---|---|
| `oneOf` whose branches pin a property with `const` (a discriminated union, e.g. `type: helm`) | The branch matching the value is applied. Its `title` is the section heading. |
| `allOf` of `if { properties: { x: { const } } } then { … }` blocks | Every block whose condition holds is applied. A property set to `false` in the fragment is removed and the fragment's `required` is added. |

When a discriminating property changes, the group rebuilds its controls, keeps the values of the
properties that still exist and drops the rest.

Not resolved, although ajv still validates them: `anyOf`, a `oneOf` told apart by something other
than a `const`, and `if` conditions that are not an equality.

## 5. Value model

- **Codecs.** Each field carries a codec that converts between the document value and the control
  value (`toControl` / `fromControl`). `fromControl` returns `undefined` to mean "omit the property".
- **Optional objects.** A non-required object is off unless `initialValue` contains it. Turning it on
  creates it with its defaults; turning it off removes it from the value.
- **Booleans.** `false` is only written when it was already in the initial value, when the user
  touched the control, or when the schema `default` is `true`. An unticked checkbox therefore does
  not add a key.
- **Single-element array.** A value received as a one-element array is edited as its string.

## 6. Presentation: the overlay

The overlay is an object keyed by the *JSON pointer* of the document (`/properties/chart`). Each
entry is a `SchemaFieldHint` or an array of them; in an array, the first one whose `when` holds is
used.

| Property | Applies to | Description |
|---|---|---|
| `when` | all | Applied only if every pointer holds the given value, e.g. `{ '/type': 'helm' }`. |
| `label`, `hint`, `placeholder`, `colSpan`, `defaultValue` | fields | Same name and meaning as in `FormField`. `label` and `hint` are i18n keys. |
| `type` | fields | Forces the control: `code` or `textarea`. |
| `language` | `code` | `yaml` (default) or `json`. |
| `order` | fields and objects | Ascending; without a value, schema order is kept, after those that have one. |
| `optionLabels` | `enum` | i18n key for each value. |
| `groupValidators` | objects | Cross-field validators on the group. |
| `columns` | objects | Grid columns of its fields (1 to 6). |
| `heading` | objects | i18n key of the section heading. |

**Label precedence:** the overlay `label`, then the schema `title`, then the humanized property
name. The same applies to help text with `hint` and `description`.

**Width.** Fields are placed in order on a grid of `columns` columns and each one spans `colSpan`
(clamped to `1…columns`, at most 6). A field that does not fit in the remaining space of a row moves
to the next one. Width does not come from the schema; it is set by the defaults in section 3 or by
the overlay.

**New field or branch in a future schema version.** It is displayed without touching the overlay,
using the schema `title` and `description` and the default widths. The overlay is only needed to
improve its presentation.

## 7. Validation and caching

- **Validation.** ajv with `allErrors: true`, `strict: false` (the schemas carry annotation keywords
  such as `x-ocei-source`) and `ajv-formats`. The form is invalid while `schemaValue()` does not
  satisfy the schema; the errors are in `form.errors['schema']`.
- **Filtered errors.** Failures of `oneOf`, `if` and `anyOf` are omitted because they repeat more
  specific errors, as are the errors of `oneOf` branches whose discriminating `const` does not match.
- **Caching.** `SchemaRegistryService.get(url)` keeps each URL's observable in memory with
  `shareReplay(1)`. A URL is fetched and compiled once per browsing session, even for simultaneous
  requests. A failure removes the entry so the next attempt requests it again. `localStorage`,
  `sessionStorage` and IndexedDB are not used.

## 8. Configuration

Schema URLs live in `environment*.ts` and can be overridden at runtime from the configuration
(`app-init.service.ts`).

| Variable | Configuration key | Use |
|---|---|---|
| `DEPLOYMENT_SCHEMA_LOCATION` | `deploymentDefinitionSchema` | The deployment step form and the `schemaLocation` of the saved characteristic. |
| `BLUEPRINT_SCHEMA` | `blueprintSchema` | Validation of the orchestration plan and the `schemaLocation` of the product spec. |

## 9. Extending it

| Need | Where |
|---|---|
| Better presentation for a new schema | Create `overlays/<name>.ui.ts` with a `SchemaUiOverlay` and pass it as `overlay`. |
| A new schema type with its own control | Add a branch to `buildFieldEntry` (`schema-fields.ts`) with its `FormField` and codec; document it in the table in section 3. |
| A new presentation option | Add it to `SchemaFieldHint` (`ui-overlay.ts`). If `FormField` already has it, reuse its name. |
| A new composition pattern | Extend `resolveObjectSchema` and `discriminatorsOf` (`schema-resolve.ts`). |

A new `FormField` capability in `app-dynamic-form` (for example, conditional visibility) only needs
to be mapped from the schema keyword in `buildFieldEntry`.

## 10. Known limitations

- A field's width cannot be declared in the schema.
- The overlay `when` conditions and the schema `if` blocks compare equality; there is no "not
  equal", "one of" or range.
- An array of free strings is edited as YAML, not as a list of values.
- An `enum` with many options uses a native `<select>`, without search.
- `format: date-time` is rewritten in UTC; a stored value with another offset keeps its instant but
  not its text.
