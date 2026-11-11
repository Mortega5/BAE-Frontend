import { components } from './software-catalog';

export type SoftwareSupportPackage = components['schemas']['SoftwareSupportPackage'];
export type SoftwareSupportPackageRef = components['schemas']['SoftwareSupportPackageRef'];
export type SoftwareSupportPackageSpecification = components['schemas']['SoftwareSupportPackageSpecification'];
export type SoftwareResource = components['schemas']['SoftwareResource'];
export type SoftwareSpecification = components['schemas']['SoftwareSpecification'];
export type SoftwareCharacteristic = components['schemas']['Characteristic'];

/**
 * A deploymentDefinition document. Its shape is owned by the published `deployment-definition`
 * JSON Schema (selected by `type`), not by this type: the form is generated from the schema, and a
 * new deployment type needs no change here.
 */
export interface SoftwareDeploymentDefinition {
  type: string;
  version: string;
  properties: Record<string, any>;
}

export type ResourceStatusType = components['schemas']['ResourceStatusType'];
export const RESOURCE_STATUS_TYPES: ResourceStatusType[] = ['standby', 'alarm', 'available', 'reserved', 'unknown', 'suspended'];
