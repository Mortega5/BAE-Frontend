import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AttachmentFormField, BubbleSelectFormField, CodeFormField, FormField, MultiValueStringFormField, PaginatedTableFormField, RangeValueFormField, SelectableFormField, SliderFormField, StatusPickerFormField, StatusPickerOption, TableFormField, UnitValueFormField } from 'src/app/models/formFields/form-field.model';
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

/** Written out in full, not built as `col-span-${n}`: Tailwind only generates classes it finds
 * literally in the source, so an interpolated one that is never spelled elsewhere (e.g. col-span-4)
 * silently has no CSS and the field collapses to one column. */
const GRID_COLS_CLASSES: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6',
};
const COL_SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4', 5: 'col-span-5', 6: 'col-span-6',
};

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
    return GRID_COLS_CLASSES[Math.min(Math.max(this.columns, 1), 6)];
  }

  colSpanClass(field: FormField): string {
    const span = field.colSpan ?? this.columns ?? 1;
    return COL_SPAN_CLASSES[Math.min(Math.max(span, 1), this.columns, 6)];
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

  /** A statusPicker step is active if the form's current value matches its own
   * value OR any of its `matchValues` (e.g. the "Deleted" step also lights up
   * for the legacy 'Obsolete' value, even though it's not itself selectable). */
  statusPickerOptionActive(field: StatusPickerFormField, opt: StatusPickerOption): boolean {
    const value = this.formGroup.get(field.name)?.value;
    return (opt.matchValues ?? [opt.value]).includes(value);
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

  asSlider(field: FormField): SliderFormField {
    return field as SliderFormField;
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
    if (control == null || control.untouched || control.valid) return undefined;
    if (control.errors?.['required']) return 'FORMS._required';
    const messages = field.errorMessages;
    if (messages) {
      const key = Object.keys(control.errors ?? {}).find(errorKey => messages[errorKey]);
      if (key) return messages[key];
    }
    return undefined;
  }
}
