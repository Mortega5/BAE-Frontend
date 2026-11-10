import { buildDatasetPolicyCharacteristic, checkDatasetPolicy, DATASET_POLICY_TEMPLATE } from './dataset-policy';

describe('dataset policy', () => {
  it('accepts the template', () => {
    const check = checkDatasetPolicy(DATASET_POLICY_TEMPLATE);
    expect(check.error).toBeUndefined();
    expect(check.policy!['odrl:permission']).toEqual({ 'odrl:action': { '@id': 'odrl:read' } });
  });

  const permission = { 'odrl:action': { '@id': 'odrl:read' } };
  const errors: [string, string, string][] = [
    ['empty', '  ', 'DATASETS._policy_error_empty'],
    ['invalid JSON', '{', 'DATASETS._policy_error_invalid_json'],
    ['a list', '[]', 'DATASETS._policy_error_not_object'],
    ['no permission', '{}', 'DATASETS._policy_error_permission'],
    ['a permission list', JSON.stringify({ 'odrl:permission': [permission] }), 'DATASETS._policy_error_permission'],
    ['an assignee', JSON.stringify({ 'odrl:permission': { ...permission, 'odrl:assignee': 'x' } }), 'DATASETS._policy_error_assignee'],
    ['a top-level assignee', JSON.stringify({ 'odrl:assignee': 'x', 'odrl:permission': permission }), 'DATASETS._policy_error_assignee'],
    ['a plain IRI target', JSON.stringify({ 'odrl:permission': { ...permission, 'odrl:target': 'http://x' } }), 'DATASETS._policy_error_target'],
  ];
  errors.forEach(([name, text, error]) =>
    it(`rejects ${name}`, () => expect(checkDatasetPolicy(text).error).toBe(error)));

  it('accepts a target that is an object', () => {
    const text = JSON.stringify({ 'odrl:permission': { ...permission, 'odrl:target': { 'odrl:and': [] } } });
    expect(checkDatasetPolicy(text).error).toBeUndefined();
  });

  it('forces the uid of the dataset whatever the seller wrote', () => {
    const char = buildDatasetPolicyCharacteristic('rs-1', { 'odrl:uid': 'mine', 'odrl:permission': permission });

    expect(char.name).toBe('authorizationPolicy');
    expect(char.valueType).toBe('authorizationPolicy');
    expect(char.productSpecCharacteristicValue[0].value[0]['odrl:uid']).toBe('urn:policy:dataset:rs-1');
  });
});
