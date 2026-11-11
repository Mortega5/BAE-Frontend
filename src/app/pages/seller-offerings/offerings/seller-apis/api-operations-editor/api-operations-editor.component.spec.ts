import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ApiOperation } from 'src/app/models/api-access.model';
import { ApiOperationsEditorComponent } from './api-operations-editor.component';

describe('ApiOperationsEditorComponent', () => {
  let fixture: ComponentFixture<ApiOperationsEditorComponent>;
  let component: ApiOperationsEditorComponent;
  let emitted: ApiOperation[][];

  const operations: ApiOperation[] = [
    { id: 'list', action: 'read', path: '/items' },
    { id: 'get', action: 'read', path: '/items/{id}' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ApiOperationsEditorComponent, TranslateModule.forRoot()] }).compileComponents();
    fixture = TestBed.createComponent(ApiOperationsEditorComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.operationsChange.subscribe(value => emitted.push(value));
    fixture.componentRef.setInput('operations', operations);
    fixture.detectChanges();
  });

  const control = (row: number, name: string) => component.rows[row].group.get(name)!;

  it('renders each operation as a dynamic form', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-cy="apiOperationRow"]').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('app-dynamic-form').length).toBe(2);
    expect(component.rows[0].group.getRawValue()).toEqual({ id: 'list', action: 'read', path: '/items', description: '' });
  });

  it('offers the four accesses in a select', () => {
    const action: any = component.rows[0].fields.find(f => f.name === 'action');

    expect(action.type).toBe('select');
    expect(action.options.map((o: any) => o.value)).toEqual(['read', 'modify', 'delete', 'use']);
  });

  it('adds an empty read operation without touching the others', () => {
    component.add();

    expect(emitted[0].length).toBe(3);
    expect(emitted[0][2]).toEqual({ id: '', action: 'read', path: '', description: '' });
    expect(emitted[0].slice(0, 2).map(o => o.id)).toEqual(['list', 'get']);
    expect(component.rows.length).toBe(3);
  });

  it('emits the list whenever a field of a row changes', () => {
    control(1, 'path').setValue('/items/{itemId}');
    control(0, 'action').setValue('use');

    expect(emitted[0][1].path).toBe('/items/{itemId}');
    expect(emitted[1][0].action).toBe('use');
  });

  it('does not rebuild the rows when the parent hands back what the editor sent', () => {
    const before = component.rows[0];
    control(0, 'path').setValue('/things');

    fixture.componentRef.setInput('operations', emitted[0]);
    fixture.detectChanges();

    expect(component.rows[0]).toBe(before);
  });

  it('rebuilds the rows when the parent loads another list', () => {
    fixture.componentRef.setInput('operations', [{ id: 'only', action: 'delete', path: '/only' }]);
    fixture.detectChanges();

    expect(component.rows.length).toBe(1);
    expect(control(0, 'id').value).toBe('only');
  });

  it('removes an operation', () => {
    component.remove(1);

    expect(emitted[0].map(o => o.id)).toEqual(['list']);
    expect(component.rows.length).toBe(1);
  });

  it('marks a path that breaks the rules, with the error the form shows', () => {
    control(0, 'path').setValue('no-slash');
    expect(control(0, 'path').errors).toEqual({ path_slash: true });

    control(0, 'path').setValue('/a/{id}/b/{id}');
    expect(control(0, 'path').errors).toEqual({ path_param_duplicate: true });

    control(0, 'path').setValue('/items');
    expect(control(0, 'path').errors).toBeNull();
  });

  it('leaves an empty field to the form\'s own required message', () => {
    control(0, 'path').setValue('');

    expect(control(0, 'path').errors).toEqual({ required: true });
  });

  it('flags an id used twice on the later row, and clears it when the other one changes', () => {
    control(1, 'id').setValue('list');
    expect(control(1, 'id').errors).toEqual({ id_duplicate: true });
    expect(control(0, 'id').errors).toBeNull();

    control(0, 'id').setValue('other');
    expect(control(1, 'id').errors).toBeNull();
  });

  it('explains what the use action allows', () => {
    control(0, 'action').setValue('use');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('API_ACCESS._action_use_hint');
  });

  describe('folding', () => {
    const toggle = (row: number) => (fixture.nativeElement.querySelectorAll('[data-cy="apiOperationToggle"]')[row] as HTMLElement);
    const body = (row: number) => fixture.nativeElement.querySelectorAll('[id^="api-operation-"]')[row] as HTMLElement;

    it('starts the rows of a loaded API folded, each with its id, access and path as the title', () => {
      expect(component.rows.every(row => !row.open)).toBeTrue();
      expect(toggle(0).getAttribute('aria-expanded')).toBe('false');
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationSummaryId"]').textContent).toContain('list');
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationSummaryAction"]').textContent).toContain('API_ACCESS._action_read');
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationSummaryPath"]').textContent).toContain('/items');
    });

    it('keeps the fields of a folded row out of reach', () => {
      expect(body(0).getAttribute('inert')).toBe('');
      expect(body(0).classList).toContain('invisible');
      expect(body(0).style.gridTemplateRows).toBe('0fr');
    });

    it('opens and folds a row from its title', () => {
      toggle(0).click();
      fixture.detectChanges();
      expect(component.rows[0].open).toBeTrue();
      expect(toggle(0).getAttribute('aria-expanded')).toBe('true');
      expect(body(0).hasAttribute('inert')).toBeFalse();
      expect(body(0).style.gridTemplateRows).toBe('1fr');

      toggle(0).click();
      fixture.detectChanges();
      expect(component.rows[0].open).toBeFalse();
    });

    it('opens a row just added so it can be filled in, and leaves the others as they were', () => {
      component.add();
      fixture.detectChanges();

      expect(component.rows.map(row => row.open)).toEqual([false, false, true]);
      expect(fixture.nativeElement.querySelectorAll('[data-cy="apiOperationSummaryId"]')[2].textContent).toContain('API_ACCESS._new_operation');
    });

    it('updates the title as the operation is edited', () => {
      control(0, 'id').setValue('list-all');
      control(0, 'path').setValue('/all');
      control(0, 'action').setValue('use');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationSummaryId"]').textContent).toContain('list-all');
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationSummaryPath"]').textContent).toContain('/all');
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationSummaryAction"]').textContent).toContain('API_ACCESS._action_use');
    });

    it('does not hide a problem when a row is folded: the title says it needs attention', () => {
      component.add();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationProblems"]')).toBeNull();

      toggle(2).click();
      fixture.detectChanges();

      expect(component.rows[2].open).toBeFalse();
      expect(fixture.nativeElement.querySelector('[data-cy="apiOperationProblems"]')).not.toBeNull();
    });

    it('keeps which rows are open when another one is removed', () => {
      component.rows[1].open = true;

      component.remove(0);

      expect(component.rows.length).toBe(1);
      expect(component.rows[0].open).toBeTrue();
    });
  });
});
