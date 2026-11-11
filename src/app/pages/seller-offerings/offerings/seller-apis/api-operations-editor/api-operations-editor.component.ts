import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { FormGroup, ValidatorFn } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { API_ACTIONS, ApiAction, ApiOperation } from 'src/app/models/api-access.model';
import { FormField } from 'src/app/models/formFields/form-field.model';
import { ButtonComponent } from 'src/app/shared/button/button.component';
import { buildFormGroup } from 'src/app/shared/forms/dynamic-form/build-form-group.util';
import { DynamicFormComponent } from 'src/app/shared/forms/dynamic-form/dynamic-form.component';
import { operationErrors } from '../api-validation';

interface OperationRow {
  group: FormGroup;
  fields: FormField[];
  /** Whether the row shows its fields or only its summary (id, access and path). */
  open: boolean;
  subscription?: Subscription;
}

/** Messages of the checks that are not "required" (the dynamic form already says that one). */
const ERROR_MESSAGES: Record<string, string> = {
  id_format: 'API_ACCESS._err_id_format',
  id_duplicate: 'API_ACCESS._err_id_duplicate',
  path_slash: 'API_ACCESS._err_path_slash',
  path_query: 'API_ACCESS._err_path_query',
  path_dots: 'API_ACCESS._err_path_dots',
  path_empty_segment: 'API_ACCESS._err_path_empty_segment',
  path_param: 'API_ACCESS._err_path_param',
  path_param_duplicate: 'API_ACCESS._err_path_param_duplicate',
};

/** Rows of the API's operations: id, action, path and description, each row a dynamic form. Emits a new list on every
 * edit; the parent owns the data. */
@Component({
  selector: 'app-api-operations-editor',
  standalone: true,
  imports: [TranslateModule, ButtonComponent, DynamicFormComponent],
  templateUrl: './api-operations-editor.component.html',
})
export class ApiOperationsEditorComponent implements OnChanges, OnDestroy {
  @Input() operations: ApiOperation[] = [];
  @Output() operationsChange = new EventEmitter<ApiOperation[]>();

  rows: OperationRow[] = [];
  /** What this editor last sent up, so the parent handing it back is not mistaken for a new list. */
  private lastEmitted: ApiOperation[] | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['operations'] && this.operations !== this.lastEmitted) {
      this.rows.forEach(row => row.subscription?.unsubscribe());
      // Rows loaded with the API start folded: only a new one is worth opening
      this.rows = this.operations.map(operation => this.buildRow(operation, false));
      this.revalidate();
    }
  }

  ngOnDestroy(): void {
    this.rows.forEach(row => row.subscription?.unsubscribe());
  }

  add(): void {
    this.rows = [...this.rows, this.buildRow({ id: '', action: 'read', path: '', description: '' }, true)];
    this.revalidate();
    this.emit();
  }

  remove(index: number): void {
    this.rows[index].subscription?.unsubscribe();
    this.rows = this.rows.filter((_, i) => i !== index);
    this.revalidate();
    this.emit();
  }

  toggle(row: OperationRow): void {
    // Folding a row with problems must not hide them: they show in its summary
    if (row.open) row.group.markAllAsTouched();
    row.open = !row.open;
  }

  /** What the folded row shows: the operation as the seller has typed it so far. */
  summary(row: OperationRow): ApiOperation {
    return this.operationOf(row);
  }

  hasProblems(row: OperationRow): boolean {
    return row.group.invalid && row.group.touched;
  }

  isUse(row: OperationRow): boolean {
    return row.group.get('action')?.value === 'use';
  }

  private buildRow(operation: ApiOperation, open: boolean): OperationRow {
    const row = { open } as OperationRow;
    row.fields = [
      {
        type: 'string', name: 'id', label: 'API_ACCESS._operation_id', required: true, colSpan: 1, dataCy: 'apiOperationId',
        placeholder: 'API_ACCESS._operation_id_placeholder', validators: [this.checkOf(row, 'id')], errorMessages: ERROR_MESSAGES,
      },
      {
        type: 'select', name: 'action', label: 'API_ACCESS._operation_action', required: true, colSpan: 1, dataCy: 'apiOperationAction',
        options: API_ACTIONS.map(action => ({ value: action, label: `API_ACCESS._action_${action}` })),
      },
      {
        type: 'string', name: 'path', label: 'API_ACCESS._operation_path', required: true, colSpan: 1, dataCy: 'apiOperationPath',
        placeholder: 'API_ACCESS._operation_path_placeholder', validators: [this.checkOf(row, 'path')], errorMessages: ERROR_MESSAGES,
      },
      { type: 'textarea', name: 'description', label: 'API_ACCESS._operation_description', placeholder: 'API_ACCESS._operation_description_placeholder' },
    ];
    row.group = buildFormGroup(row.fields);
    row.group.patchValue({
      id: operation.id, action: operation.action, path: operation.path, description: operation.description ?? '',
    }, { emitEvent: false });
    row.subscription = row.group.valueChanges.subscribe(() => {
      this.revalidate();
      this.emit();
    });
    return row;
  }

  /** A check that needs the other rows (an id used twice), read lazily so it follows rows being added and removed.
   * "Required" is left to the dynamic form. */
  private checkOf(row: OperationRow, field: 'id' | 'path'): ValidatorFn {
    return () => {
      const error = operationErrors(this.currentOperations())[this.rows.indexOf(row)]?.[field];
      return error && !error.endsWith('_required') ? { [error]: true } : null;
    };
  }

  /** Rows judge each other (ids must be unique), so a change in one can make another valid or not. */
  private revalidate(): void {
    this.rows.forEach(row => ['id', 'path'].forEach(name => row.group.get(name)?.updateValueAndValidity({ emitEvent: false })));
  }

  private operationOf(row: OperationRow): ApiOperation {
    const value = row.group.getRawValue();
    return { id: value.id ?? '', action: value.action as ApiAction, path: value.path ?? '', description: value.description ?? '' };
  }

  private currentOperations(): ApiOperation[] {
    return this.rows.map(row => this.operationOf(row));
  }

  private emit(): void {
    this.lastEmitted = this.currentOperations();
    this.operationsChange.emit(this.lastEmitted);
  }
}
