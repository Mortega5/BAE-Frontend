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
      {} as any, {} as any, {} as any, {} as any, {} as any,
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
});
