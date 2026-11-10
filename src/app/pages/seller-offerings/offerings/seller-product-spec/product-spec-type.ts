/** What the Type column shows: the TMF `@type` as the spec has it, except for a dataset product, which has none
 * of its own and is told apart by the mark the proxy writes. */
export function productSpecTypeLabel(prodSpec: any): string {
  const isDataset = (prodSpec?.productSpecCharacteristic ?? []).some((char: any) => char.valueType === 'dataset');
  return isDataset ? 'DatasetProduct' : prodSpec?.['@type'] ?? 'ProductSpecification';
}
