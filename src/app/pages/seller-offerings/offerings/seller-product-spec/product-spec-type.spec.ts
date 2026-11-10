import { productSpecTypeLabel } from './product-spec-type';

describe('productSpecTypeLabel', () => {
  it('shows DatasetProduct for a product carrying the dataset mark', () => {
    expect(productSpecTypeLabel({ productSpecCharacteristic: [{ name: 'dataset', valueType: 'dataset' }] })).toBe('DatasetProduct');
  });

  it('keeps the @type otherwise', () => {
    expect(productSpecTypeLabel({ '@type': 'BlueprintProductSpecification' })).toBe('BlueprintProductSpecification');
  });

  it('falls back to ProductSpecification', () => {
    expect(productSpecTypeLabel({ productSpecCharacteristic: [{ name: 'Color', valueType: 'string' }] })).toBe('ProductSpecification');
    expect(productSpecTypeLabel({})).toBe('ProductSpecification');
  });
});
