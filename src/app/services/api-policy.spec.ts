import { ApiOperation } from '../models/api-access.model';
import { apiPolicyUid, buildApiPolicyCharacteristic, buildOperationPolicy, operationFullPath } from './api-policy';

const SERVICE_ID = 'urn:ngsi-ld:service-specification:5f1e';
const op = (overrides: Partial<ApiOperation> = {}): ApiOperation => ({ id: 'list', action: 'read', path: '/items', ...overrides });

describe('api policy', () => {
  it('puts the path of the address of the API before the one of the operation', () => {
    expect(operationFullPath('https://api.acme.example/v1', '/items')).toBe('/v1/items');
    expect(operationFullPath('https://api.acme.example/v1/', '/items/{id}')).toBe('/v1/items/{id}');
    expect(operationFullPath('https://api.acme.example', '/items')).toBe('/items');
  });

  it('takes the root of the API for the path "/"', () => {
    expect(operationFullPath('https://api.acme.example/v1', '/')).toBe('/v1');
    expect(operationFullPath('https://api.acme.example', '/')).toBe('/');
  });

  it('gives each operation a uid made of the service uuid and the operation id', () => {
    expect(apiPolicyUid(SERVICE_ID, 'list')).toBe('urn:policy:api:5f1e:list');
  });

  it('grants a fixed path by equality, with the action of the operation', () => {
    const policy = buildOperationPolicy(SERVICE_ID, 'https://api.acme.example/v1', op({ action: 'modify' }));
    const permission = policy['odrl:permission'];

    expect(policy['odrl:uid']).toBe('urn:policy:api:5f1e:list');
    expect(permission['odrl:action']).toEqual({ '@id': 'odrl:modify' });
    expect(permission['odrl:target']['odrl:refinement']['odrl:operator']).toEqual({ '@id': 'odrl:eq' });
    expect(permission['odrl:target']['odrl:refinement']['odrl:rightOperand']).toBe('/v1/items');
  });

  it('turns each {param} into one segment of an anchored pattern, escaping the rest', () => {
    const policy = buildOperationPolicy(SERVICE_ID, 'https://api.acme.example/v1.0', op({ path: '/items/{id}/parts/{part}' }));
    const refinement = policy['odrl:permission']['odrl:target']['odrl:refinement'];

    expect(refinement['odrl:operator']).toEqual({ '@id': 'odrl:regex' });
    expect(refinement['odrl:rightOperand']).toBe('^/v1\\.0/items/[^/]+/parts/[^/]+$');
    expect(new RegExp(refinement['odrl:rightOperand']).test('/v1.0/items/7/parts/a')).toBeTrue();
    expect(new RegExp(refinement['odrl:rightOperand']).test('/v1.0/items/7/parts/a/b')).toBeFalse();
  });

  it('has no assignee and a single permission object, as contract-management reads it', () => {
    const policy = buildOperationPolicy(SERVICE_ID, 'https://api.acme.example', op());

    expect(Array.isArray(policy['odrl:permission'])).toBeFalse();
    expect('odrl:assignee' in policy).toBeFalse();
    expect('odrl:assignee' in policy['odrl:permission']).toBeFalse();
  });

  it('installs a custom policy as the seller wrote it, with the uid forced', () => {
    const written = { '@type': 'odrl:Policy', 'odrl:uid': 'urn:policy:mine', 'odrl:permission': { 'odrl:action': { '@id': 'odrl:use' } } };
    const policy = buildOperationPolicy(SERVICE_ID, 'https://api.acme.example/v1', op({ id: 'mine', action: 'custom', path: '', policy: JSON.stringify(written) }));

    expect(policy).toEqual({ ...written, 'odrl:uid': 'urn:policy:api:5f1e:mine' });
  });

  it('writes one policy per operation in the authorizationPolicy characteristic', () => {
    const characteristic = buildApiPolicyCharacteristic(SERVICE_ID, 'https://api.acme.example', [op(), op({ id: 'get', path: '/items/{id}' })]);

    expect(characteristic.valueType).toBe('authorizationPolicy');
    const policies = characteristic.productSpecCharacteristicValue[0].value as any[];
    expect(policies.map(p => p['odrl:uid'])).toEqual(['urn:policy:api:5f1e:list', 'urn:policy:api:5f1e:get']);
  });
});
