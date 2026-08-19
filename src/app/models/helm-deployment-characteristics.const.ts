import { components } from './product-catalog';

type ProductSpecificationCharacteristic = components['schemas']['ProductSpecificationCharacteristic'];

/** Characteristics auto-added to a product spec when a selected SoftwareSpecification's
 * deployment definition is of type 'helm'. Kept only while relevant — see
 * syncHelmDeploymentCharacteristics() in create-product-spec/update-product-spec. */
export const HELM_DEPLOYMENT_CHARACTERISTICS: ProductSpecificationCharacteristic[] = [
  {
    name: 'namespace',
    description: 'Kubernetes namespace for the deployment.',
    valueType: 'string',
    configurable: true,
    minCardinality: 1,
    maxCardinality: 1,
    productSpecCharacteristicValue: [{ isDefault: true, value: 'default' }] as any[],
  },
  {
    name: 'helmValuesOverride',
    description: 'JSON object of Helm values to merge at deploy time. Overrides chart defaults. At Blueprint deploy time, BPO may inject CACHE_HOST pointing to the cache component\'s endpoint (future work — helmValuesFromSteps not in scope for v1).',
    valueType: 'object',
    configurable: true,
    minCardinality: 0,
    maxCardinality: 1,
    productSpecCharacteristicValue: [{ isDefault: true, value: {} }],
  },
];
