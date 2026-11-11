import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { DEPLOYMENT_DEFINITION_OVERLAY } from 'src/app/shared/json-schema/overlays/deployment-definition.ui';
import { createSchemaForm } from 'src/app/shared/json-schema/schema-form-group';
import { SchemaRegistryService } from 'src/app/shared/json-schema/schema-registry.service';
import {
  DEPLOYMENT_DEFINITION_V1,
  DEPLOYMENT_DEFINITION_V1_URL,
  MODEL_DEPLOYMENT_DEFINITIONS,
} from 'src/app/shared/json-schema/testing/model-fixtures';
import { environment } from 'src/environments/environment';
import { ResourceSpecFormComponent } from './resource-spec-form.component';

/** What a SoftwareSpecification sends: the package characteristics and the declared spec ones. */
describe('ResourceSpecFormComponent payload', () => {
  const loaded = new SchemaRegistryService({} as HttpClient).compile(DEPLOYMENT_DEFINITION_V1_URL, DEPLOYMENT_DEFINITION_V1);

  function component(): ResourceSpecFormComponent {
    const c = new ResourceSpecFormComponent(
      { getValidLoginInfo: () => undefined } as any,
      { messages$: of() } as any,
      {} as any, {} as any, {} as any, {} as any, {} as any, {} as any,
    );
    c.generalForm.patchValue({ name: 'demo', baseTemplate: 'SoftwareSpecification' });
    return c;
  }

  function prepare(c: ResourceSpecFormComponent): any {
    (c as any).prepareData();
    return c.resourceData as any;
  }

  it('sends an OpenNebula OneKS package with its artifact and environment types', () => {
    const value = MODEL_DEPLOYMENT_DEFINITIONS['opennebula/oneks-sw-support-pkg.json'];
    const c = component();
    c.onDeploymentFormReady(createSchemaForm(loaded, structuredClone(value), DEPLOYMENT_DEFINITION_OVERLAY));

    const data = prepare(c);
    expect(data.resourceCharacteristic).toEqual([
      { name: 'deploymentDefinition', valueType: 'DeploymentDefinition', value, '@schemaLocation': environment.DEPLOYMENT_SCHEMA_LOCATION },
      { name: 'artifactType', valueType: 'string', value: 'OpenNebulaResource' },
      { name: 'requiredEnvironmentType', valueType: 'string', value: 'opennebula-cluster' },
    ]);
    expect(data.resourceSpecCharacteristic.map((ch: any) => ch.name))
      .toEqual(['deploymentName', 'deploymentTarget', 'externalDeploymentId', 'opennebulaOverride']);
  });

  it('keeps the user\'s characteristics and never declares one twice', () => {
    const c = component();
    c.onDeploymentFormReady(createSchemaForm(loaded, structuredClone(MODEL_DEPLOYMENT_DEFINITIONS['hello-world/sw-support-pkg.json']), DEPLOYMENT_DEFINITION_OVERLAY));
    c.prodChars = [{ name: 'namespace', valueType: 'string', description: 'mine' } as any, { name: 'tier', valueType: 'string' } as any];

    const chars = prepare(c).resourceSpecCharacteristic;
    expect(chars.map((ch: any) => ch.name))
      .toEqual(['namespace', 'tier', 'deploymentName', 'credentialRef', 'deploymentTarget', 'externalDeploymentId', 'helmValuesOverride']);
    expect(chars[0].description).toBe('mine');
  });

  it('migrates a stored package that was not opened: drops the release identity, re-stamps the schema', () => {
    const c = component();
    (c as any).originalDeploymentChar = {
      name: 'deploymentDefinition', valueType: 'deployment',
      '@schemaLocation': 'https://gist.githubusercontent.com/vramperez/e50df47dde789a05e0a4bdca39cf7349/raw/54a6b39/deployment-definition.json',
      value: { type: 'helm', version: '1.0', properties: { repository: 'https://r.example', chart: 'c', version: '1', releaseName: 'x', namespace: 'y' } },
    };

    const [definition, artifact, environmentType] = prepare(c).resourceCharacteristic;
    expect(definition.valueType).toBe('DeploymentDefinition');
    expect(definition['@schemaLocation']).toBe(environment.DEPLOYMENT_SCHEMA_LOCATION);
    expect(definition.value.properties).toEqual({ repository: 'https://r.example', chart: 'c', version: '1' });
    expect(loaded.validate(definition.value)).toEqual([]);
    expect(artifact.value).toBe('HelmChart');
    expect(environmentType.value).toBe('kubernetes-cluster');
  });

  describe('schema version', () => {
    const V1 = DEPLOYMENT_DEFINITION_V1_URL;
    const OLDER = 'https://tm-forum-model-66feba.pages.o-cei.eu/schemas/v0/deployment-definition.json';
    const stored = (value: any, location: string) => ({ name: 'deploymentDefinition', valueType: 'DeploymentDefinition', '@schemaLocation': location, value });

    it('stamps the version the opened form was built from', () => {
      const c = component();
      const form = createSchemaForm({ ...loaded, url: OLDER }, structuredClone(MODEL_DEPLOYMENT_DEFINITIONS['hello-world/sw-support-pkg.json']), DEPLOYMENT_DEFINITION_OVERLAY);
      c.onDeploymentFormReady(form);
      expect(prepare(c).resourceCharacteristic[0]['@schemaLocation']).toBe(OLDER);
      expect(c.deploymentSchemaLocation).toBe(OLDER);
    });

    it('resends an unopened package through the chosen version: arrays unwrapped, stamped with it', () => {
      const c = component();
      const value = { type: 'helm', version: '1.0', properties: { repository: 'https://r.example', chart: 'c', version: '1', values: ['a: 1'], releaseName: 'x' } };
      (c as any).originalDeploymentChar = stored(value, OLDER);
      (c as any).storedDeploymentChoice = { url: V1, loaded, upgraded: true };

      const [definition] = prepare(c).resourceCharacteristic;
      expect(definition['@schemaLocation']).toBe(V1);
      expect(definition.value.properties).toEqual({ repository: 'https://r.example', chart: 'c', version: '1', values: 'a: 1' });
      expect(loaded.validate(definition.value)).toEqual([]);
    });

    it('resends a read-only package exactly as stored and does not block saving', () => {
      const c = component();
      const value = { type: 'nuvla-helm', version: '1.0', properties: { chart: 'redis', releaseName: 'x' } };
      const original = stored(value, 'urn:ocei:schema:nuvla-helm-deployment-definition');
      (c as any).originalDeploymentChar = original;
      (c as any).storedDeploymentChoice = { url: original['@schemaLocation'], upgraded: false, readOnlyReason: 'unsupported' };
      c.onDeploymentReadOnly();

      const data = prepare(c);
      expect(data.resourceCharacteristic).toEqual([original]);
      expect(data.resourceSpecCharacteristic).toEqual([]);
      expect(c.canSaveDraft).toBeTrue();
    });
  });
});
