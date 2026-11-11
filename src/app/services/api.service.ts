import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import {
  API_CHARACTERISTICS,
  API_LIST_FILTER,
  API_PRODUCT_MARKER,
  ApiDefinition,
  ApiOperation,
} from '../models/api-access.model';
import { PageRequest, PageResult } from '../models/pagination.model';
import { buildApiPolicyCharacteristic } from './api-policy';
import { ProductSpecServiceService } from './product-spec-service.service';
import { ServiceSpecServiceService } from './service-spec-service.service';

/** Value of the first characteristic called `name`, whichever of `*CharacteristicValue` carries it. */
function characteristicValue(characteristics: any[] | undefined, name: string): any {
  const characteristic = (characteristics ?? []).find(c => c?.name === name);
  const values = characteristic?.characteristicValueSpecification ?? characteristic?.productSpecCharacteristicValue ?? [];
  return (values.find((v: any) => v?.isDefault) ?? values[0])?.value;
}

/** The TM Forum keeps what it is given as JSON-LD, which cannot tell a list of one item from the item itself. It
 * answers `["/items"]` for the string "/items", "read" for the list ["read"], and an object for a list of one. These put
 * a value back in the shape it was written in. */
function single<T>(value: T | T[]): T {
  return (Array.isArray(value) && value.length === 1 ? value[0] : value) as T;
}

function asList<T>(value: unknown): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? (value as T[]) : [value as T];
}

function storedOperation(operation: any): ApiOperation {
  const result: ApiOperation = { id: single(operation?.id), action: single(operation?.action), path: single(operation?.path) };
  if (operation?.description !== undefined) result.description = single(operation.description);
  return result;
}

function characteristic(name: string, valueType: string, value: unknown): any {
  return { id: name, name, valueType, characteristicValueSpecification: [{ isDefault: true, value }] };
}

/** `specCharacteristic` of an API ServiceSpecification, in the TMF633 shape: each characteristic keeps its values in
 * `characteristicValueSpecification`. Having `apiOperations` is what makes the service an API. A PATCH replaces the whole
 * array, so an edit always carries the address too. */
export function buildApiCharacteristics(definition: ApiDefinition): any[] {
  const result = [characteristic(API_CHARACTERISTICS.operations, 'object', definition.operations)];
  if (definition.url) {
    result.push(characteristic(API_CHARACTERISTICS.url, 'string', definition.url));
  }
  return result;
}

/** Inverse of `buildApiCharacteristics`. */
export function readApiDefinition(spec: any): ApiDefinition {
  const characteristics = spec?.specCharacteristic;
  const url = single(characteristicValue(characteristics, API_CHARACTERISTICS.url));
  return {
    name: spec?.name ?? '',
    description: spec?.description,
    version: spec?.version ?? '',
    url: typeof url === 'string' ? url : undefined,
    operations: asList<any>(characteristicValue(characteristics, API_CHARACTERISTICS.operations)).map(storedOperation),
  };
}

/** True for a service specification that is an API: it has the `apiOperations` characteristic. */
export function isApiSpec(spec: any): boolean {
  return (spec?.specCharacteristic ?? []).some((c: any) => c?.name === API_CHARACTERISTICS.operations);
}

/** Body to create the API's ServiceSpecification. */
export function buildApiServiceSpec(definition: ApiDefinition, partyId: string, lifecycleStatus: 'Active' | 'Launched' = 'Active'): any {
  return {
    name: definition.name,
    description: definition.description,
    version: definition.version,
    lifecycleStatus,
    isBundle: false,
    specCharacteristic: buildApiCharacteristics(definition),
    relatedParty: [{ id: partyId, role: environment.SELLER_ROLE, '@referredType': '' }],
  };
}

/** Body to edit the API: a PATCH never touches the owner. */
export function buildApiServiceSpecPatch(definition: ApiDefinition): any {
  return {
    name: definition.name,
    description: definition.description,
    version: definition.version,
    specCharacteristic: buildApiCharacteristics(definition),
  };
}

/** True for a product specification that sells an API: it has the marker. */
export function isApiProduct(productSpec: any): boolean {
  return (productSpec?.productSpecCharacteristic ?? []).some((c: any) => c?.name === API_PRODUCT_MARKER);
}

/** The id of the API a product sells, from the marker. */
export function apiIdOf(productSpec: any): string | undefined {
  const id = single(characteristicValue(productSpec?.productSpecCharacteristic, API_PRODUCT_MARKER));
  return typeof id === 'string' ? id : undefined;
}

/** What marks the product as the one of an API, and the policy that grants every operation of it. The policy is the
 * portal's: contract-management installs it as it is, so it is rebuilt each time the API changes. */
export function buildApiProductCharacteristics(serviceSpecId: string, definition: ApiDefinition): any[] {
  return [
    {
      name: API_PRODUCT_MARKER,
      description: 'The product specification sells an API',
      valueType: 'api',
      configurable: false,
      productSpecCharacteristicValue: [{ isDefault: true, value: serviceSpecId }],
    },
    buildApiPolicyCharacteristic(serviceSpecId, definition.url ?? '', definition.operations),
  ];
}

/** Body of the product an API is sold with: a ProductSpecification that points at the API and sells all of it. */
export function buildApiProductSpec(
  service: { id: string; href?: string; name?: string },
  definition: ApiDefinition,
  partyId: string,
  lifecycleStatus: 'Active' | 'Launched' = 'Active',
): any {
  return {
    name: `${definition.name} product spec`,
    description: definition.description ?? '',
    version: definition.version,
    brand: '',
    productNumber: '',
    lifecycleStatus,
    isBundle: false,
    bundledProductSpecification: [],
    productSpecificationRelationship: [],
    attachment: [],
    productSpecCharacteristic: buildApiProductCharacteristics(service.id, definition),
    relatedParty: [{ id: partyId, role: environment.SELLER_ROLE, '@referredType': '' }],
    resourceSpecification: [],
    serviceSpecification: [{ id: service.id, href: service.href ?? service.id, name: service.name ?? definition.name }],
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private serviceSpecs: ServiceSpecServiceService, private productSpecs: ProductSpecServiceService) { }

  /** The seller's APIs, i.e. their ServiceSpecifications that have the `apiOperations` characteristic. */
  list(params: PageRequest, partyId: string, status: string[] = []): Promise<PageResult<any>> {
    return this.serviceSpecs.getServiceSpecByUserPaged(params, API_LIST_FILTER, status, partyId);
  }

  get(id: string): Promise<any> {
    return this.serviceSpecs.getServSpecById(id);
  }

  async getDefinition(id: string): Promise<ApiDefinition> {
    return readApiDefinition(await this.get(id));
  }

  create(definition: ApiDefinition, partyId: string, lifecycleStatus: 'Active' | 'Launched' = 'Active') {
    return this.serviceSpecs.postServSpec(buildApiServiceSpec(definition, partyId, lifecycleStatus));
  }

  update(id: string, definition: ApiDefinition) {
    return this.serviceSpecs.updateServSpec(buildApiServiceSpecPatch(definition), id);
  }

  /** The product that goes with a new API. It is its own request, so the API may exist without it if this one fails. */
  createProduct(service: { id: string; href?: string; name?: string }, definition: ApiDefinition, partyId: string, lifecycleStatus: 'Active' | 'Launched' = 'Active') {
    return this.productSpecs.postProdSpec(buildApiProductSpec(service, definition, partyId, lifecycleStatus));
  }

  /** Writes the policy of the product again after the API changed, so it grants what the API has now. Purchases already made keep
   * the policy they were installed with. */
  updateProductPolicy(productSpecId: string, serviceSpecId: string, definition: ApiDefinition) {
    return this.productSpecs.updateProdSpec({ productSpecCharacteristic: buildApiProductCharacteristics(serviceSpecId, definition) }, productSpecId);
  }
}
