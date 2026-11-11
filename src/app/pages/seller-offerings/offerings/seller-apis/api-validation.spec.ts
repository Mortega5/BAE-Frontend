import { ApiOperation } from 'src/app/models/api-access.model';
import {
  apiPathError,
  hasErrors,
  operationErrors,
  apiUrlError
} from './api-validation';

describe('apiPathError', () => {
  it('accepts plain and templated paths', () => {
    for (const path of ['/', '/items', '/items/{id}', '/orders/{orderId}/lines/{line-id}', '/v1/items.json']) {
      expect(apiPathError(path)).withContext(path).toBeNull();
    }
  });

  it('requires a path that starts with a slash', () => {
    expect(apiPathError('')).toBe('path_required');
    expect(apiPathError('   ')).toBe('path_required');
    expect(apiPathError(undefined)).toBe('path_required');
    expect(apiPathError('items')).toBe('path_slash');
  });

  it('refuses a query string or fragment', () => {
    expect(apiPathError('/items?x=1')).toBe('path_query');
    expect(apiPathError('/items#top')).toBe('path_query');
  });

  it('refuses empty segments, including a trailing slash', () => {
    expect(apiPathError('//items')).toBe('path_empty_segment');
    expect(apiPathError('/items//1')).toBe('path_empty_segment');
    expect(apiPathError('/items/')).toBe('path_empty_segment');
  });

  it('refuses dot segments', () => {
    expect(apiPathError('/items/../secret')).toBe('path_dots');
    expect(apiPathError('/./items')).toBe('path_dots');
  });

  it('refuses malformed placeholders', () => {
    expect(apiPathError('/items/{id')).toBe('path_param');
    expect(apiPathError('/items/id}')).toBe('path_param');
    expect(apiPathError('/items/{}')).toBe('path_param');
    expect(apiPathError('/items/{1id}')).toBe('path_param');
  });

  it('refuses a repeated placeholder name inside one path', () => {
    expect(apiPathError('/a/{id}/b/{id}')).toBe('path_param_duplicate');
    expect(apiPathError('/a/{id}/b/{other}')).toBeNull();
  });
});

describe('operationErrors', () => {
  const op = (id: string, path = '/items', action: any = 'read'): ApiOperation => ({ id, action, path });

  it('has no errors for a valid list', () => {
    const errors = operationErrors([op('list'), op('get', '/items/{id}'), op('create', '/items', 'use')]);

    expect(hasErrors(errors)).toBeFalse();
  });

  it('flags a repeated id on the later row only', () => {
    const errors = operationErrors([op('list'), op('list')]);

    expect(errors[0].id).toBeUndefined();
    expect(errors[1].id).toBe('id_duplicate');
  });

  it('flags a missing or malformed id, an unknown action and a bad path', () => {
    const errors = operationErrors([op('', '/x'), op('bad id', '/x'), op('ok', '/x', 'post'), op('ok2', 'x')]);

    expect(errors.map(e => e.id)).toEqual(['id_required', 'id_format', undefined, undefined]);
    expect(errors[2].action).toBe('action_invalid');
    expect(errors[3].path).toBe('path_slash');
  });
});

describe('API address', () => {
  it('accepts an absolute http or https URL', () => {
    expect(apiUrlError('https://api.acme.example/v1')).toBeNull();
    expect(apiUrlError('http://api.acme.example')).toBeNull();
  });

  it('refuses an empty, relative or other-scheme address', () => {
    expect(apiUrlError('')).toBe('url_required');
    expect(apiUrlError('api.acme.example')).toBe('url_invalid');
    expect(apiUrlError('ftp://api.acme.example')).toBe('url_invalid');
  });

  it('refuses a path under /private/, which belongs to the file service', () => {
    expect(apiUrlError('https://api.acme.example/private/v1')).toBe('url_reserved');
    expect(apiUrlError('https://api.acme.example/private')).toBe('url_reserved');
    expect(apiUrlError('https://api.acme.example/privately')).toBeNull();
  });
});
