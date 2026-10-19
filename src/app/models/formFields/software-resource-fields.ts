import { ResourceSpecServiceService, ResourceSpecType } from '../../services/resource-spec-service.service';
import { FormField } from './form-field.model';

export interface ResourceConfig {
  columnCount: number;
  fields: FormField[];
}

export interface ResourceConfigContext {
  partyId: string;
  resSpecService: ResourceSpecServiceService;
}

export function buildResourceConfiguration(ctx: ResourceConfigContext): Partial<Record<ResourceSpecType, ResourceConfig>> {
  return {
    'SoftwareSpecification': {
      columnCount: 3,
      fields: [
        { name: 'isDistributable', label: 'Distributable', type: 'boolean', required: false, colSpan: 1 },
        { name: 'isExperimental', label: 'Experimental', type: 'boolean', required: false, colSpan: 1 },
        { name: 'numUsersMax', label: 'Max number of users', type: 'number', required: false, colSpan: 1 },
        { name: 'maintenanceVersion', label: 'Maintenance Version', type: 'string', required: false, colSpan: 1 },
        { name: 'majorVersion', label: 'Major Version', type: 'string', required: false, colSpan: 1 },
        { name: 'minorVersion', label: 'Minor Version', type: 'string', required: false, colSpan: 1 },
        { name: 'numberProcessActiveTotal', label: 'Max number of total processes', type: 'number', required: false },
        // No softwareSupportPackage picker: the proxy creates the support package together with the
        // SoftwareSpecification and links it, so there is nothing for the seller to choose.
      ]
    }
  };
}

export function buildResourceConfigUpdate(ctx: ResourceConfigContext): Partial<Record<ResourceSpecType, ResourceConfig>> {
  return {
    'SoftwareSpecification': {
      columnCount: 3,
      fields: [
        { name: 'isDistributable', label: 'Distributable', type: 'boolean', required: false, colSpan: 1 },
        { name: 'isExperimental', label: 'Experimental', type: 'boolean', required: false, colSpan: 1 },
        { name: 'numUsersMax', label: 'Max number of users', type: 'number', required: false, colSpan: 1 },
        { name: 'maintenanceVersion', label: 'Maintenance Version', type: 'string', required: false, colSpan: 1 },
        { name: 'majorVersion', label: 'Major Version', type: 'string', required: false, colSpan: 1 },
        { name: 'minorVersion', label: 'Minor Version', type: 'string', required: false, colSpan: 1 },
        { name: 'numberProcessActiveTotal', label: 'Max number of total processes', type: 'number', required: false },
      ]
    }
  };
}
