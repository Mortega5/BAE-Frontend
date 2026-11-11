import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { LoadedSchema, SchemaRegistryService } from './schema-registry.service';
import { chooseSchema, documentValidates, SchemaChoice, sameSchemaBase } from './schema-version';
import { DEPLOYMENT_DEFINITION_V1, DEPLOYMENT_DEFINITION_V1_URL, LEGACY_DEPLOYMENT_DEFINITIONS, MODEL_DEPLOYMENT_DEFINITIONS } from './testing/model-fixtures';

const BASE = 'https://tm-forum-model-66feba.pages.o-cei.eu/schemas';
const V9_URL = `${BASE}/v9/deployment-definition.json`;
const GIST_057BEB0 = 'https://gist.githubusercontent.com/vramperez/e50df47dde789a05e0a4bdca39cf7349/raw/057beb0c9cd8aae6e5d5fbd8841c8035b5304996/deployment-definition.json';

/** A made-up incompatible version: Helm packages must also pin a chart digest. */
function v9(): any {
  const schema = structuredClone(DEPLOYMENT_DEFINITION_V1);
  schema.$id = V9_URL;
  const helm = schema.oneOf.find((b: any) => b.properties.type.const === 'helm');
  helm.properties.properties.required = [...helm.properties.properties.required, 'digest'];
  helm.properties.properties.properties.digest = { type: 'string' };
  return schema;
}

describe('chooseSchema', () => {
  const compiler = new SchemaRegistryService({} as HttpClient);
  const schemas: Record<string, LoadedSchema> = {
    [DEPLOYMENT_DEFINITION_V1_URL]: compiler.compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1),
    [V9_URL]: compiler.compile(V9_URL, v9()),
  };
  const registry = {
    get: (url: string): Observable<LoadedSchema> => (schemas[url] ? of(schemas[url]) : throwError(() => new Error(`404 ${url}`))),
  } as unknown as SchemaRegistryService;

  const choose = (current: string, stored: string | undefined, value: any): SchemaChoice => {
    let result: SchemaChoice | undefined;
    chooseSchema(registry, current, stored, loaded => documentValidates(loaded, value)).subscribe(c => (result = c));
    return result!;
  };

  const helm = MODEL_DEPLOYMENT_DEFINITIONS['hello-world/sw-support-pkg.json'];

  it('uses the current version for a new definition', () => {
    expect(choose(V9_URL, undefined, undefined)).toEqual(jasmine.objectContaining({ url: V9_URL, upgraded: false }));
  });

  it('upgrades a stored definition that is valid in the current version', () => {
    const choice = choose(DEPLOYMENT_DEFINITION_V1_URL, GIST_057BEB0, LEGACY_DEPLOYMENT_DEFINITIONS['helm-057beb0']);
    expect(choice).toEqual(jasmine.objectContaining({ url: DEPLOYMENT_DEFINITION_V1_URL, upgraded: true }));
    expect(choice.readOnlyReason).toBeUndefined();
  });

  it('keeps a definition in its own version when the current one rejects it', () => {
    const choice = choose(V9_URL, DEPLOYMENT_DEFINITION_V1_URL, helm);
    expect(choice.url).toBe(DEPLOYMENT_DEFINITION_V1_URL);
    expect(choice.loaded).toBe(schemas[DEPLOYMENT_DEFINITION_V1_URL]);
    expect(choice.upgraded).toBeFalse();
  });

  it('makes a definition read-only when its schema is not one of ours', () => {
    const nuvla = { type: 'nuvla-helm', version: '1.0', properties: { chart: 'redis' } };
    expect(choose(DEPLOYMENT_DEFINITION_V1_URL, 'urn:ocei:schema:nuvla-helm-deployment-definition', nuvla))
      .toEqual({ url: 'urn:ocei:schema:nuvla-helm-deployment-definition', upgraded: false, readOnlyReason: 'unsupported' });
  });

  it('makes a definition read-only when its own version cannot be fetched', () => {
    const missing = `${BASE}/v3/deployment-definition.json`;
    expect(choose(V9_URL, missing, helm).readOnlyReason).toBe('unreachable');
  });

  it('fails when the current version cannot be fetched, so the form can offer a retry', () => {
    let failed = false;
    chooseSchema(registry, `${BASE}/v4/deployment-definition.json`, undefined, () => true).subscribe({ error: () => (failed = true) });
    expect(failed).toBeTrue();
  });
});

describe('sameSchemaBase', () => {
  it('tells our versions apart from anything else', () => {
    expect(sameSchemaBase(`${BASE}/v1/a.json`, `${BASE}/v2/b.json`)).toBeTrue();
    expect(sameSchemaBase(`${BASE}/v1/a.json`, GIST_057BEB0)).toBeFalse();
    expect(sameSchemaBase(`${BASE}/v1/a.json`, 'urn:ocei:schema:x')).toBeFalse();
    expect(sameSchemaBase('https://other.example/schemas/v1/a.json', `${BASE}/v1/a.json`)).toBeFalse();
  });
});

describe('documentValidates', () => {
  const v1 = new SchemaRegistryService({} as HttpClient).compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);

  it('reads the stored value as the form would save it', () => {
    // values round-tripped as an array by the broker, and a release identity the schema dropped
    const stored = { type: 'helm', version: '1.0', properties: { repository: 'https://r.example', chart: 'c', version: '1', values: ['a: 1'], releaseName: 'x' } };
    expect(documentValidates(v1, stored)).toBeTrue();
  });

  it('rejects a type the version does not know', () => {
    expect(documentValidates(v1, { type: 'nuvla-helm', version: '1.0', properties: {} })).toBeFalse();
  });
});
