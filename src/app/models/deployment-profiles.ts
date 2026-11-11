import { SoftwareDeploymentDefinition } from './software.model';

/**
 * What a deploymentDefinition implies for the rest of the catalogue entry, per deployment `type`.
 * Data, not code: adding a deployment type to the schema means adding a row here, not a branch in a
 * component. Copied from the TM Forum model's examples (`examples/*\/json/*sw-support-pkg.json` and
 * `*software-spec.json`).
 */
export interface DeploymentProfile {
  /** `artifactType` written on the SoftwareSupportPackage. */
  artifactType(definition: SoftwareDeploymentDefinition): string;
  /** `requiredEnvironmentType` written on the SoftwareSupportPackage. */
  requiredEnvironmentType: string;
  /** Deployment-time characteristics the SoftwareSpecification must declare. */
  specCharacteristics(definition: SoftwareDeploymentDefinition): SpecCharacteristic[];
}

export interface SpecCharacteristic {
  name: string;
  description: string;
  valueType: string;
  configurable: boolean;
  isUnique?: boolean;
  minCardinality: number;
  maxCardinality: number;
  resourceSpecCharacteristicValue?: { isDefault: boolean; value: unknown }[];
}

const deploymentName = (description: string): SpecCharacteristic => ({
  name: 'deploymentName', description, valueType: 'string', configurable: true, isUnique: true, minCardinality: 1, maxCardinality: 1,
});

const NAMESPACE: SpecCharacteristic = {
  name: 'namespace',
  description: 'Kubernetes namespace for this deployment instance. Supplied per deployment in the ResourceOrder; never fixed by the provider. The Portal generates one when the consumer does not supply it.',
  valueType: 'string', configurable: true, minCardinality: 1, maxCardinality: 1,
};

const CREDENTIAL_REF: SpecCharacteristic = {
  name: 'credentialRef',
  description: 'Handle of the credential this deployment uses to reach its target environment, chosen when the deploy order is placed. Absent when an orchestrator executes the deployment.',
  valueType: 'string', configurable: true, minCardinality: 0, maxCardinality: 1,
};

const DEPLOYMENT_TARGET: SpecCharacteristic = {
  name: 'deploymentTarget',
  description: 'Where an orchestrator places this deployment. Supplied in the deploy order and recorded on the deployment; mutually exclusive with hostedOn. See the schema at @schemaLocation on the instance.',
  valueType: 'DeploymentTarget', configurable: true, minCardinality: 0, maxCardinality: 1,
};

const EXTERNAL_DEPLOYMENT_ID: SpecCharacteristic = {
  name: 'externalDeploymentId',
  description: 'Id of what the orchestrator created upstream, written by the connector after it executes. Opaque; never parsed.',
  valueType: 'string', configurable: false, minCardinality: 0, maxCardinality: 1,
};

const HELM_VALUES_OVERRIDE: SpecCharacteristic = {
  name: 'helmValuesOverride',
  description: 'JSON object of Helm values to merge at deploy time. Overrides chart defaults (values.yaml). Use standard Helm chart keys — e.g. replicaCount, image, service, ingress, resources.',
  valueType: 'object', configurable: true, minCardinality: 0, maxCardinality: 1,
  resourceSpecCharacteristicValue: [{ isDefault: true, value: {} }],
};

const OPENNEBULA_OVERRIDE: SpecCharacteristic = {
  name: 'opennebulaOverride',
  description: 'What the consumer may change on this OneKS cluster, as a JSON object: the number of worker nodes and the node group to scale. Supplied on the Product at purchase, or per deployment in an order. See the schema at @schemaLocation on the instance (opennebula-override).',
  valueType: 'object', configurable: true, minCardinality: 0, maxCardinality: 1,
  resourceSpecCharacteristicValue: [{ isDefault: true, value: {} }],
};

export const DEPLOYMENT_PROFILES: Record<string, DeploymentProfile> = {
  helm: {
    artifactType: () => 'HelmChart',
    requiredEnvironmentType: 'kubernetes-cluster',
    specCharacteristics: () => [
      deploymentName('Helm release name for this deployment instance. Supplied per deployment in the ResourceOrder; never fixed by the provider. Unique within its namespace — the Portal generates one when the consumer does not supply it.'),
      NAMESPACE, CREDENTIAL_REF, DEPLOYMENT_TARGET, EXTERNAL_DEPLOYMENT_ID, HELM_VALUES_OVERRIDE,
    ],
  },
  // The model has no Docker example yet: Helm's row without the Kubernetes-only characteristics.
  docker: {
    artifactType: definition => (definition.properties?.['composeFile'] ? 'DockerCompose' : 'DockerImage'),
    requiredEnvironmentType: 'docker-host',
    specCharacteristics: () => [
      deploymentName('Name of this deployment instance. Supplied per deployment in the ResourceOrder; never fixed by the provider.'),
      CREDENTIAL_REF, DEPLOYMENT_TARGET, EXTERNAL_DEPLOYMENT_ID,
    ],
  },
  opennebula: {
    artifactType: () => 'OpenNebulaResource',
    requiredEnvironmentType: 'opennebula-cluster',
    specCharacteristics: definition => [
      deploymentName('Name of this deployment. The connector names the OpenNebula VM, container or cluster after it. Supplied per deployment, never fixed by the provider.'),
      DEPLOYMENT_TARGET, EXTERNAL_DEPLOYMENT_ID,
      ...(definition.properties?.['backend'] === 'oneks' ? [OPENNEBULA_OVERRIDE] : []),
    ],
  },
};

export function deploymentProfile(definition: SoftwareDeploymentDefinition | undefined): DeploymentProfile | undefined {
  return definition?.type ? DEPLOYMENT_PROFILES[definition.type] : undefined;
}
