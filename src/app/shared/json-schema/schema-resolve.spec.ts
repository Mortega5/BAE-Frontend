import { resolveObjectSchema } from './schema-resolve';
import { DEPLOYMENT_DEFINITION_V1 } from './testing/model-fixtures';
import { JsonSchema } from './json-schema.model';

describe('resolveObjectSchema', () => {
  const root = DEPLOYMENT_DEFINITION_V1 as JsonSchema;
  const propertiesOf = (type: string) => resolveObjectSchema(root, { type }).properties['properties'];

  it('applies the oneOf branch the discriminator selects', () => {
    const helm = resolveObjectSchema(root, { type: 'helm' });
    expect(helm.discriminators).toEqual(['type']);
    expect(helm.branchTitle).toBe('HelmDeploymentDefinition');
    expect(Object.keys(helm.properties['properties'].properties!)).toEqual(['repository', 'chart', 'version', 'values', 'enforcedValues']);
    expect(helm.properties['properties'].required).toEqual(['repository', 'chart', 'version']);

    expect(Object.keys(propertiesOf('docker').properties!)).toEqual(['image', 'tag', 'composeFile', 'envFile']);
  });

  it('leaves the node as declared when no branch matches', () => {
    const none = resolveObjectSchema(root, {});
    expect(none.branchTitle).toBeUndefined();
    expect(none.properties['properties'].properties).toBeUndefined();
    expect(none.required).toEqual(['type', 'version', 'properties']);
  });

  describe('opennebula backends (allOf if/then)', () => {
    const backend = (name: string) => resolveObjectSchema(propertiesOf('opennebula'), { backend: name });

    it('reports backend as the discriminator', () => {
      expect(backend('lxc').discriminators).toEqual(['backend']);
    });

    it('lxc requires templateId and drops the OneKS fields', () => {
      const lxc = backend('lxc');
      expect(lxc.required).toContain('templateId');
      expect(lxc.properties['kubernetesVersion']).toBeUndefined();
      expect(lxc.properties['workers']).toBeUndefined();
      expect(lxc.properties['context']).toBeDefined();
      expect(lxc.properties['healthCheck']).toBeDefined();
    });

    it('oneks requires kubernetesVersion and drops the VM fields', () => {
      const oneks = backend('oneks');
      expect(oneks.required).toEqual(['backend', 'kubernetesVersion']);
      expect(oneks.properties['templateId']).toBeUndefined();
      expect(oneks.properties['healthCheck']).toBeUndefined();
      expect(oneks.properties['workers']).toBeDefined();
    });

    it('narrows the lockable fields to the backend', () => {
      const names = backend('vm').properties['enforcedValues'].propertyNames?.enum;
      expect(names).toEqual(['templateId', 'persistent', 'servicePort']);
    });

    it('applies no backend block until one is chosen', () => {
      const unset = resolveObjectSchema(propertiesOf('opennebula'), {});
      expect(unset.required).toEqual(['backend']);
      expect(unset.properties['templateId']).toBeDefined();
    });
  });
});
