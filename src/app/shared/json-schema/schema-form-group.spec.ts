import { HttpClient } from '@angular/common/http';
import { DEPLOYMENT_DEFINITION_OVERLAY } from './overlays/deployment-definition.ui';
import { createSchemaForm, SchemaFormGroup } from './schema-form-group';
import { LoadedSchema, SchemaRegistryService } from './schema-registry.service';
import {
  DEPLOYMENT_DEFINITION_V1,
  DEPLOYMENT_DEFINITION_V1_URL,
  LEGACY_DEPLOYMENT_DEFINITIONS,
  MODEL_DEPLOYMENT_DEFINITIONS,
} from './testing/model-fixtures';

describe('SchemaFormGroup (deployment-definition v1)', () => {
  let loaded: LoadedSchema;
  const form = (value?: any) => createSchemaForm(loaded, value === undefined ? undefined : structuredClone(value), DEPLOYMENT_DEFINITION_OVERLAY);
  const props = (f: SchemaFormGroup) => f.get('properties') as SchemaFormGroup;

  beforeEach(() => {
    loaded = new SchemaRegistryService({} as HttpClient).compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);
  });

  describe('round trip of every deploymentDefinition in the model examples', () => {
    for (const [name, value] of Object.entries(MODEL_DEPLOYMENT_DEFINITIONS)) {
      it(`${name} loads, comes out unchanged and validates`, () => {
        const f = form(value);
        expect(f.schemaValue()).toEqual(value);
        expect(loaded.validate(f.schemaValue())).toEqual([]);
        expect(f.valid).toBeTrue();
      });
    }
  });

  describe('values written against the older gist revision 057beb0', () => {
    it('unwraps a one-element helm values array and validates', () => {
      const f = form(LEGACY_DEPLOYMENT_DEFINITIONS['helm-057beb0']);
      expect(f.schemaValue()['properties']).toEqual(jasmine.objectContaining({ values: 'replicaCount: 1' }));
      expect(f.valid).toBeTrue();
    });

    it('keeps a docker definition as it was', () => {
      const value = LEGACY_DEPLOYMENT_DEFINITIONS['docker-057beb0'];
      const f = form(value);
      expect(f.schemaValue()).toEqual(value);
      expect(f.valid).toBeTrue();
    });
  });

  describe('a new definition', () => {
    it('starts as helm, schema version 1.0, invalid until the chart is given', () => {
      const f = form();
      expect(f.get('type')!.value).toBe('helm');
      expect(f.get('version')!.value).toBe('1.0');
      expect(Object.keys(props(f).controls)).toEqual(['repository', 'chart', 'version', 'values', 'enforcedValues']);
      expect(f.valid).toBeFalse();

      props(f).patchValue({ repository: 'https://helm.github.io/examples', chart: 'examples/hello-world', version: '0.1.0' });
      expect(f.valid).toBeTrue();
      expect(f.schemaValue()).toEqual({
        type: 'helm', version: '1.0',
        properties: { repository: 'https://helm.github.io/examples', chart: 'examples/hello-world', version: '0.1.0' },
      });
    });

    it('swaps the properties for the selected type', () => {
      const f = form();
      f.get('type')!.setValue('docker');
      expect(Object.keys(props(f).controls)).toEqual(['image', 'tag', 'composeFile', 'envFile']);
      expect(props(f).get('tag')!.value).toBe('latest');

      f.get('type')!.setValue('opennebula');
      expect(props(f).get('backend')).toBeTruthy();
      expect(props(f).get('image')).toBeNull();
    });

    it('follows the OpenNebula backend', () => {
      const f = form({ type: 'opennebula', version: '1.0', properties: {} });
      const p = props(f);

      p.get('backend')!.setValue('lxc');
      expect(p.get('templateId')!.hasError('required')).toBeTrue();
      expect(p.get('kubernetesVersion')).toBeNull();

      p.get('backend')!.setValue('oneks');
      expect(p.get('templateId')).toBeNull();
      expect(p.get('kubernetesVersion')!.hasError('required')).toBeTrue();
      expect(p.get('flavour')!.value).toBe('standalone');
    });

    it('parses an object edited as YAML and leaves unticked booleans out', () => {
      const f = form({ type: 'opennebula', version: '1.0', properties: { backend: 'lxc', templateId: 237 } });
      props(f).get('context')!.setValue('APP_ENV: production\nLOG_LEVEL: debug');
      const value = f.schemaValue();
      expect(value['properties']).toEqual({ backend: 'lxc', templateId: 237, context: { APP_ENV: 'production', LOG_LEVEL: 'debug' } });
      expect(f.valid).toBeTrue();
    });

    it('adds an optional nested object only when switched on, with its defaults', () => {
      const f = form({ type: 'opennebula', version: '1.0', properties: { backend: 'lxc', templateId: 237 } });
      expect(props(f).get('healthCheck')).toBeNull();

      props(f).setObjectEnabled('healthCheck', true);
      expect((f.schemaValue()['properties'] as any).healthCheck).toEqual({ protocol: 'http', path: '/', expectedStatus: 200 });

      props(f).setObjectEnabled('healthCheck', false);
      expect((f.schemaValue()['properties'] as any).healthCheck).toBeUndefined();
    });

    it('reports schema errors on the root, without the other branches\' noise', () => {
      const f = form({ type: 'opennebula', version: '1.0', properties: { backend: 'lxc' } });
      expect(f.valid).toBeFalse();
      const errors = f.errors?.['schema'];
      expect(errors).toEqual([{ path: '/properties', message: "must have required property 'templateId' (templateId)" }]);
    });

    it('rejects a lock on a field the backend does not have', () => {
      const f = form({ type: 'opennebula', version: '1.0', properties: { backend: 'vm', templateId: 1 } });
      props(f).get('enforcedValues')!.setValue('kubernetesVersion: v1.34.2');
      expect(f.valid).toBeFalse();
    });
  });

  it('labels Helm fields from the overlay and OpenNebula fields from the schema', () => {
    const helm = form();
    expect(props(helm).fields.find(f => f.name === 'values')!.label).toBe('PACKAGE_DEPLOYMENT._default_helm_values');

    const one = form({ type: 'opennebula', version: '1.0', properties: { backend: 'vm' } });
    expect(props(one).fields.find(f => f.name === 'templateId')!.label).toBe('VM template');
    expect(props(one).fields.find(f => f.name === 'enforcedValues')!.label).toBe('PACKAGE_DEPLOYMENT._enforced_opennebula_values');
  });
});
