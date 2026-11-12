import { HttpClient } from '@angular/common/http';
import { DateFormField, SelectableFormField } from 'src/app/models/formFields/form-field.model';
import { JsonSchema } from './json-schema.model';
import { editorForMediaType } from './schema-fields';
import { createSchemaForm } from './schema-form-group';
import { SchemaRegistryService } from './schema-registry.service';

const SCHEMA: JsonSchema = {
  $id: 'https://example.test/schema-fields.json',
  type: 'object',
  properties: {
    day: { type: 'string', format: 'date' },
    instant: { type: 'string', format: 'date-time' },
    tags: { type: 'array', items: { type: 'string', enum: ['a', 'b', 'c'] } },
    free: { type: 'array', items: { type: 'string' } },
    protocol: { type: 'string', enum: ['http', 'https'], default: 'http' },
    flavour: { type: 'string', enum: ['standalone', 'ha'] },
    backend: { type: 'string', enum: ['vm', 'lxc'] },
    values: { type: 'string', contentMediaType: 'application/yaml' },
    manifest: { type: 'string', contentMediaType: 'application/json' },
    env: { type: 'string', contentMediaType: 'text/plain' },
    blob: { type: 'string', contentMediaType: 'application/octet-stream' },
  },
  required: ['backend'],
};

describe('schema field mapping', () => {
  const create = (value?: Record<string, unknown>, schema: JsonSchema = SCHEMA) => {
    const loaded = new SchemaRegistryService({} as HttpClient).compile(schema.$id!, schema);
    return createSchemaForm(loaded, value);
  };

  describe('format: date and date-time', () => {
    it('renders a date input and keeps the text as it is', () => {
      const form = create({ day: '2026-03-04' });
      const field = form.fields.find(f => f.name === 'day') as DateFormField;
      expect(field.type).toBe('date');
      expect(field.inputType).toBe('date');
      expect(form.schemaValue()['day']).toBe('2026-03-04');
    });

    it('renders a datetime-local input', () => {
      const field = create().fields.find(f => f.name === 'instant') as DateFormField;
      expect(field.type).toBe('date');
      expect(field.inputType).toBe('datetime-local');
    });

    it('shows the instant as local time and gives back the same RFC 3339 instant', () => {
      const form = create({ instant: '2026-03-04T10:30:00Z' });
      expect(form.get('instant')!.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(form.schemaValue()['instant']).toBe('2026-03-04T10:30:00Z');
    });

    it('turns what the user picks into a valid date-time', () => {
      const form = create();
      form.get('instant')!.setValue('2026-06-01T08:15');
      const value = form.schemaValue()['instant'] as string;
      expect(value).toMatch(/Z$/);
      expect(new Date(value).getTime()).toBe(new Date('2026-06-01T08:15').getTime());
    });
  });

  describe('contentMediaType', () => {
    const field = (name: string) => create().fields.find(f => f.name === name)! as any;

    it('edits YAML text in a YAML editor and keeps it as text', () => {
      expect(field('values').type).toBe('code');
      expect(field('values').language).toBe('yaml');
      const form = create({ values: 'replicaCount: 1' });
      expect(form.schemaValue()['values']).toBe('replicaCount: 1');
    });

    it('edits JSON text in a JSON editor', () => {
      expect(field('manifest').type).toBe('code');
      expect(field('manifest').language).toBe('json');
    });

    it('edits other text in a textarea, and anything else in a plain input', () => {
      expect(field('env').type).toBe('textarea');
      expect(field('blob').type).toBe('string');
    });

    it('recognises the YAML media type variants', () => {
      for (const media of ['application/yaml', 'application/x-yaml', 'text/yaml', 'application/vnd.k8s+yaml', 'application/yaml; charset=utf-8']) {
        expect(editorForMediaType(media)).toEqual({ type: 'code', language: 'yaml' });
      }
      expect(editorForMediaType(undefined)).toBeUndefined();
    });

    it('lets the overlay override it', () => {
      const schema: JsonSchema = { $id: 'https://example.test/override.json', type: 'object', properties: { values: { type: 'string', contentMediaType: 'application/yaml' } } };
      const loaded = new SchemaRegistryService({} as HttpClient).compile(schema.$id!, schema);
      const form = createSchemaForm(loaded, undefined, { '/values': { type: 'textarea' } });
      expect(form.fields[0].type).toBe('textarea');
    });
  });

  describe('enum', () => {
    const options = (name: string) => (create().fields.find(f => f.name === name) as SelectableFormField).options.map(o => o.value);

    it('has no empty option when the schema gives a default, required or not', () => {
      expect(options('protocol')).toEqual(['http', 'https']);
      expect(create().get('protocol')!.value).toBe('http');
    });

    it('lets an optional enum without a default be left empty', () => {
      expect(options('flavour')).toEqual(['', 'standalone', 'ha']);
      const field = create().fields.find(f => f.name === 'flavour') as SelectableFormField;
      expect(field.options[0].label).toBe('SCHEMA_FORM._none');
    });

    it('starts a required enum without a default on a placeholder', () => {
      const field = create().fields.find(f => f.name === 'backend') as SelectableFormField;
      expect(field.options.map(o => o.value)).toEqual(['', 'vm', 'lxc']);
      expect(field.options[0].label).toBe('SCHEMA_FORM._select_option');
    });
  });

  describe('array of an enum', () => {
    it('renders a multiple select with the enum values as options', () => {
      const field = create().fields.find(f => f.name === 'tags') as SelectableFormField;
      expect(field.type).toBe('select');
      expect(field.multiple).toBeTrue();
      expect(field.options.map(o => o.value)).toEqual(['a', 'b', 'c']);
    });

    it('loads and returns the selection', () => {
      const form = create({ tags: ['a', 'c'] });
      expect(form.get('tags')!.value).toEqual(['a', 'c']);
      form.get('tags')!.setValue(['b']);
      expect(form.schemaValue()['tags']).toEqual(['b']);
    });

    it('leaves the property out when nothing is selected', () => {
      const form = create({ tags: ['a'] });
      form.get('tags')!.setValue([]);
      expect('tags' in form.schemaValue()).toBeFalse();
    });

    it('still sends an array of free strings to the YAML editor', () => {
      const field = create().fields.find(f => f.name === 'free')!;
      expect(field.type).toBe('code');
    });
  });
});
