import { deploymentProfile } from './deployment-profiles';
import { MODEL_DEPLOYMENT_DEFINITIONS } from '../shared/json-schema/testing/model-fixtures';

describe('deploymentProfile', () => {
  const names = (definition: any) => deploymentProfile(definition)!.specCharacteristics(definition).map(c => c.name);

  it('matches the model examples for helm', () => {
    const helm = MODEL_DEPLOYMENT_DEFINITIONS['orchestrator/sw-support-pkg.json'];
    const profile = deploymentProfile(helm)!;
    expect(profile.artifactType(helm)).toBe('HelmChart');
    expect(profile.requiredEnvironmentType).toBe('kubernetes-cluster');
    // orchestrator/json/software-spec.json
    expect(names(helm)).toEqual(['deploymentName', 'namespace', 'credentialRef', 'deploymentTarget', 'externalDeploymentId', 'helmValuesOverride']);
  });

  it('matches the model examples for OpenNebula, with the override channel only on OneKS', () => {
    const lxc = MODEL_DEPLOYMENT_DEFINITIONS['opennebula/lxc-sw-support-pkg.json'];
    const oneks = MODEL_DEPLOYMENT_DEFINITIONS['opennebula/oneks-sw-support-pkg.json'];
    expect(deploymentProfile(lxc)!.artifactType(lxc)).toBe('OpenNebulaResource');
    expect(deploymentProfile(lxc)!.requiredEnvironmentType).toBe('opennebula-cluster');
    // opennebula/json/{lxc,oneks}-software-spec.json
    expect(names(lxc)).toEqual(['deploymentName', 'deploymentTarget', 'externalDeploymentId']);
    expect(names(oneks)).toEqual(['deploymentName', 'deploymentTarget', 'externalDeploymentId', 'opennebulaOverride']);
  });

  it('tells a compose file from a plain image for docker', () => {
    const image = { type: 'docker', version: '1.0', properties: { image: 'nginx' } };
    const compose = { type: 'docker', version: '1.0', properties: { image: 'nginx', composeFile: 'services: {}' } };
    expect(deploymentProfile(image)!.artifactType(image)).toBe('DockerImage');
    expect(deploymentProfile(compose)!.artifactType(compose)).toBe('DockerCompose');
    expect(deploymentProfile(image)!.requiredEnvironmentType).toBe('docker-host');
  });

  it('has no profile for an unknown type', () => {
    expect(deploymentProfile({ type: 'nomad', version: '1.0', properties: {} })).toBeUndefined();
    expect(deploymentProfile(undefined)).toBeUndefined();
  });
});
