import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { createSchemaForm } from './schema-form-group';
import { LoadedSchema, SchemaRegistryService } from './schema-registry.service';

/** Which published schema version an existing entity is edited in. */
export interface SchemaChoice {
  /** The URL to load the form from and to stamp as `@schemaLocation` on save. */
  url: string;
  loaded?: LoadedSchema;
  /** The entity was written with another version and moves to `url` when saved. */
  upgraded: boolean;
  /** Set when the entity cannot be edited with any schema the form can load. Its stored value must
   * then be sent back untouched. `unsupported`: its `@schemaLocation` is not one of ours (an old gist
   * or a `urn:`); `unreachable`: it is ours but could not be fetched. */
  readOnlyReason?: 'unsupported' | 'unreachable';
}

/**
 * Picks the schema version to edit an entity in. Every published version is immutable, so the
 * entity's own `@schemaLocation` always describes it; editing it in another version only works if
 * its value is valid there.
 *
 * 1. No stored location, or the value validates against the current version: the current version
 *    (an older entity is upgraded on save).
 * 2. Otherwise, a stored location under the same schema base as the current one: that version.
 * 3. Otherwise: read-only, keep what is stored.
 *
 * @param isValid - whether the entity's value validates against a loaded schema
 */
export function chooseSchema(
  registry: SchemaRegistryService,
  currentUrl: string,
  storedUrl: string | undefined,
  isValid: (loaded: LoadedSchema) => boolean,
): Observable<SchemaChoice> {
  return registry.get(currentUrl).pipe(
    switchMap(current => {
      const upgraded = !!storedUrl && storedUrl !== currentUrl;
      if (!storedUrl || storedUrl === currentUrl || isValid(current)) {
        return of<SchemaChoice>({ url: currentUrl, loaded: current, upgraded });
      }
      if (!sameSchemaBase(currentUrl, storedUrl)) {
        return of<SchemaChoice>({ url: storedUrl, upgraded: false, readOnlyReason: 'unsupported' });
      }
      return registry.get(storedUrl).pipe(
        map(stored => ({ url: storedUrl, loaded: stored, upgraded: false } as SchemaChoice)),
        catchError(() => of<SchemaChoice>({ url: storedUrl, upgraded: false, readOnlyReason: 'unreachable' })),
      );
    }),
  );
}

/** `https://host/schemas/v1/x.json` and `https://host/schemas/v2/y.json` share a base; a gist or a
 * `urn:` shares none with them. */
export function sameSchemaBase(a: string, b: string): boolean {
  const base = (url: string) => {
    try {
      const { origin, pathname } = new URL(url);
      const at = pathname.indexOf('/schemas/');
      return at < 0 ? undefined : `${origin}${pathname.slice(0, at + '/schemas/'.length)}`;
    } catch {
      return undefined;
    }
  };
  const baseA = base(a);
  return baseA !== undefined && baseA === base(b);
}

/**
 * Whether a stored document validates against `loaded` once read through the form, which is what
 * would be saved: the form unwraps one-element arrays the broker returns and drops what the schema
 * does not describe (e.g. a release identity older packages carry).
 */
export function documentValidates(loaded: LoadedSchema, value: Record<string, unknown> | undefined): boolean {
  if (!value) return true;
  const form = createSchemaForm(loaded, structuredClone(value));
  return loaded.validate(form.schemaValue()).length === 0;
}
