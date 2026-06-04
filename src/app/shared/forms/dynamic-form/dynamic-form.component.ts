import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { FormField, SelectableFormField } from 'src/app/models/formFields/form-field.model';
import { MarkdownTextareaComponent } from '../markdown-textarea/markdown-textarea.component';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, MarkdownTextareaComponent],
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
}
