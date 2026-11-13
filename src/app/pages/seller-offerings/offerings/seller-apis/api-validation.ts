import { API_ACTIONS, ApiOperation } from 'src/app/models/api-access.model';
import { checkDatasetPolicy } from '../seller-datasets/dataset-policy';

/** Client-side checks of an API definition: nothing else validates them, the proxy does not look at an API. Every error is a suffix of an `API_ACCESS._err_*` translation key. */

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PARAM_PATTERN = /\{([A-Za-z_][A-Za-z0-9_-]*)\}/g;

export type ApiPathError = 'path_required' | 'path_slash' | 'path_query' | 'path_dots' | 'path_empty_segment' | 'path_param' | 'path_param_duplicate';

/** Why an operation path is not acceptable, or null. A path is a template relative to the API root: it starts with
 * `/`, may hold `{param}` placeholders, and has no query string, dot segments or empty segments. */
export function apiPathError(path: string | undefined): ApiPathError | null {
  const value = path ?? '';
  if (!value.trim()) return 'path_required';
  if (!value.startsWith('/')) return 'path_slash';
  if (value.includes('?') || value.includes('#')) return 'path_query';
  if (value === '/') return null;

  const segments = value.slice(1).split('/');
  if (segments.some(segment => segment === '')) return 'path_empty_segment';
  if (segments.some(segment => segment === '.' || segment === '..')) return 'path_dots';

  const names: string[] = [];
  for (const segment of segments) {
    const literal = segment.replace(PARAM_PATTERN, (_, name: string) => {
      names.push(name);
      return '';
    });
    if (literal.includes('{') || literal.includes('}')) return 'path_param';
  }
  return new Set(names).size === names.length ? null : 'path_param_duplicate';
}

export type ApiIdError = 'id_required' | 'id_format' | 'id_duplicate';

function idError(id: string | undefined, taken: Set<string>): ApiIdError | null {
  if (!id?.trim()) return 'id_required';
  if (!ID_PATTERN.test(id)) return 'id_format';
  return taken.has(id) ? 'id_duplicate' : null;
}

export interface ApiOperationErrors {
  id?: ApiIdError;
  action?: 'action_invalid';
  path?: ApiPathError;
  /** Translation key of the first problem of a custom policy */
  policy?: string;
}

/** One entry per operation (same order); an empty object means the row is fine. */
export function operationErrors(operations: ApiOperation[]): ApiOperationErrors[] {
  const seen = new Set<string>();
  return operations.map(operation => {
    const errors: ApiOperationErrors = {};
    const id = idError(operation.id, seen);
    if (id) errors.id = id;
    if (operation.id) seen.add(operation.id);
    if (!API_ACTIONS.includes(operation.action)) errors.action = 'action_invalid';
    if (operation.action === 'custom') {
      // A custom policy says its own target, so there is no path to check; the same rules as for a dataset's apply
      const policy = checkDatasetPolicy(operation.policy).error;
      if (policy) errors.policy = policy;
      return errors;
    }
    const path = apiPathError(operation.path);
    if (path) errors.path = path;
    return errors;
  });
}

export function hasErrors(errors: object[]): boolean {
  return errors.some(entry => Object.keys(entry).length > 0);
}

export type ApiUrlError = 'url_required' | 'url_invalid' | 'url_reserved';

/** Where the seller's data space connector serves the API: an absolute `http` or `https` URL whose path is not under
 * `/private/`, the prefix of the file service: the proxy refuses a policy that could reach it. */
export function apiUrlError(value: string | undefined): ApiUrlError | null {
  const text = (value ?? '').trim();
  if (!text) return 'url_required';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:' || !url.hostname) return 'url_invalid';
    return /^\/private(\/|$)/.test(url.pathname) ? 'url_reserved' : null;
  } catch {
    return 'url_invalid';
  }
}
