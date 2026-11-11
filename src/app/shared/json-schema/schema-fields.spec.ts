import { HttpClient } from '@angular/common/http';
import { DateFormField, SelectableFormField } from 'src/app/models/formFields/form-field.model';
import { JsonSchema } from './json-schema.model';
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
  },
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
