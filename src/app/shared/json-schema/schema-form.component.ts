import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ButtonComponent } from '../button/button.component';
import { createSchemaForm, SchemaFormGroup } from './schema-form-group';
import { SchemaObjectComponent } from './schema-object.component';
import { SchemaRegistryService, SchemaValidationError } from './schema-registry.service';
import { SchemaUiOverlay } from './ui-overlay';

/**
 * A form generated from a published JSON Schema. It fetches the schema, builds a
 * {@link SchemaFormGroup} seeded with `initialValue`, and emits it through `formReady`. The group is
 * invalid while its `schemaValue()` does not validate against the full schema, so callers can gate
 * saving on `form.valid` as with any other form.
 *
 * There is deliberately no hand-written fallback: if the schema cannot be loaded the form says so
 * and offers a retry.
 */
@Component({
  selector: 'app-schema-form',
  standalone: true,
  imports: [CommonModule, TranslateModule, ButtonComponent, SchemaObjectComponent],
  template: `
    @if (loadError) {
    <div class="flex items-center justify-between gap-3 p-3 text-sm text-danger bg-danger-soft rounded-lg" role="alert" data-cy="schemaLoadError">
      <span>{{ 'SCHEMA_FORM._load_error' | translate }} <span class="font-mono break-all">{{ schemaUrl }}</span></span>
      <app-button type="button" variant="ghost" size="sm" prefixIcon="rotate" (click)="load()">{{ 'SCHEMA_FORM._retry' | translate }}</app-button>
    </div>
    } @else if (form) {
    <app-schema-object [group]="form" [columns]="columns"></app-schema-object>
    @if (form.dirty && schemaErrors.length > 0) {
    <ul class="mt-4 p-3 text-sm text-danger bg-danger-soft rounded-lg list-disc list-inside" role="alert" data-cy="schemaErrors">
      @for (error of schemaErrors; track error.path + error.message) {
      <li><span class="font-mono">{{ error.path || '/' }}</span>: {{ error.message }}</li>
      }
    </ul>
    }
    } @else {
    <p class="text-sm text-content-muted">{{ 'SCHEMA_FORM._loading' | translate }}</p>
    }
  `,
})
export class SchemaFormComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) schemaUrl!: string;
  @Input() overlay?: SchemaUiOverlay;
  @Input() initialValue?: Record<string, unknown>;
  @Input() columns = 4;
  @Output() formReady = new EventEmitter<SchemaFormGroup>();

  form?: SchemaFormGroup;
  loadError = false;
  private subscription?: Subscription;

  constructor(private registry: SchemaRegistryService) {}

  get schemaErrors(): SchemaValidationError[] {
    return (this.form?.errors?.['schema'] as SchemaValidationError[] | undefined) ?? [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schemaUrl']) this.load();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  load(): void {
    this.subscription?.unsubscribe();
    this.loadError = false;
    this.form = undefined;
    this.subscription = this.registry.get(this.schemaUrl).subscribe({
      next: loaded => {
        this.form = createSchemaForm(loaded, this.initialValue, this.overlay);
        this.formReady.emit(this.form);
      },
      error: error => {
        console.error(`Could not load the schema ${this.schemaUrl}`, error);
        this.loadError = true;
      },
    });
  }
}
