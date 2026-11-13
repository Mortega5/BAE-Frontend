import { ApiOperation } from '../models/api-access.model';

/** The access policy of the product of an API. Contract-management reads the first product characteristic of value type
 * `authorizationPolicy`, whose value is a list of policies, each with a `odrl:uid` and exactly one `odrl:permission` object.
 * It installs them in the ODRL-PAP when an order completes, adding the buyer as the assignee, and stores each as
 * `{uid}-{orderId}`. So here there is one policy per operation, no assignee and no assigner (the PAP does not evaluate it). */
export const API_POLICY_VALUE_TYPE = 'authorizationPolicy';
const POLICY_UID_PREFIX = 'urn:policy:api:';
const PARAM = /\{[^}]+\}/;
const PARAMS = /\{[^}]+\}/g;
const REGEX_CHARS = /[.*+?^${}()|[\]\\]/g;

/** The part of a specification id after its last colon (its uuid), which keeps the policy uid short. */
const shortId = (serviceSpecId: string): string => serviceSpecId.slice(serviceSpecId.lastIndexOf(':') + 1);

export const apiPolicyUid = (serviceSpecId: string, operationId: string): string =>
  `${POLICY_UID_PREFIX}${shortId(serviceSpecId)}:${operationId}`;

/** The path the buyer calls for an operation: the path of the address of the API, then the path of the operation. */
export function operationFullPath(apiUrl: string, operationPath: string): string {
  let base = '';
  try {
    base = new URL(apiUrl).pathname.replace(/\/+$/, '');
  } catch {
    base = '';
  }
  const path = operationPath === '/' ? '' : operationPath;
  return `${base}${path}` || '/';
}

/** The constraint on the path of one operation: equal to it, or a pattern when it has `{param}` segments, each of
 * which matches exactly one segment so a path never reaches deeper than the operation says. */
function pathConstraint(fullPath: string): Record<string, any> {
  const constraint = { '@type': 'odrl:Constraint', 'odrl:leftOperand': 'http:path' };
  if (!PARAM.test(fullPath)) {
    return { ...constraint, 'odrl:operator': { '@id': 'odrl:eq' }, 'odrl:rightOperand': fullPath };
  }
  const pattern = fullPath
    .split(PARAMS)
    .map(literal => literal.replace(REGEX_CHARS, '\\$&'))
    .join('[^/]+');
  return { ...constraint, 'odrl:operator': { '@id': 'odrl:regex' }, 'odrl:rightOperand': `^${pattern}$` };
}

/** What a seller starts a custom policy from: unlike the generated ones, nothing is added to it but its uid, so it says
 * its own target, with the full path a buyer calls (the path of the API address included). */
export const API_POLICY_TEMPLATE = JSON.stringify({
  '@context': { odrl: 'http://www.w3.org/ns/odrl/2/' },
  '@type': 'odrl:Policy',
  'odrl:permission': {
    'odrl:target': {
      '@type': 'odrl:AssetCollection',
      'odrl:source': 'urn:asset',
      'odrl:refinement': {
        '@type': 'odrl:Constraint',
        'odrl:leftOperand': 'http:path',
        'odrl:operator': { '@id': 'odrl:eq' },
        'odrl:rightOperand': '/items',
      },
    },
    'odrl:action': { '@id': 'odrl:read' },
  },
}, null, 2);
/** The policy that grants one operation of the API, without a buyer. A custom one is the seller's own, with the uid forced. */
export function buildOperationPolicy(serviceSpecId: string, apiUrl: string, operation: ApiOperation): Record<string, any> {
  if (operation.action === 'custom') {
    return { ...JSON.parse(operation.policy ?? '{}'), 'odrl:uid': apiPolicyUid(serviceSpecId, operation.id) };
  }
  return {
    '@context': { odrl: 'http://www.w3.org/ns/odrl/2/' },
    '@type': 'odrl:Policy',
    'odrl:uid': apiPolicyUid(serviceSpecId, operation.id),
    'odrl:permission': {
      'odrl:target': {
        '@type': 'odrl:AssetCollection',
        'odrl:source': 'urn:asset',
        'odrl:refinement': pathConstraint(operationFullPath(apiUrl, operation.path)),
      },
      'odrl:action': { '@id': `odrl:${operation.action}` },
    },
  };
}

/** The `authorizationPolicy` characteristic of the product of an API: every operation of the API, nothing else. */
export function buildApiPolicyCharacteristic(serviceSpecId: string, apiUrl: string, operations: ApiOperation[]) {
  return {
    name: API_POLICY_VALUE_TYPE,
    description: 'Access granted to the buyer',
    valueType: API_POLICY_VALUE_TYPE,
    configurable: false,
    productSpecCharacteristicValue: [{
      isDefault: true,
      value: operations.map(operation => buildOperationPolicy(serviceSpecId, apiUrl, operation)) as any,
    }],
  };
}
