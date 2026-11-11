import { ErrorObject } from 'ajv';
import localizeEs from 'ajv-i18n/localize/es';
import { SchemaValidationError } from './schema-registry.service';

/** `ajv-i18n` bundles one module per language; only the languages the app ships are imported. */
const AJV_LOCALIZERS: Record<string, (errors: ErrorObject[]) => void> = {
  es: localizeEs as (errors: ErrorObject[]) => void,
};

/** Keywords whose message is shorter and clearer than ajv's, so the app words them itself. */
type OwnMessage = (params: Record<string, unknown>) => { key: string; params?: Record<string, unknown> };

const OWN_MESSAGES: Record<string, OwnMessage> = {
  required: () => ({ key: 'SCHEMA_FORM._issue_required' }),
  additionalProperties: () => ({ key: 'SCHEMA_FORM._issue_not_allowed' }),
  'false schema': () => ({ key: 'SCHEMA_FORM._issue_not_allowed' }),
  enum: params => ({ key: 'SCHEMA_FORM._issue_one_of', params: { values: (params['allowedValues'] as unknown[]).join(', ') } }),
  const: params => ({ key: 'SCHEMA_FORM._issue_must_be', params: { value: String(params['allowedValue']) } }),
};

/**
 * The message of a validation error in `lang`. The few keywords in {@link OWN_MESSAGES} use the
 * app's own translations; any other keyword is worded by `ajv-i18n` when it has the language, and
 * stays in ajv's English otherwise.
 */
export function issueMessage(
  error: SchemaValidationError,
  lang: string | undefined,
  translate: (key: string, params?: Record<string, unknown>) => string,
): string {
  const own = error.keyword ? OWN_MESSAGES[error.keyword]?.(error.params ?? {}) : undefined;
  if (own) return translate(own.key, own.params);

  const localize = lang ? AJV_LOCALIZERS[lang] : undefined;
  if (!localize || !error.keyword) return error.message;
  // `ajv-i18n` rewrites `message` in place, so give it a copy.
  const copy = { keyword: error.keyword, params: error.params ?? {}, message: error.message } as ErrorObject;
  localize([copy]);
  const extra = error.params?.['propertyName'];
  return `${copy.message ?? error.message}${extra === undefined ? '' : ` (${extra})`}`;
}
