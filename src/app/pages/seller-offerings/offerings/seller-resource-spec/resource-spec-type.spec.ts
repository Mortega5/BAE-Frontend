import { resourceSpecTypeLabel } from './resource-spec-type';

describe('resourceSpecTypeLabel', () => {
  it('shows Dataset for the specs of a dataset file', () => {
    expect(resourceSpecTypeLabel({ category: 'dataset', '@type': 'ResourceSpecification' })).toBe('Dataset');
  });

  it('keeps the @type otherwise, falling back to ResourceSpecification', () => {
    expect(resourceSpecTypeLabel({ '@type': 'SoftwareSpecification' })).toBe('SoftwareSpecification');
    expect(resourceSpecTypeLabel({})).toBe('ResourceSpecification');
  });
});
