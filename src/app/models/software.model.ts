import { components } from './software-catalog';

export type SoftwareSupportPackage = components['schemas']['SoftwareSupportPackage'];
export type SoftwareSupportPackageRef = components['schemas']['SoftwareSupportPackageRef'];
export type SoftwareSupportPackageSpecification = components['schemas']['SoftwareSupportPackageSpecification'];
export type SoftwareResource = components['schemas']['SoftwareResource'];
export type SoftwareSpecification = components['schemas']['SoftwareSpecification'];
export type SoftwareCharacteristic = components['schemas']['Characteristic'];
export interface HelmDeploymentProperties {
  repository: string;
  chart: string;
  version: string;
  releaseName: string;
  namespace?: string;
  values?: string | string[];
}

export interface DockerDeploymentProperties {
  image: string;
  tag?: string;
  composeFile?: string;
  envFile?: string;
}

export interface HelmDeploymentDefinition {
  type: 'helm';
  version: string;
  properties: HelmDeploymentProperties;
}

export interface DockerDeploymentDefinition {
  type: 'docker';
  version: string;
  properties: DockerDeploymentProperties;
}

export type SoftwareDeploymentDefinition = HelmDeploymentDefinition | DockerDeploymentDefinition;

export type ResourceStatusType = components['schemas']['ResourceStatusType'];
export const RESOURCE_STATUS_TYPES: ResourceStatusType[] = ['standby', 'alarm', 'available', 'reserved', 'unknown', 'suspended'];
