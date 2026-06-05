import { components } from './software-catalog';

export type SoftwareSupportPackage = components['schemas']['SoftwareSupportPackage'];
export type SoftwareSupportPackageRef = components['schemas']['SoftwareSupportPackageRef'];
export type SoftwareSupportPackageSpecification = components['schemas']['SoftwareSupportPackageSpecification'];
export type SoftwareResource = components['schemas']['SoftwareResource'];
export type SoftwareSpecification = components['schemas']['SoftwareSpecification'];

export type ResourceStatusType = components['schemas']['ResourceStatusType'];
export const RESOURCE_STATUS_TYPES: ResourceStatusType[] = ['standby', 'alarm', 'available', 'reserved', 'unknown', 'suspended'];
