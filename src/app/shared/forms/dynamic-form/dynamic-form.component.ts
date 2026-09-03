import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AttachmentFormField, BubbleSelectFormField, CodeFormField, FormField, MultiValueStringFormField, PaginatedTableFormField, RangeValueFormField, SelectableFormField, StatusPickerFormField, TableFormField, UnitValueFormField } from 'src/app/models/formFields/form-field.model';
import { environment } from 'src/environments/environment';
import { AttachmentUploadComponent } from '../attachment-upload/attachment-upload.component';
import { MarkdownTextareaComponent } from '../markdown-textarea/markdown-textarea.component';
import { MultiValueInputComponent } from '../multi-value-input/multi-value-input.component';
import { PhoneNumberInputComponent } from '../phone-number-input/phone-number-input.component';
import { RangeValueInputComponent } from '../range-value-input/range-value-input.component';
import { UnitValueInputComponent } from '../unit-value-input/unit-value-input.component';
import { StatusFieldComponent } from '../../status-field/status-field.component';
import { TableInputComponent } from '../table-input/table-input.component';
import { PaginatedTableComponent } from '../paginated-table/paginated-table.component';
import { CodeEditorComponent } from '../code-editor/code-editor.component';
import { MultipleSelectComponent } from 'src/app/shared/multiple-select/multiple-select.component';
import { SearchSelectComponent } from 'src/app/shared/search-select/search-select.component';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MarkdownTextareaComponent, StatusFieldComponent, MultiValueInputComponent, UnitValueInputComponent, RangeValueInputComponent, PhoneNumberInputComponent, TableInputComponent, PaginatedTableComponent, CodeEditorComponent, MultipleSelectComponent, SearchSelectComponent, AttachmentUploadComponent, FaIconComponent],
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

  asBubbleSelect(field: FormField): BubbleSelectFormField {
    return field as BubbleSelectFormField;
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

  asPaginatedTableField(field: FormField): PaginatedTableFormField {
    return field as PaginatedTableFormField;
  }

  asCode(field: FormField): CodeFormField {
    return field as CodeFormField;
  }

  asAttachment(field: FormField): AttachmentFormField {
    return field as AttachmentFormField;
  }

  attachmentMaxFileSize(field: FormField): number {
    return this.asAttachment(field).maxFileSize ?? environment.MAX_FILE_SIZE;
  }

  /** i18n key for the inline error shown under a touched, invalid field — undefined to show nothing. */
  fieldError(field: FormField): string | undefined {
    const control = this.formGroup.get(field.name);
    if (!control || !control.touched || !control.invalid) return undefined;
    if (control.errors?.['required']) return 'FORMS._required';
    return undefined;
  }
}
