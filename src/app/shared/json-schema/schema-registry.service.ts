import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Ajv, { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { Observable, catchError, map, shareReplay, throwError } from 'rxjs';
import { JsonSchema } from './json-schema.model';

/** A fetched schema plus its compiled validator. */
export interface LoadedSchema {
  url: string;
  schema: JsonSchema;
  validate: (value: unknown) => SchemaValidationError[];
}

export interface SchemaValidationError {
  /** JSON pointer of the offending value, `''` for the root. */
  path: string;
  message: string;
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
  const rejected = rejectedBranches(errors);
  return dedupe(errors
    .filter(isReportable)
    .filter(error => !rejected.some(branch => error.schemaPath.startsWith(`${branch}/`)))
    .map(toValidationError));
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
  const extra = params['additionalProperty'] ?? params['missingProperty'] ?? params['allowedValues'] ?? params['propertyName'];
  const detail = extra === undefined ? '' : ` (${Array.isArray(extra) ? extra.join(', ') : extra})`;
  return { path: error.instancePath, message: `${error.message ?? error.keyword}${detail}` };
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
