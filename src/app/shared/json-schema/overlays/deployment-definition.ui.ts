import { disjointValueChannelsValidator } from 'src/app/validators/validators';
import { SchemaUiOverlay } from '../ui-overlay';

const HELM = { '/type': 'helm' };
const DOCKER = { '/type': 'docker' };
const OPENNEBULA = { '/type': 'opennebula' };

/**
 * Presentation hints for `deployment-definition` (any version). Shape, required fields, enums,
 * defaults and validation all come from the schema; this only names fields, picks editors for
 * values the schema types as plain strings or free objects, and lays them out.
 *
 * A new branch or field in a future schema version renders without an entry here, using the
 * schema's own `title` and `description`.
 */
export const DEPLOYMENT_DEFINITION_OVERLAY: SchemaUiOverlay = {
  '/type': {
    label: 'PACKAGE_DEPLOYMENT._type', order: 0, colSpan: 2,
    optionLabels: {
      helm: 'PACKAGE_DEPLOYMENT._type_helm',
      docker: 'PACKAGE_DEPLOYMENT._type_docker',
      opennebula: 'PACKAGE_DEPLOYMENT._type_opennebula',
    },
  },
  '/version': { label: 'PACKAGE_DEPLOYMENT._schema_version', order: 1, colSpan: 2, defaultValue: '1.0' },
  '/properties': [
    // The provider's two value channels sit at opposite ends of the merge, so a key belongs to one.
    { when: HELM, heading: 'PACKAGE_DEPLOYMENT._helm_properties', hint: '', groupValidators: [disjointValueChannelsValidator] },
    { when: DOCKER, heading: 'PACKAGE_DEPLOYMENT._docker_properties', hint: '' },
    { when: OPENNEBULA, heading: 'PACKAGE_DEPLOYMENT._opennebula_properties', hint: '' },
  ],

  // Helm
  '/properties/repository': { when: HELM, label: 'PACKAGE_DEPLOYMENT._repository_url', colSpan: 4 },
  '/properties/chart': { when: HELM, label: 'PACKAGE_DEPLOYMENT._chart_name', colSpan: 2 },
  '/properties/version': { when: HELM, label: 'PACKAGE_DEPLOYMENT._chart_version', colSpan: 2 },
  '/properties/values': {
    when: HELM, type: 'code', language: 'yaml', placeholder: 'replicaCount: 1',
    label: 'PACKAGE_DEPLOYMENT._default_helm_values', hint: 'PACKAGE_DEPLOYMENT._default_helm_values_hint',
  },
  '/properties/enforcedValues': [
    {
      when: HELM, type: 'code', language: 'yaml', placeholder: 'image:\n  tag: 1.16.0',
      label: 'PACKAGE_DEPLOYMENT._enforced_helm_values', hint: 'PACKAGE_DEPLOYMENT._enforced_helm_values_hint',
    },
    {
      when: OPENNEBULA, type: 'code', language: 'yaml', placeholder: 'templateId: 237', order: 100,
      label: 'PACKAGE_DEPLOYMENT._enforced_opennebula_values', hint: 'PACKAGE_DEPLOYMENT._enforced_opennebula_values_hint',
    },
  ],

  // Docker
  '/properties/image': { when: DOCKER, label: 'PACKAGE_DEPLOYMENT._docker_image', colSpan: 3 },
  '/properties/tag': { when: DOCKER, label: 'PACKAGE_DEPLOYMENT._image_tag', colSpan: 1 },
  '/properties/composeFile': { when: DOCKER, type: 'code', language: 'yaml', label: 'PACKAGE_DEPLOYMENT._compose_file' },
  '/properties/envFile': { when: DOCKER, type: 'textarea', label: 'PACKAGE_DEPLOYMENT._env_file' },

  // OpenNebula: labels and descriptions come from the schema; only editors and order are set here.
  '/properties/backend': { when: OPENNEBULA, order: 0, colSpan: 2 },
  '/properties/description': { when: OPENNEBULA, colSpan: 4 },
  '/properties/context': { when: OPENNEBULA, type: 'code', language: 'yaml', placeholder: 'APP_ENV: production', order: 90 },
};
