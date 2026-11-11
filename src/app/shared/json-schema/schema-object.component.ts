import { CommonModule } from '@angular/common';
import { Component, Input, forwardRef } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DynamicFormComponent } from '../forms/dynamic-form/dynamic-form.component';
import { humanize, SchemaObjectEntry } from './schema-fields';
import { SchemaFormGroup } from './schema-form-group';

/**
 * Renders one {@link SchemaFormGroup}: its leaf fields through `app-dynamic-form`, then each nested
 * object as a section. An optional nested object gets a switch and stays out of the value until it
 * is turned on. All structure lives in the group; this component only draws it.
 */
@Component({
  selector: 'app-schema-object',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule, DynamicFormComponent, forwardRef(() => SchemaObjectComponent)],
  template: `
    <div class="flex flex-col gap-6">
      @if (group.fields.length > 0) {
      <app-dynamic-form [fields]="group.fields" [formGroup]="group" [columns]="columns"></app-dynamic-form>
      }
      @for (entry of group.objects; track entry.pointer) {
      <fieldset class="flex flex-col gap-3 border-t border-line pt-4" [attr.data-cy]="'schema-object-' + entry.name"
        [attr.data-schema-pointer]="entry.pointer">
        <legend class="flex items-center gap-3 text-sm font-bold text-content">
          @if (!entry.required) {
          <input type="checkbox" class="rounded border-line-input" [id]="entry.pointer"
            [checked]="group.isObjectEnabled(entry)" (change)="toggle(entry, $any($event.target).checked)">
          }
          <label [for]="entry.pointer">{{ label(entry) | translate }}</label>
        </legend>
        @if (description(entry); as text) {
        <p class="text-xs text-content-muted">{{ text | translate }}</p>
        }
        @if (childGroup(entry); as child) {
        <app-schema-object [group]="child" [columns]="entry.hint.columns ?? columns"></app-schema-object>
        }
      </fieldset>
      }
    </div>
  `,
})
export class SchemaObjectComponent {
  @Input({ required: true }) group!: SchemaFormGroup;
  @Input() columns = 4;

  childGroup(entry: SchemaObjectEntry): SchemaFormGroup | null {
    const child = this.group.get(entry.name);
    return child instanceof SchemaFormGroup ? child : null;
  }

  label(entry: SchemaObjectEntry): string {
    const child = this.childGroup(entry);
    return entry.hint.heading ?? entry.hint.label ?? child?.branchTitle ?? entry.schema.title ?? humanize(entry.name);
  }

  description(entry: SchemaObjectEntry): string | undefined {
    return entry.hint.hint ?? entry.schema.description;
  }

  toggle(entry: SchemaObjectEntry, enabled: boolean): void {
    this.group.setObjectEnabled(entry.name, enabled);
  }
}
