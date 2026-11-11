import { ApiDefinition } from '../models/api-access.model';
import {
  apiIdOf,
  buildApiCharacteristics,
  buildApiProductSpec,
  buildApiServiceSpec,
  buildApiServiceSpecPatch,
  isApiProduct,
  isApiSpec,
  readApiDefinition,
} from './api.service';

const definition: ApiDefinition = {
  name: 'Inventory API',
  description: 'Items',
  version: '1.0',
  url: 'https://api.acme.example/v1',
  operations: [
    { id: 'list', action: 'read', path: '/items', description: 'List' },
    { id: 'get', action: 'read', path: '/items/{id}' },
  ],
};

describe('api definition', () => {
  it('writes the address and the operations as TMF633 characteristics', () => {
    const characteristics = buildApiCharacteristics(definition);

    expect(characteristics.map(c => c.name)).toEqual(['apiOperations', 'apiUrl']);
    expect(characteristics[1].characteristicValueSpecification[0].value).toBe('https://api.acme.example/v1');
  });

  it('reads back what it wrote', () => {
    const spec = { ...buildApiServiceSpec(definition, 'party-1'), id: 'urn:service:1' };

    expect(readApiDefinition(spec)).toEqual({ ...definition, operations: [
      { id: 'list', action: 'read', path: '/items', description: 'List' },
      { id: 'get', action: 'read', path: '/items/{id}' },
    ] });
  });

  it('puts back the shape the TM Forum flattens: one operation comes as an object, its fields as one-item lists', () => {
    const spec = {
      name: 'A', version: '1',
      specCharacteristic: [
        { name: 'apiOperations', characteristicValueSpecification: [{ isDefault: true, value: { id: ['x'], action: ['use'], path: ['/y'] } }] },
        { name: 'apiUrl', characteristicValueSpecification: [{ isDefault: true, value: ['https://a.example'] }] },
      ],
    };

    expect(readApiDefinition(spec).operations).toEqual([{ id: 'x', action: 'use', path: '/y' }]);
    expect(readApiDefinition(spec).url).toBe('https://a.example');
  });

  it('recognises an API by its operations characteristic', () => {
    expect(isApiSpec(buildApiServiceSpec(definition, 'p'))).toBeTrue();
    expect(isApiSpec({ specCharacteristic: [{ name: 'datasetUrl' }] })).toBeFalse();
    expect(isApiSpec({})).toBeFalse();
  });

  it('patches the definition without touching the owner', () => {
    const patch = buildApiServiceSpecPatch(definition);

    expect(Object.keys(patch).sort()).toEqual(['description', 'name', 'specCharacteristic', 'version']);
  });
});

describe('api product', () => {
  const service = { id: 'urn:ngsi-ld:service-specification:5f1e', href: 'urn:ngsi-ld:service-specification:5f1e', name: 'Inventory API' };

  it('points at the API, sells it whole and carries the marker and the policy', () => {
    const spec = buildApiProductSpec(service, definition, 'party-1');

    expect(spec.serviceSpecification).toEqual([{ id: service.id, href: service.href, name: 'Inventory API' }]);
    expect(spec.resourceSpecification).toEqual([]);
    expect(spec.productSpecCharacteristic.map((c: any) => c.name)).toEqual(['apiAccess', 'authorizationPolicy']);
    expect(spec.productSpecCharacteristic[1].productSpecCharacteristicValue[0].value.length).toBe(2);
  });

  it('is recognised by its marker, which holds the id of the API', () => {
    const spec = buildApiProductSpec(service, definition, 'party-1');

    expect(isApiProduct(spec)).toBeTrue();
    expect(apiIdOf(spec)).toBe(service.id);
    expect(isApiProduct({ productSpecCharacteristic: [{ name: 'dataset' }] })).toBeFalse();
  });
});
