import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { CodeFormField, FormField, MultiValueStringFormField, RangeValueFormField, SelectableFormField, StatusPickerFormField, TableFormField, UnitValueFormField } from 'src/app/models/formFields/form-field.model';
import { MarkdownTextareaComponent } from '../markdown-textarea/markdown-textarea.component';
import { MultiValueInputComponent } from '../multi-value-input/multi-value-input.component';
import { RangeValueInputComponent } from '../range-value-input/range-value-input.component';
import { UnitValueInputComponent } from '../unit-value-input/unit-value-input.component';
import { StatusFieldComponent } from '../../status-field/status-field.component';
import { TableInputComponent } from '../table-input/table-input.component';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { MultipleSelectComponent } from 'src/app/shared/multiple-select/multiple-select.component';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MarkdownTextareaComponent, StatusFieldComponent, MultiValueInputComponent, UnitValueInputComponent, RangeValueInputComponent, TableInputComponent, CodeEditorComponent, MultipleSelectComponent, FaIconComponent],
})
export class DynamicFormComponent {
  @Input() fields: FormField[] = [];
  @Input() formGroup!: FormGroup;
  @Input() columns: number = 1;

  gridColsClass(): string {
    return `grid-cols-${this.columns}`;
  }

  colSpanClass(field: FormField): string {
    const span = field.colSpan ?? this.columns ?? 1;
    return `col-span-${Math.min(span, this.columns)}`;
  }

  asSelectable(field: FormField): SelectableFormField {
    return field as SelectableFormField;
  }

  asStatusPicker(field: FormField): StatusPickerFormField {
    return field as StatusPickerFormField;
  }

  asMultiValue(field: FormField): MultiValueStringFormField {
    return field as MultiValueStringFormField;
  }

  asUnitValue(field: FormField): UnitValueFormField {
    return field as UnitValueFormField;
  }

  asRangeValue(field: FormField): RangeValueFormField {
    return field as RangeValueFormField;
  }

  asTableField(field: FormField): TableFormField {
    return field as TableFormField;
  }

  asCode(field: FormField): CodeFormField {
    return field as CodeFormField;
  }
}
