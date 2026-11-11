import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { JsonSchema } from './json-schema.model';
import { childPointer, valueAtPointer } from './ui-overlay';

/** A fetched schema plus its compiled validator. */
export interface LoadedSchema {
  url: string;
  schema: JsonSchema;
  validate: (value: unknown) => SchemaValidationError[];
}

export interface SchemaValidationError {
  /** JSON pointer of the value the message is about, `''` for the root. A missing or forbidden
   * property is reported at that property, not at the object that lacks or holds it. */
  path: string;
  /** What is wrong with the value at `path`, e.g. `is required`, in English. It does not repeat the
   * path. Show it through `schemaIssue` to get it in the language of the app. */
  message: string;
  /** The ajv keyword that failed and its parameters, for wording the message in another language. */
  keyword?: string;
  params?: Record<string, unknown>;
}

/**
 * Fetches published JSON Schemas and compiles them with ajv. A published version never changes, so
 * each URL is fetched and compiled once per session.
 */
@Injectable({ providedIn: 'root' })
export class SchemaRegistryService {
  private readonly ajv = createAjv();
  private readonly cache = new Map<string, Observable<LoadedSchema>>();

  constructor(private http: HttpClient) {}

  get(url: string): Observable<LoadedSchema> {
    let loaded = this.cache.get(url);
    if (!loaded) {
      loaded = this.http.get<JsonSchema>(url).pipe(
        map(schema => this.compile(url, schema)),
        catchError(error => {
          this.cache.delete(url); // let a retry fetch again
          return throwError(() => error);
        }),
        shareReplay(1),
      );
      this.cache.set(url, loaded);
    }
    return loaded;
  }

  /** Compiles a schema that is already in hand (also used by tests). */
  compile(url: string, schema: JsonSchema): LoadedSchema {
    const validator = this.ajv.getSchema(schema.$id ?? url) ?? this.ajv.compile(schema);
    return { url, schema, validate: value => runValidator(validator, value) };
  }
}

export function createAjv(): Ajv {
  // strict: false — the schemas carry annotation keywords such as `x-ocei-source`.
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv;
}

export function runValidator(validator: ValidateFunction, value: unknown): SchemaValidationError[] {
  if (validator(value)) return [];
  const errors = validator.errors ?? [];
  const rejected = [...rejectedBranches(errors), ...undecidedBlocks(errors, validator.schema, value)];
  return dedupe(errors
    .filter(isReportable)
    .filter(error => !rejected.some(branch => error.schemaPath.startsWith(`${branch}/`)))
    .map(toValidationError));
}

/**
 * `if: { properties: { backend: { const: 'vm' } } }` is true while `backend` is absent, because
 * `properties` only checks the properties that exist. With `backend` unset, ajv would therefore apply
 * the `then` of every block at once and report each backend's requirements. Those blocks are not
 * the one the user is filling in (none is, yet), so their `then` errors are noise; the missing
 * discriminator is reported on its own by the `required` that every such schema also has.
 */
function undecidedBlocks(errors: ErrorObject[], root: unknown, value: unknown): string[] {
  const blocks = new Set<string>();
  for (const error of errors) {
    if (error.keyword !== 'if') continue;
    const block = /^#(\/.*\/allOf\/\d+)\/if$/.exec(error.schemaPath)?.[1];
    if (!block) continue;
    const condition = (valueAtPointer(root, block) as JsonSchema | undefined)?.if;
    const discriminators = Object.keys(condition?.properties ?? {});
    const target = valueAtPointer(value, error.instancePath);
    if (target && typeof target === 'object' && discriminators.some(name => !(name in target))) {
      blocks.add(`#${block}/then`);
    }
  }
  return [...blocks];
}

/**
 * A value is checked against every `oneOf` branch, so a Helm definition also collects every reason it
 * is not a Docker one. A branch whose discriminator `const` failed is not the one the user is
 * filling in; its errors are noise.
 */
function rejectedBranches(errors: ErrorObject[]): string[] {
  const branches = new Set<string>();
  for (const error of errors) {
    if (error.keyword !== 'const') continue;
    const match = /^(.*\/oneOf\/\d+)\//.exec(error.schemaPath);
    if (match) branches.add(match[1]);
  }
  return [...branches];
}

/** `oneOf`/`if` failures only repeat what a more specific error already says. */
function isReportable(error: ErrorObject): boolean {
  return error.keyword !== 'oneOf' && error.keyword !== 'if' && error.keyword !== 'anyOf';
}

function toValidationError(error: ErrorObject): SchemaValidationError {
  const params = error.params as Record<string, unknown>;
  const at = (path: string, message: string): SchemaValidationError => ({ path, message, keyword: error.keyword, params });
  switch (error.keyword) {
    case 'required':
      return at(childPointer(error.instancePath, String(params['missingProperty'])), 'is required');
    case 'additionalProperties':
      return at(childPointer(error.instancePath, String(params['additionalProperty'])), 'is not allowed here');
    case 'false schema':
      return at(error.instancePath, 'is not allowed here');
    case 'enum':
      return at(error.instancePath, `must be one of: ${(params['allowedValues'] as unknown[]).join(', ')}`);
    case 'const':
      return at(error.instancePath, `must be ${params['allowedValue']}`);
    default: {
      const extra = params['propertyName'];
      return at(error.instancePath, `${error.message ?? error.keyword}${extra === undefined ? '' : ` (${extra})`}`);
    }
  }
}

function dedupe(errors: SchemaValidationError[]): SchemaValidationError[] {
  const seen = new Set<string>();
  return errors.filter(e => {
    const key = `${e.path}|${e.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
