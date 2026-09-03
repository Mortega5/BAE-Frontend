import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { DynamicFormComponent } from './dynamic-form.component';

describe('DynamicFormComponent', () => {
  let component: DynamicFormComponent;
  let fixture: ComponentFixture<DynamicFormComponent>;

  function buildForm(fields: FormField[]): FormGroup {
    const controls: Record<string, FormControl> = {};
    for (const f of fields) controls[f.name] = new FormControl('');
    return new FormGroup(controls);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DynamicFormComponent, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicFormComponent);
    component = fixture.componentInstance;
    component.fields = [];
    component.formGroup = new FormGroup({});
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- gridColsClass ---

  it('gridColsClass should return grid-cols-1 by default', () => {
    expect(component.gridColsClass()).toBe('grid-cols-1');
  });

  it('gridColsClass should return the correct class for given columns', () => {
    component.columns = 3;
    expect(component.gridColsClass()).toBe('grid-cols-3');
  });

  // --- colSpanClass ---

  it('colSpanClass should use field.colSpan when provided', () => {
    component.columns = 4;
    const field: FormField = { name: 'f', label: 'F', type: 'string', colSpan: 2 };
    expect(component.colSpanClass(field)).toBe('col-span-2');
  });

  it('colSpanClass should default to this.columns when field.colSpan is not set', () => {
    component.columns = 3;
    const field: FormField = { name: 'f', label: 'F', type: 'string' };
    expect(component.colSpanClass(field)).toBe('col-span-3');
  });

  it('colSpanClass should clamp to this.columns when field.colSpan exceeds it', () => {
    component.columns = 2;
    const field: FormField = { name: 'f', label: 'F', type: 'string', colSpan: 10 };
    expect(component.colSpanClass(field)).toBe('col-span-2');
  });

  it('colSpanClass should default to col-span-1 when columns is 1', () => {
    component.columns = 1;
    const field: FormField = { name: 'f', label: 'F', type: 'string', colSpan: 5 };
    expect(component.colSpanClass(field)).toBe('col-span-1');
  });

  // --- asSelectable ---

  it('asSelectable should cast field to SelectableFormField', () => {
    const field: FormField = {
      name: 'color', label: 'Color', type: 'select',
      options: [{ value: 'red', label: 'Red' }]
    };
    const selectable = component.asSelectable(field);
    expect(selectable.options[0].value).toBe('red');
  });

  // --- template rendering ---

  it('should render a text input for string fields', () => {
    const fields: FormField[] = [{ name: 'title', label: 'Title', type: 'string' }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(input.id).toBe('title');
  });

  it('should bind maxLength and placeholder on string input', () => {
    const fields: FormField[] = [{ name: 'bio', label: 'Bio', type: 'string', maxLength: 200, placeholder: 'Enter bio' }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input.maxLength).toBe(200);
    expect(input.placeholder).toBe('Enter bio');
  });

  it('should render a number input for number fields', () => {
    const fields: FormField[] = [{ name: 'age', label: 'Age', type: 'number', min: 0, max: 120, step: 1 }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="number"]');
    expect(input).toBeTruthy();
    expect(input.id).toBe('age');
  });

  it('should render a select for boolean fields', () => {
    const fields: FormField[] = [{ name: 'active', label: 'Active', type: 'boolean' }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const selects = fixture.nativeElement.querySelectorAll('select');
    expect(selects.length).toBe(1);
    expect(selects[0].id).toBe('active');
  });

  it('should render a single select for select fields without multiple', () => {
    const fields: FormField[] = [{
      name: 'status', label: 'Status', type: 'select',
      options: [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]
    }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select#status');
    expect(select).toBeTruthy();
    expect(select.multiple).toBeFalse();
    expect(select.options.length).toBe(2);
  });

  it('should render a multiple-select component for select fields with multiple=true', () => {
    const fields: FormField[] = [{
      name: 'tags', label: 'Tags', type: 'select',
      options: [{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }],
      multiple: true
    }];
    component.fields = fields;
    component.formGroup = new FormGroup({ tags: new FormControl([]) });
    fixture.detectChanges();
    // multiple-select's own [id] binding lands on its inner <div>, not the host tag
    // (same host/inner-element split as app-button) — so id="tags" is checked there.
    expect(fixture.nativeElement.querySelector('multiple-select')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('multiple-select #tags')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('select#tags')).toBeNull();
  });

  it('should show the required asterisk when field.required is true', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: true }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const asterisk = fixture.nativeElement.querySelector('span.text-red-500');
    expect(asterisk).toBeTruthy();
  });

  it('should not show the required asterisk when field.required is false', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: false }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const asterisk = fixture.nativeElement.querySelector('span.text-red-500');
    expect(asterisk).toBeNull();
  });

  it('should render a date input for date fields', () => {
    const fields: FormField[] = [{ name: 'birthdate', label: 'Birthdate', type: 'date', min: '1900-01-01', max: '2020-01-01' }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="date"]');
    expect(input).toBeTruthy();
    expect(input.id).toBe('birthdate');
    expect(input.min).toBe('1900-01-01');
    expect(input.max).toBe('2020-01-01');
  });

  it('should render an app-phone-number-input for phoneNumber fields', () => {
    const fields: FormField[] = [{ name: 'phone', label: 'Phone', type: 'phoneNumber', dataCy: 'phoneField' }];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const widget = fixture.nativeElement.querySelector('app-phone-number-input');
    expect(widget).toBeTruthy();
    expect(widget.getAttribute('data-cy')).toBe('phoneField');
  });

  // --- fieldError / inline required message ---

  it('should show the required error message once the field is touched and empty', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: true }];
    component.fields = fields;
    component.formGroup = new FormGroup({ name: new FormControl('', Validators.required) });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p.text-red-600')).toBeNull();

    component.formGroup.get('name')?.markAsTouched();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector('p.text-red-600');
    expect(error).toBeTruthy();
    expect(error.textContent).toContain('FORMS._required');
  });

  it('should not show a required error message for a field with no errors', () => {
    const fields: FormField[] = [{ name: 'name', label: 'Name', type: 'string', required: true }];
    component.fields = fields;
    component.formGroup = new FormGroup({ name: new FormControl('Ada', Validators.required) });
    component.formGroup.get('name')?.markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p.text-red-600')).toBeNull();
  });

  it('should render one block per field', () => {
    const fields: FormField[] = [
      { name: 'f1', label: 'F1', type: 'string' },
      { name: 'f2', label: 'F2', type: 'number' },
      { name: 'f3', label: 'F3', type: 'boolean' }
    ];
    component.fields = fields;
    component.formGroup = buildForm(fields);
    fixture.detectChanges();
    const labels = fixture.nativeElement.querySelectorAll('label[for]');
    expect(labels.length).toBe(3);
  });
});
