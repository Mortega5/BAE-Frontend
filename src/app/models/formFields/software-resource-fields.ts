import { ResourceSpecType } from '../../services/resource-spec-service.service';
import { FormField } from './form-field.model';


export interface ResourceConfig {
  columnCount: number;
  fields: FormField[];
}

export const resourceConfiguration: Partial<Record<ResourceSpecType, ResourceConfig>> = {
  'SoftwareSpecification': {
    columnCount: 3,
    fields: [
      { name: 'softwareSupportPackage', label: 'Software Support Package', type: 'select', options: [], colSpan: 3, required: true },
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
