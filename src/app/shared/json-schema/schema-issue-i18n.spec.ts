import { issueMessage } from './schema-issue-i18n';
import { SchemaValidationError } from './schema-registry.service';

describe('issueMessage', () => {
  const translations: Record<string, string> = {
    'SCHEMA_FORM._issue_required': 'es obligatorio',
    'SCHEMA_FORM._issue_one_of': 'debe ser uno de: {{values}}',
  };
  const translate = (key: string, params?: Record<string, unknown>) =>
    (translations[key] ?? key).replace(/{{(\w+)}}/g, (_, name) => String(params?.[name]));

  const required: SchemaValidationError = { path: '/a', message: 'is required', keyword: 'required', params: { missingProperty: 'a' } };
  const oneOf: SchemaValidationError = { path: '/t', message: 'must be one of: x, y', keyword: 'enum', params: { allowedValues: ['x', 'y'] } };
  const pattern: SchemaValidationError = { path: '/p', message: 'must match pattern "^a$"', keyword: 'pattern', params: { pattern: '^a$' } };

  it('words the keywords the app words itself through its own translations', () => {
    expect(issueMessage(required, 'es', translate)).toBe('es obligatorio');
    expect(issueMessage(oneOf, 'es', translate)).toBe('debe ser uno de: x, y');
  });

  it('uses ajv-i18n for any other keyword when the language has it', () => {
    expect(issueMessage(pattern, 'es', translate)).toContain('patron');
  });

  it('keeps the English message for a language ajv-i18n is not loaded for', () => {
    expect(issueMessage(pattern, 'en', translate)).toBe('must match pattern "^a$"');
    expect(issueMessage(pattern, undefined, translate)).toBe('must match pattern "^a$"');
  });

  it('does not alter the error it is given', () => {
    issueMessage(pattern, 'es', translate);
    expect(pattern.message).toBe('must match pattern "^a$"');
  });
});
