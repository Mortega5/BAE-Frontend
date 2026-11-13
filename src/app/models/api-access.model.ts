/** Selling an API. The API is a ServiceSpecification whose characteristics hold its whole definition, as a dataset served
 * from an address is; the product is a ProductSpecification that points at it and carries the access policy that
 * contract-management installs. The seller's own data space connector serves and protects the API, so the address is
 * public and nothing here goes through the proxy. */

/** What a policy of the API allows: an ODRL action on its path (`use` allows any HTTP method), or `custom`, a policy the
 * seller writes whole. */
export type ApiAction = 'read' | 'modify' | 'delete' | 'use' | 'custom';
export const API_ACTIONS: ApiAction[] = ['read', 'modify', 'delete', 'use', 'custom'];

/** Names of the ServiceSpecification characteristics that make an API. */
export const API_CHARACTERISTICS = {
  url: 'apiUrl',
  operations: 'apiOperations',
} as const;

/** Query of the ServiceSpecifications that are APIs. A ServiceSpecification has no category in TMF633, so what marks a
 * service as an API is its `apiOperations` characteristic, and the TM Forum can filter on its name (it answers 500 to
 * `atValueType` on service specs, and `valueType` or `id` match nothing). */
export const API_LIST_FILTER = { 'specCharacteristic.name': API_CHARACTERISTICS.operations };

/** Characteristic of the ProductSpecification of an API, with the id of the API: it is what the portal lists and
 * recognises the products of an API by. */
export const API_PRODUCT_MARKER = 'apiAccess';

/** Query of the product specs that sell an API: the TM Forum filters on the name of their marker characteristic. */
export const API_PRODUCT_FILTER = { 'productSpecCharacteristic.name': API_PRODUCT_MARKER };

/** A policy of the API: a path with the kind of access it needs, or a custom ODRL policy (stored under the name
 * `apiOperations`, which is what makes a service an API). */
export interface ApiOperation {
  id: string;
  action: ApiAction;
  /** Template relative to the API address, e.g. `/items/{id}`. Empty in a custom policy, which says its own target. */
  path: string;
  description?: string;
  /** Only when `action` is `custom`: the ODRL policy as JSON text. It is kept as text because the TM Forum stores
   * JSON-LD and would reshape a nested object. */
  policy?: string;
}

/** The API as the seller edits it; the ServiceSpecification characteristics are built from and read into it. */
export interface ApiDefinition {
  name: string;
  description?: string;
  version: string;
  /** Where the seller's data space connector serves the API; buyers read it too */
  url?: string;
  operations: ApiOperation[];
}
