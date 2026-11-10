import { datasetPolicyUid } from 'src/app/services/dataset.service';

/** What the seller starts from: the proxy adds the path of the file to the target, and the uid and the buyer are set elsewhere. */
export const DATASET_POLICY_TEMPLATE = JSON.stringify({
  '@context': { odrl: 'http://www.w3.org/ns/odrl/2/' },
  '@type': 'odrl:Policy',
  'odrl:permission': { 'odrl:action': { '@id': 'odrl:read' } },
}, null, 2);

const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export interface DatasetPolicyCheck {
  policy?: Record<string, any>;
  /** Translation key of the first problem found */
  error?: string;
}

/** Client-side copy of the proxy's rules for a custom policy, to save a round trip (the proxy checks again). */
export function checkDatasetPolicy(text: string | null | undefined): DatasetPolicyCheck {
  if (!text?.trim()) return { error: 'DATASETS._policy_error_empty' };

  let policy: unknown;
  try {
    policy = JSON.parse(text);
  } catch {
    return { error: 'DATASETS._policy_error_invalid_json' };
  }
  if (!isObject(policy)) return { error: 'DATASETS._policy_error_not_object' };

  const permission = policy['odrl:permission'];
  if (!isObject(permission)) return { error: 'DATASETS._policy_error_permission' };
  if ('odrl:assignee' in policy || 'odrl:assignee' in permission) return { error: 'DATASETS._policy_error_assignee' };
  if (('odrl:target' in permission && !isObject(permission['odrl:target']))
    || ('odrl:target' in policy && !isObject(policy['odrl:target']))) {
    return { error: 'DATASETS._policy_error_target' };
  }
  return { policy };
}

/** The `authorizationPolicy` characteristic of a product selling a custom dataset; the uid is forced, whatever the seller wrote. */
export function buildDatasetPolicyCharacteristic(datasetId: string, policy: Record<string, any>) {
  return {
    name: 'authorizationPolicy',
    valueType: 'authorizationPolicy',
    configurable: false,
    productSpecCharacteristicValue: [{
      isDefault: true,
      value: [{ ...policy, 'odrl:uid': datasetPolicyUid(datasetId) }] as any,
    }],
  };
}
