import { ResourceSpecType } from '../../services/resource-spec-service.service';
import { FormField, TableFormField } from './form-field.model';

const softwareSupportPackageColumns: TableFormField['columns'] = [
  { header: 'Name', getValue: item => item.name ?? '-' },
  { header: 'Description', getValue: item => item.description ?? '-' }
];


export interface ResourceConfig {
  columnCount: number;
  fields: FormField[];
}

export const resourceConfiguration: Partial<Record<ResourceSpecType, ResourceConfig>> = {
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
      { name: 'softwareSupportPackage', label: 'Software Support Package', type: 'table', colSpan: 3, required: true, multiple: false, items: [], columns: softwareSupportPackageColumns },
    ]
  }
};

export const resourceConfigUpdate: Partial<Record<ResourceSpecType, ResourceConfig>> = {
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
      { name: 'softwareSupportPackage', label: 'Software Support Package', type: 'table', colSpan: 3, required: true, readonly: true, multiple: false, items: [], columns: softwareSupportPackageColumns },
    ]
  }
};
