import { ResourceSpecServiceService, ResourceSpecType } from '../../services/resource-spec-service.service';
import { FormField, PaginatedTableFormField } from './form-field.model';

const softwareSupportPackageColumns: PaginatedTableFormField['columns'] = [
  { header: 'Name', getValue: item => item.name ?? '-' },
  { header: 'Description', getValue: item => item.description ?? '-' }
];

export interface ResourceConfig {
  columnCount: number;
  fields: FormField[];
}

export interface ResourceConfigContext {
  partyId: string;
  resSpecService: ResourceSpecServiceService;
}

function softwareSupportPackageField(ctx: ResourceConfigContext, readonly: boolean): FormField {
  return {
    name: 'softwareSupportPackage', label: 'Software Support Package', type: 'paginatedTable', colSpan: 3,
    required: true, readonly, multiple: false,
    fetchPage: params => ctx.resSpecService.getSoftwareSupportPackagesPaged(params, ctx.partyId),
    columns: softwareSupportPackageColumns,
  };
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
        softwareSupportPackageField(ctx, false),
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
        softwareSupportPackageField(ctx, true),
      ]
    }
  };
}
