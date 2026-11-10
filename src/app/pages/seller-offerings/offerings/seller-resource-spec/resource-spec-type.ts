/** What a Type column shows for a resource spec: its TMF `@type`, or Dataset for the specs that describe a dataset file. */
export function resourceSpecTypeLabel(resSpec: any): string {
  return resSpec?.category === 'dataset' ? 'Dataset' : resSpec?.['@type'] ?? 'ResourceSpecification';
}
