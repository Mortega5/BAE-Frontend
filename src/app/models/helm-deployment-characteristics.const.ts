import { components } from './product-catalog';

type ProductSpecificationCharacteristic = components['schemas']['ProductSpecificationCharacteristic'];

/** Characteristics auto-added to a product spec when a selected SoftwareSpecification's
 * deployment definition is of type 'helm'. Kept only while relevant — see
 * syncHelmDeploymentCharacteristics() in create-product-spec/update-product-spec.
 *
 * Only what the consumer configures AT PURCHASE belongs here. The release identity
 * (deploymentName, namespace) is not bought, it is chosen per deployment and supplied in the
 * deployment order, which is what allows one subscription to host several deployments. */
export const HELM_DEPLOYMENT_CHARACTERISTICS: ProductSpecificationCharacteristic[] = [
  {
    name: 'helmValuesOverride',
    description: 'Helm values applied to every deployment of this subscription. Chart and provider defaults sit below them; the provider\'s enforced values and any Blueprint wiring sit above and cannot be overridden from here.',
    valueType: 'object',
    configurable: true,
    minCardinality: 0,
    maxCardinality: 1,
    productSpecCharacteristicValue: [{ isDefault: true, value: {} }],
  },
];
